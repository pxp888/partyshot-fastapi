import { useParams } from "react-router-dom";
import { receiveJson } from "./helpers";
import blankImage from "../assets/blank.jpg";

/**
 * Creates a thumbnail `Blob` from an image file.
 *
 * @param {File} file        - The original image file.
 * @param {number} maxWidth  - Desired maximum width of the thumbnail.
 * @param {number} maxHeight - Desired maximum height of the thumbnail.
 * @returns {Promise<Blob>}  - The thumbnail image as a Blob.
 */
function createThumbnail(file, maxWidth = 200, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Revoke the object URL after the image loads
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate thumbnail dimensions while preserving aspect ratio
      let { width, height } = img;
      const aspect = width / height;
      if (width > height) {
        width = Math.min(width, maxWidth);
        height = Math.round(width / aspect);
      } else {
        height = Math.min(height, maxHeight);
        width = Math.round(height * aspect);
      }

      // Draw the resized image on a canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Convert the canvas to a Blob (default to PNG)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas thumbnail generation failed."));
          }
        },
        "image/png",
        0.92, // quality (ignored for PNG but kept for consistency)
      );
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for thumbnail creation."));
    };

    img.src = objectUrl;
  });
}

function Uploader({ album, setAlbum }) {
  const { albumcode } = useParams();

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

    console.log(`Uploaded ${file.name} to S3 as ${s3_key}`);

    // 3️⃣ (Optional) Create a thumbnail and upload it the same way
    let thumbnailBlob;
    try {
      thumbnailBlob = await createThumbnail(file);
    } catch (err) {
      console.warn(
        "Thumbnail creation failed, using blank image instead.",
        err,
      );
      // Fetch the placeholder image and convert to a Blob
      const res = await fetch(blankImage);
      thumbnailBlob = await res.blob();
    }

    const thumbPresignRes = await fetch("/api/s3-presigned", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        filename: `${file.name}_thumb.png`,
        album_code: album.code,
      }),
    });

    const { s3_key: thumb_key, presigned: thumbPresign } =
      await thumbPresignRes.json();

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
    } else {
      console.log(`Uploaded thumbnail to ${thumb_key}`);
    }

    // 4️⃣ Inform your backend about the new photo (metadata only)
    const metaRes = await fetch("/api/add-photo-metadata", {
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
      }),
    });

    if (!metaRes.ok) throw new Error("Failed to record metadata");

    // 5️⃣ Refresh UI
    const updatedAlbum = await receiveJson(`/api/album/${albumcode}`);
    setAlbum(updatedAlbum);
  }

  return (
    <>
      <input
        type="file"
        name="file"
        multiple
        id="hiddenFileInput"
        style={{ display: "none" }}
        onChange={async (e) => {
          const files = e.target.files;
          for (let i = 0; i < files.length; i++) {
            await uploadFile(files[i]);
          }
          e.target.value = "";
        }}
      />
      <button
        onClick={() => document.getElementById("hiddenFileInput").click()}
        className="btn"
      >
        Upload Files
      </button>
    </>
  );
}

export default Uploader;
