import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { receiveJson, sendJson } from "./helpers";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import FileItem from "./FileItem";
import Imageview from "./Imageview";
import Uploader from "./Uploader";

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

  function deleteSelected() {
    if (selected.length === 0) {
      return alert("No files selected for deletion.");
    }

    if (
      !window.confirm("Are you sure you want to delete the selected files?")
    ) {
      return;
    }
    setSelected([]);

    const idsToDelete = selected.map((index) => album.photos[index].id);

    // loop through ids and send delete request for each
    idsToDelete.forEach(async (id) => {
      try {
        await sendJson("/api/delete-photo", { photo_id: id });
        console.log(`File with ID ${id} deleted successfully`);
        // remove deleted photo from album state to update UI
        setAlbum((prevAlbum) => ({
          ...prevAlbum,
          photos: prevAlbum.photos.filter((photo) => photo.id !== id),
        }));
      } catch (error) {
        console.error(`Failed to delete file with ID ${id}:`, error);
      }
    });

    // Refresh album data after deletion
    // setTimeout(() => {
    //   window.location.reload();
    // }, 1000);
  }

  async function toggleLock() {
    try {
      await sendJson("/api/togglelock", { album_id: album.id });
      setAlbum((prev) => ({
        ...prev,
        open: !prev.open,
      }));
    } catch (error) {
      console.error("Toggle lock failed : ", error);
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

  return (
    <section>
      {focus > -1 && (
        <Imageview files={album.photos} focus={focus} setFocus={setFocus} />
      )}
      <div className="albumview">
        <div className="albumDetails">
          <div className="infoItem">
            <label>Album Name: </label>
            <p>{album.name}</p>
          </div>
          <div className="infoItem">
            <label> Owner: </label>
            <p>{album.username} </p>
          </div>
          <div className="infoItem">
            <label>Open: </label>
            <p onClick={toggleLock} className="clickable">
              {album.open ? "Yes" : "No"}
            </p>
          </div>
          <div className="infoItem">
            <label>Public: </label>
            <p>{album.public ? "Yes" : "No"}</p>
          </div>
          <div className="infoItem">
            <label>Created on: </label>
            <p>{new Date(album.created_at).toLocaleDateString()}</p>
          </div>
          <div className="infoItem">
            <label>Code: </label>
            <p>{album.code}</p>
          </div>
        </div>
      </div>

      <div className="albumActions">
        <button onClick={() => setSelectMode(true)} className="btn">
          Selection Mode
        </button>
        <Uploader album={album} setAlbum={setAlbum} />
        <button onClick={downloadAll} className="btn">
          Download All
        </button>
        <button onClick={handleDeleteAlbum} className="btn">
          Delete Album
        </button>
      </div>
      {selectMode && (
        <div className="albumActions">
          <button onClick={cancelSelect} className="btn">
            Cancel Selection
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
