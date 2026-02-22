import { useState, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import "./style/Uploader.css";

function createThumbnail(file, maxWidth = 300, maxHeight = 300) {
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
                reject(new Error("Canvas thumbnail generation failed."));
              }
            },
            "image/webp",
            0.8,
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
        reject(new Error("Failed to load video for thumbnail creation."));
      };
    } else {
      // Handle image files (original implementation)
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
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
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas thumbnail generation failed."));
            }
          },
          "image/webp",
          0.8,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image for thumbnail creation."));
      };

      img.src = objectUrl;
    }
  });
}

const Uploader = forwardRef(({ album }, ref) => {
  const { albumcode } = useParams();
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedFiles, setCompletedFiles] = useState(0);

  /**
   * Uploads the original file and its thumbnail.
   *
   * @param {File} file - The user‑selected file.
   */
  async function uploadFile(file) {
    // 1️⃣  Ask for presigned data
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
    const { s3_key, presigned } = await presignRes.json();

    // 2️⃣  Build the form exactly as the bucket expects
    const formData = new FormData();
    Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v));
    formData.append("file", file); // key must be "file"

    // 3️⃣  POST to S3
    const s3Res = await fetch(presigned.url, {
      method: "POST",
      body: formData,
    });

    if (!s3Res.ok) {
      const errText = await s3Res.text();
      throw new Error(`S3 upload failed: ${s3Res.status} ${errText}`);
    }

    // 3️⃣ (Optional) Create a thumbnail and upload it the same way
    let thumbnailBlob = null;
    let thumb_key = null;
    try {
      thumbnailBlob = await createThumbnail(file);

      const thumbPresignRes = await fetch("/api/s3-presigned", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          filename: `${file.name}_thumb.webp`,
          album_code: album.code,
        }),
      });

      const { s3_key: t_key, presigned: thumbPresign } =
        await thumbPresignRes.json();
      thumb_key = t_key;

      const thumbForm = new FormData();
      Object.entries(thumbPresign.fields).forEach(([k, v]) =>
        thumbForm.append(k, v),
      );
      thumbForm.append("file", thumbnailBlob);

      const thumbS3Res = await fetch(thumbPresign.url, {
        method: "POST",
        body: thumbForm,
      });

      if (!thumbS3Res.ok) {
        console.warn("Thumbnail upload failed, continuing without thumb");
        thumb_key = null;
      }
    } catch (err) {
      console.warn("Thumbnail creation or upload failed:", err);
    }

    // 4️⃣  Notify backend of metadata via REST instead of websocket
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
        thumb_key: thumb_key || null,
        albumcode: albumcode,
        size: file.size,
        thumb_size: thumbnailBlob ? thumbnailBlob.size : null,
      }),
    });

    if (!metadataRes.ok) {
      const errText = await metadataRes.text();
      console.warn(`Metadata upload failed: ${metadataRes.status} ${errText}`);
    }
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setTotalFiles(files.length);
    setCompletedFiles(0);

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadFile(files[i]);
      } catch (err) {
        console.error("Upload failed for file:", files[i].name, err);
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
        disabled={totalFiles > 0}
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

