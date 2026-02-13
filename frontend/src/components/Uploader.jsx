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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("album_code", album.code);

    // Create the thumbnail and attach it to the same FormData
    try {
      const thumbnailBlob = await createThumbnail(file);
      formData.append("thumbnail", thumbnailBlob, `${file.name}_thumb.png`);
    } catch (thumbErr) {
      // Thumbnail generation failed – use the provided blank image to satisfy the API
      console.warn(
        `Could not generate thumbnail for "${file.name}":`,
        thumbErr,
      );
      const placeholderResponse = await fetch(blankImage);
      const placeholderBlob = await placeholderResponse.blob();
      formData.append("thumbnail", placeholderBlob, `${file.name}_thumb.png`);
    }

    try {
      const response = await fetch("/api/upload-file", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errText}`);
      }

      console.log(`File "${file.name}" uploaded successfully`);
      // Refresh album data to show the new file
      const updatedAlbum = await receiveJson(`/api/album/${albumcode}`);
      setAlbum(updatedAlbum);
    } catch (error) {
      console.error(`Failed to upload file "${file.name}":`, error);
    }
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
