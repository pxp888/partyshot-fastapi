import { useState, useImperativeHandle, forwardRef, useRef, memo } from "react";
import { useMessage } from "../MessageBoxContext";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import "./Uploader.css";

/**
 * Loads an image or video and resizes it.
 */
async function processMedia(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);

    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = objectUrl;

      const cleanup = () => {
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
        video.src = "";
        video.load();
        URL.revokeObjectURL(objectUrl);
      };

      video.onloadeddata = () => {
        const duration = video.duration;
        const seekTime = isNaN(duration) ? 0 : duration / 2;

        const captureFrame = () => {
          try {
            const { videoWidth, videoHeight } = video;
            if (!videoWidth || !videoHeight) {
                cleanup();
                return reject(new Error("Video dimensions are 0."));
            }
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
                cleanup();
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Canvas resize failed."));
                }
              },
              "image/webp",
              quality,
            );
          } catch (err) {
            cleanup();
            reject(err);
          }
        };

        if (isNaN(duration) || duration === 0) {
          captureFrame();
        } else {
          video.currentTime = seekTime;
          video.onseeked = captureFrame;
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("Failed to load video for resizing."));
      };
    } else {
      const img = new Image();
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        URL.revokeObjectURL(objectUrl);
      };

      img.onload = () => {
        try {
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
              cleanup();
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Canvas resize failed."));
              }
            },
            "image/webp",
            quality,
          );
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error("Failed to load image for resizing."));
      };

      img.src = objectUrl;
    }
  });
}

const Uploader = memo(forwardRef(
  ({ album, isOwner, userLoggedIn, disabled, setPhotos, setTotalPhotos, sortOrder },
    ref) => {
    const { showMessage, showConfirm } = useMessage();
    const { albumcode } = useParams();
    
    const isUploadingRef = useRef(false);
    const timeoutRef = useRef(null);
    const uploaderId = useRef(`uploader-${Math.random().toString(36).substr(2, 9)}`);

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

    async function uploadFile(file) {
      const token = localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/x-www-form-urlencoded" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const presignRes = await fetch("/api/s3-presigned", {
        method: "POST",
        headers,
        body: new URLSearchParams({ filename: file.name, album_code: album.code }),
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
        s3_key, presigned, thumb_key, thumb_presigned, mid_key, mid_presigned, space_remaining
      } = await presignRes.json();
      setSpaceRemaining(space_remaining);

      let thumbnailBlob = null;
      let final_thumb_key = null;
      let midBlob = null;
      let final_mid_key = null;

      const processingTasks = [];
      processingTasks.push(processMedia(file, 500, 500, 0.6).then(blob => { thumbnailBlob = blob; }));
      if (!file.type.startsWith("video/")) {
        processingTasks.push(processMedia(file, 2560, 2560, 0.8).then(blob => {
          if (blob && blob.size <= file.size * 0.75) midBlob = blob;
        }));
      }
      
      try {
        await Promise.all(processingTasks);
      } catch (err) {
        console.warn("Processing failed for", file.name, err);
      }

      const uploadTasks = [];
      uploadTasks.push(fetch(presigned, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      }).then(res => { if (!res.ok) throw new Error("Original upload failed"); }));

      if (thumbnailBlob) {
        uploadTasks.push(fetch(thumb_presigned, {
          method: "PUT",
          body: thumbnailBlob,
          headers: { "Content-Type": "image/webp" },
        }).then(res => { if (res.ok) final_thumb_key = thumb_key; }));
      }

      if (midBlob) {
        uploadTasks.push(fetch(mid_presigned, {
          method: "PUT",
          body: midBlob,
          headers: { "Content-Type": "image/webp" },
        }).then(res => { if (res.ok) final_mid_key = mid_key; }));
      }

      await Promise.all(uploadTasks);

      const metaHeaders = { "Content-Type": "application/json" };
      if (token) metaHeaders["Authorization"] = `Bearer ${token}`;

      const metadataRes = await fetch("/api/add-photo-metadata", {
        method: "POST",
        headers: metaHeaders,
        body: JSON.stringify({
          album_id: album.id,
          filename: file.name,
          s3_key,
          thumb_key: final_thumb_key || null,
          mid_key: final_mid_key || null,
          albumcode,
          size: file.size,
          thumb_size: thumbnailBlob ? thumbnailBlob.size : null,
          mid_size: midBlob ? midBlob.size : null,
          username: userLoggedIn ? undefined : "anonymous",
        }),
      });

      if (metadataRes.ok) {
        const respData = await metadataRes.json();
        const newPhoto = respData.photo_id;
        if (newPhoto && setPhotos) {
          setPhotos((prev) => {
            if (prev.find((p) => p.id === newPhoto.id)) return prev;
            return sortOrder === "desc" ? [newPhoto, ...prev] : [...prev, newPhoto];
          });
          if (setTotalPhotos) setTotalPhotos((prev) => prev + 1);
        }
      }
    }

    const handleFiles = async (files) => {
      if (!files || files.length === 0 || isUploadingRef.current) return;
      if (!isOwner && !album.open) {
        showMessage("this album is not open for uploads", "Warning");
        return;
      }

      const fileArray = Array.from(files);

      const executeUpload = async () => {
        if (isUploadingRef.current) return;
        isUploadingRef.current = true;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setTotalFiles(fileArray.length);
        setCompletedFiles(0);

        for (const file of fileArray) {
          try {
            await uploadFile(file);
            setCompletedFiles((prev) => prev + 1);
          } catch (err) {
            console.error("Upload failed for file:", file.name, err);
            if (err.message === "QUOTA_EXCEEDED") break;
          }
        }

        isUploadingRef.current = false;
        timeoutRef.current = setTimeout(() => {
          setTotalFiles(0);
          setCompletedFiles(0);
          setSpaceRemaining(null);
          timeoutRef.current = null;
        }, 3000);
      };

      if (!userLoggedIn && !isOwner) {
        showConfirm(
          "If you upload without logging in you are giving complete control to the album owner.",
          "Anonymous Upload",
          executeUpload
        );
      } else {
        executeUpload();
      }
    };

    useImperativeHandle(ref, () => ({ handleFiles }));

    return (
      <div 
        className={`uploader-wrapper ${totalFiles > 0 ? 'is-uploading' : ''}`}
        style={{
          width: "100%",
          height: "100%",
          display: "flex"
        }}
      >
        <input
          type="file"
          id={uploaderId.current}
          name="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled || totalFiles > 0}
        />

        <label 
          htmlFor={uploaderId.current}
          style={{
            cursor: (disabled || totalFiles > 0) ? "default" : "pointer",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <span className="dt-tab-icon">
            {totalFiles > 0 ? "⋯" : "↑"}
          </span>
          <span className="dt-tab-label">
            {totalFiles > 0 ? "Wait..." : "Upload"}
          </span>
        </label>

        {totalFiles > 0 &&
          createPortal(
            <div className="uploader-progress-container">
              <div className="uploader-status-text">
                {completedFiles === totalFiles
                  ? "All files uploaded!"
                  : `Uploading ${completedFiles + 1} of ${totalFiles}...`}
                {spaceRemaining !== null && (
                  <div className="uploader-space-text" style={{ fontSize: "0.8em", marginTop: "4px" }}>
                    Remaining Storage: {formatBytes(spaceRemaining)}
                  </div>
                )}
              </div>
              <div className="uploader-progress-track">
                <div
                  className="uploader-progress-bar"
                  style={{ width: `${(completedFiles / totalFiles) * 100}%` }}
                />
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }));

export default Uploader;
