import { useState, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import "./style/Uploader.css";

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

const Uploader = forwardRef(({ album, disabled }, ref) => {
  const { albumcode } = useParams();
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedFiles, setCompletedFiles] = useState(0);

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
    const {
      s3_key,
      presigned,
      thumb_key: t_key,
      thumb_presigned,
      mid_key: m_key,
      mid_presigned,
    } = await presignRes.json();

    // 2️⃣  Build the form exactly as the bucket expects and POST to S3
    const formData = new FormData();
    Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v));
    formData.append("file", file); // key must be "file"

    const s3Res = await fetch(presigned.url, {
      method: "POST",
      body: formData,
    });

    if (!s3Res.ok) {
      const errText = await s3Res.text();
      throw new Error(`S3 upload failed: ${s3Res.status} ${errText}`);
    }

    // 3️⃣ Create a thumbnail and mid-sized image and upload them
    let thumbnailBlob = null;
    let final_thumb_key = null;
    let midBlob = null;
    let final_mid_key = null;

    // --- Thumbnail Generation & Upload ---
    try {
      thumbnailBlob = await resizeImage(file, 300, 300, 0.8);
      if (thumbnailBlob) {
        const thumbForm = new FormData();
        Object.entries(thumb_presigned.fields).forEach(([k, v]) =>
          thumbForm.append(k, v),
        );
        thumbForm.append("file", thumbnailBlob);

        const thumbS3Res = await fetch(thumb_presigned.url, {
          method: "POST",
          body: thumbForm,
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

    // --- Mid-sized Generation & Upload ---
    // Only attempt mid-sized for images, not videos.
    if (!file.type.startsWith("video/")) {
      try {
        midBlob = await resizeImage(file, 2560, 2560, 0.85);

        // Fail gracefully: only upload if generation succeeded and size is reasonable
        if (midBlob) {
          if (midBlob.size <= file.size / 2) {
            const midForm = new FormData();
            Object.entries(mid_presigned.fields).forEach(([k, v]) =>
              midForm.append(k, v),
            );
            midForm.append("file", midBlob);

            const midS3Res = await fetch(mid_presigned.url, {
              method: "POST",
              body: midForm,
            });

            if (midS3Res.ok) {
              final_mid_key = m_key;
            } else {
              console.warn("Mid-size upload failed, continuing without mid version");
            }
          } else {
            console.info("Mid-sized image larger than 50% of original, skipping upload");
            midBlob = null; // Don't report size if we didn't upload
          }
        }
      } catch (err) {
        console.warn("Mid-size creation or upload failed:", err);
      }
    }

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

    if (!metadataRes.ok) {
      const errText = await metadataRes.text();
      console.warn(`Metadata upload failed: ${metadataRes.status} ${errText}`);
    }
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Convert FileList to a static array so that clearing the input value
    // (e.target.value = "") doesn't empty the list during processing.
    const fileArray = Array.from(files);
    setTotalFiles(fileArray.length);
    setCompletedFiles(0);

    for (const file of fileArray) {
      try {
        await uploadFile(file);
      } catch (err) {
        console.error("Upload failed for file:", file.name, err);
      }
      setCompletedFiles((prev) => prev + 1);
    }

    // Reset progress after a delay
    setTimeout(() => {
      setTotalFiles(0);
      setCompletedFiles(0);
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

