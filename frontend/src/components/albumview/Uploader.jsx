import { useState, useImperativeHandle, forwardRef, useContext } from "react";
import { useMessage } from "../MessageBoxContext";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import "./Uploader.css";

function resizeImage(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);

    // Handle video files
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = objectUrl;

      video.onloadeddata = () => {
        const duration = video.duration;
        const seekTime = isNaN(duration) ? 0 : duration / 2;

        const captureFrame = () => {
          const { videoWidth, videoHeight } = video;
          let width = videoWidth;
          let height = videoHeight;
          const aspect = width / height;
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = Math.round(width / aspect);
          } else {
            height = Math.min(height, maxHeight);
            width = Math.round(height * aspect);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Canvas resize failed."));
              }
            },
            "image/webp",
            quality,
          );
        };

        if (isNaN(duration) || duration === 0) {
          captureFrame();
        } else {
          video.currentTime = seekTime;
          video.onseeked = captureFrame;
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load video for resizing."));
      };
    } else {
      // Handle image files
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        const aspect = width / height;
        if (width > height) {
          if (width > maxWidth) {
            width = maxWidth;
            height = Math.round(width / aspect);
          }
        } else {
          if (height > maxHeight) {
            height = maxHeight;
            width = Math.round(height * aspect);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas resize failed."));
            }
          },
          "image/webp",
          quality,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image for resizing."));
      };

      img.src = objectUrl;
    }
  });
}

const Uploader = forwardRef(
  ({ album, isOwner, disabled, photos, setPhotos, setTotalPhotos, sortOrder },
    ref) => {
    const { showMessage } = useMessage();
    const { albumcode } = useParams();
    const [totalFiles, setTotalFiles] = useState(0);
    const [completedFiles, setCompletedFiles] = useState(0);
    const [spaceRemaining, setSpaceRemaining] = useState(null);

    const formatBytes = (bytes) => {
      if (bytes === null || bytes === undefined) return "";
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    /**
     * Uploads the original file and its thumbnail.
     *
     * @param {File} file - The user‑selected file.
     */
    async function uploadFile(file) {
      // 1️⃣  Ask for presigned data (returns both original and thumbnail info)
      const presignRes = await fetch("/api/s3-presigned", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          filename: file.name,
          album_code: album.code,
        }),
      });
      if (!presignRes.ok) {
        const errData = await presignRes.json();
        if (presignRes.status === 403) {
          showMessage(errData.detail || "Storage limit reached.", "Error");
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Presigned request failed: ${presignRes.status}`);
      }

      const {
        s3_key,
        presigned,
        thumb_key: t_key,
        thumb_presigned,
        mid_key: m_key,
        mid_presigned,
        space_remaining,
      } = await presignRes.json();
      setSpaceRemaining(space_remaining);

      // 2️⃣  Upload everything in parallel (Original + Thumbnail + Mid-size)
      let thumbnailBlob = null;
      let final_thumb_key = null;
      let midBlob = null;
      let final_mid_key = null;

      const uploadTasks = [];

      // Task A: Original file upload
      uploadTasks.push((async () => {
        const s3Res = await fetch(presigned, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
        if (!s3Res.ok) {
          const errText = await s3Res.text();
          throw new Error(`Upload failed: ${s3Res.status} ${errText}`);
        }
      })());

      // Task B: Thumbnail Generation & Upload
      uploadTasks.push((async () => {
        try {
          thumbnailBlob = await resizeImage(file, 500, 500, 0.6);
          if (thumbnailBlob) {
            const thumbS3Res = await fetch(thumb_presigned, {
              method: "PUT",
              body: thumbnailBlob,
              headers: {
                "Content-Type": "image/webp",
              },
            });
            if (thumbS3Res.ok) {
              final_thumb_key = t_key;
            } else {
              console.warn("Thumbnail upload failed, continuing without thumb");
            }
          }
        } catch (err) {
          console.warn("Thumbnail creation or upload failed:", err);
        }
      })());

      // Task C: Mid-sized Generation & Upload (Images only)
      if (!file.type.startsWith("video/")) {
        uploadTasks.push((async () => {
          try {
            midBlob = await resizeImage(file, 2560, 2560, 0.85);
            if (midBlob) {
              // Only upload if generation succeeded and size is significantly smaller than original
              if (midBlob.size <= file.size / 2) {
                const midS3Res = await fetch(mid_presigned, {
                  method: "PUT",
                  body: midBlob,
                  headers: {
                    "Content-Type": "image/webp",
                  },
                });
                if (midS3Res.ok) {
                  final_mid_key = m_key;
                } else {
                  console.warn("Mid-size upload failed, continuing without mid version");
                }
              } else {
                console.info("Mid-sized image larger than 50% of original, skipping upload");
                midBlob = null;
              }
            }
          } catch (err) {
            console.warn("Mid-size creation or upload failed:", err);
          }
        })());
      }

      // Wait for all upload tasks to complete
      await Promise.all(uploadTasks);

      // 4️⃣  Notify backend of metadata via REST
      const metadataRes = await fetch("/api/add-photo-metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          album_id: album.id,
          filename: file.name,
          s3_key,
          thumb_key: final_thumb_key || null,
          mid_key: final_mid_key || null,
          albumcode: albumcode,
          size: file.size,
          thumb_size: thumbnailBlob ? thumbnailBlob.size : null,
          mid_size: midBlob ? midBlob.size : null,
        }),
      });

      if (metadataRes.ok) {
        const respData = await metadataRes.json();
        const newPhoto = respData.photo_id;
        if (newPhoto && setPhotos) {
          setPhotos((prev) => {
            if (prev.find((p) => p.id === newPhoto.id)) return prev;
            if (sortOrder === "desc") {
              return [newPhoto, ...prev];
            } else {
              return [...prev, newPhoto];
            }
          });
          if (setTotalPhotos) {
            setTotalPhotos((prev) => prev + 1);
          }
        }
      } else {
        const errText = await metadataRes.text();
        console.warn(`Metadata upload failed: ${metadataRes.status} ${errText}`);
      }
    }

    const handleFiles = async (files) => {
      if (!files || files.length === 0) return;

      if (!isOwner && !album.open) {
        showMessage("this album is not open for uploads", "Warning");
        return;
      }

      // Convert FileList to a static array so that clearing the input value
      // (e.target.value = "") doesn't empty the list during processing.
      const fileArray = Array.from(files);
      setTotalFiles(fileArray.length);
      setCompletedFiles(0);

      for (const file of fileArray) {
        try {
          await uploadFile(file);
          setCompletedFiles((prev) => prev + 1);
        } catch (err) {
          console.error("Upload failed for file:", file.name, err);
          if (err.message === "QUOTA_EXCEEDED") {
            break; // Stop further uploads in this batch
          }
        }
      }

      // Reset progress after a delay
      setTimeout(() => {
        setTotalFiles(0);
        setCompletedFiles(0);
        setSpaceRemaining(null);
      }, 3000);
    };

    useImperativeHandle(ref, () => ({
      handleFiles,
    }));

    return (
      <>
        <input
          type="file"
          name="file"
          accept="image/*"
          multiple
          id="hiddenFileInput"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => document.getElementById("hiddenFileInput").click()}
          className="btn"
          disabled={disabled || totalFiles > 0}
        >
          {totalFiles > 0 ? "Uploading..." : "Upload Files"}
        </button>

        {totalFiles > 0 &&
          createPortal(
            <div className="uploader-progress-container">
              <div className="uploader-status-text">
                {completedFiles === totalFiles
                  ? "All files uploaded!"
                  : `Uploading ${completedFiles + 1} of ${totalFiles}...`}
                {spaceRemaining !== null && (
                  <div
                    className="uploader-space-text"
                    style={{ fontSize: "0.8em", marginTop: "4px" }}
                  >
                    Remaining Storage: {formatBytes(spaceRemaining)}
                  </div>
                )}
              </div>
              <div className="uploader-progress-track">
                <div
                  className="uploader-progress-bar"
                  style={{
                    width: `${(completedFiles / totalFiles) * 100}%`,
                  }}
                />
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  });

export default Uploader;
