import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { receiveJson, sendJson } from "./helpers";
import FileItem from "./FileItem";
import Imageview from "./Imageview";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import "./style/Albumview.css";

function Albumview(currentUser) {
  const { albumcode } = useParams();
  const [album, setAlbum] = useState(null);
  const navigate = useNavigate();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [focus, setFocus] = useState(-1);

  useEffect(() => {
    async function fetchAlbum() {
      try {
        const albumData = await receiveJson(`/api/album/${albumcode}`);
        setAlbum(albumData);
        console.log("Fetched album data for album code:", albumData);
      } catch (error) {
        console.error(
          "Failed to fetch album data for album code:",
          albumcode,
          error,
        );
      }
    }
    fetchAlbum();
  }, [albumcode, navigate]);

  async function handleDeleteAlbum() {
    // confirm deletion with the user
    if (!window.confirm("Are you sure you want to delete this album?")) {
      return;
    }
    try {
      sendJson("/api/delete-album", { code: album.code });
      console.log("Album deleted successfully");
      window.location.href = `/user/${currentUser.currentUser}`;
    } catch (error) {
      console.error("Failed to delete album:", error);
    }
  }

  if (!album) {
    return (
      <div className="albumview">
        <h1>Album View</h1>
        <p>Loading album data...</p>
      </div>
    );
  }

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
    } catch (error) {
      console.error(`Failed to upload file "${file.name}":`, error);
    }
  }

  function downloadAll(e) {
    e.preventDefault();
    if (!album || !album.photos || album.photos.length === 0) {
      alert("No photos available to download.");
      return;
    }

    const zip = new JSZip();

    const fetchBlob = async (url, filename) => {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
      return await res.blob();
    };

    setSelectMode(true);

    (async () => {
      try {
        for (const photo of album.photos) {
          if (!photo.s3_key) continue;
          const blob = await fetchBlob(photo.s3_key, photo.filename);
          zip.file(photo.filename, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipName = `${album.name || "album"}_${album.photos.length}.zip`;
        saveAs(zipBlob, zipName);
      } catch (err) {
        console.error("Error while creating ZIP:", err);
        alert("An error occurred while preparing the ZIP file.");
      } finally {
        setSelectMode(false);
      }
    })();
  }

  function selectAll() {
    const allIds = album.photos.map((_, index) => index);
    setSelected(allIds);
  }

  function selectNone() {
    setSelected([]);
  }

  function cancelSelect() {
    setSelectMode(false);
    setSelected([]);
  }

  function downloadSelected() {
    if (selected.length === 0) {
      return alert("No files selected for download.");
    }

    const zip = new JSZip();

    const fetchBlob = async (url, filename) => {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
      return await res.blob();
    };

    (async () => {
      try {
        for (const index of selected) {
          const photo = album.photos[index];
          if (!photo.s3_key) continue;
          const blob = await fetchBlob(photo.s3_key, photo.filename);
          zip.file(photo.filename, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipName = `${album.name || "selected_files"}.zip`;
        saveAs(zipBlob, zipName);
      } catch (err) {
        console.error("Error while creating ZIP:", err);
        alert("An error occurred while preparing the ZIP file.");
      }
    })();
  }

  function deleteSelected() {}

  // console.log("Rendering album view with album data:", album);
  // console.log("Current user:", currentUser);

  return (
    <section>
      {focus > -1 && (
        <Imageview files={album.photos} focus={focus} setFocus={setFocus} />
      )}
      <div className="albumview">
        <h3>Album View</h3>
        <div className="albumDetails">
          <h1>{album.name}</h1>
          <p>Owner: {album.username} </p>
          <p>Open: {album.open ? "Yes" : "No"}</p>
          <p>Public: {album.public ? "Yes" : "No"}</p>
          <p>Created on: {new Date(album.created_at).toLocaleDateString()}</p>
          <p>Code: {album.code}</p>
        </div>
      </div>
      {album.username === currentUser.currentUser && !selectMode && (
        <div>
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
          <button onClick={() => setSelectMode(true)} className="btn">
            Select Files
          </button>

          <button
            onClick={() => document.getElementById("hiddenFileInput").click()}
            className="btn"
          >
            Upload Files
          </button>
          <button onClick={downloadAll} className="btn">
            Download All
          </button>
          <button onClick={handleDeleteAlbum} className="btn">
            Delete Album
          </button>
        </div>
      )}

      {album.username === currentUser.currentUser && selectMode && (
        <div>
          <button onClick={cancelSelect} className="btn">
            Cancel
          </button>
          <button onClick={selectAll} className="btn">
            Select All
          </button>
          <button onClick={selectNone} className="btn">
            Select None
          </button>
          <button onClick={downloadSelected} className="btn">
            Download Selected
          </button>
          <button onClick={deleteSelected} className="btn">
            Delete Selected
          </button>
        </div>
      )}

      <h2>Files</h2>
      <div className="albumFiles">
        {album.photos.length === 0 ? (
          <p>No files in this album.</p>
        ) : (
          <div className="fileList">
            {album.photos.map((file, index) => (
              <FileItem
                index={index}
                key={file.id}
                file={file}
                selectMode={selectMode}
                selected={selected}
                setSelected={setSelected}
                setFocus={setFocus}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
export default Albumview;
