import { useParams } from "react-router-dom";
import { receiveJson } from "./helpers";

function Uploader({ album, setAlbum }) {
  const { albumcode } = useParams();
  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("album_code", album.code);

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
