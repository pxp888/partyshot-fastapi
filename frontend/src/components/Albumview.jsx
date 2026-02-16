import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { sendJson } from "./helpers";
import { useSocket } from "./WebSocketContext"; // ← NEW
import JSZip from "jszip";
import { saveAs } from "file-saver";
import FileItem from "./FileItem";
import Imageview from "./Imageview";
import Uploader from "./Uploader";

import "./style/Albumview.css";

function Albumview(currentUser) {
  const { albumcode } = useParams();
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [focus, setFocus] = useState(-1);
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← NEW

  useEffect(() => {
    sendJsonMessage({
      action: "getAlbum",
      payload: { albumcode: albumcode },
    });
  }, [sendJsonMessage, albumcode]);

  useEffect(() => {
    sendJsonMessage({
      action: "getPhotos",
      payload: { albumcode: albumcode },
    });
  }, [sendJsonMessage, albumcode]);

  // React to messages that come from the WS
  useEffect(() => {
    if (!lastJsonMessage) return;

    const { action, payload } = lastJsonMessage;

    switch (action) {
      case "getAlbum":
        setAlbum(payload);
        break;

      case "getPhotos":
        setPhotos(payload?.photos ?? []);
        break;

      case "addPhoto":
        setPhotos((prev) => [...prev, payload]);
        console.log("Photo added:", payload);
        break;

      case "deletePhoto": {
        const deletedId = payload;
        setPhotos((prev) => prev.filter((p) => p.id !== deletedId));

        // Update selection based on the latest photos array
        setSelected((prev) =>
          prev.filter((idx) => photos[idx]?.id !== deletedId),
        );
        break;
      }

      case "deleteAlbum":
        if (payload) {
          window.location.href = `/user/${currentUser.currentUser}`;
        } else {
          alert("Album deletion failed");
        }
        break;

      default:
        break;
    }
  }, [lastJsonMessage, currentUser]); // photos removed

  async function handleDeleteAlbum() {
    if (!window.confirm("Are you sure you want to delete this album?")) {
      return;
    }

    sendJsonMessage({
      action: "deleteAlbum",
      payload: { albumcode: albumcode },
    });
  }

  function downloadAll(e) {
    e.preventDefault();
    if (!photos || photos.length === 0) {
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
        for (const photo of photos) {
          if (!photo.s3_key) continue;
          const blob = await fetchBlob(photo.s3_key, photo.filename);
          zip.file(photo.filename, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipName = `${album.name || "album"}_${photos.length}.zip`;
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
    const allIds = photos.map((_, index) => index);
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
          const photo = photos[index];
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

    const idsToDelete = selected.map((index) => photos[index].id);

    idsToDelete.forEach(async (id) => {
      try {
        sendJsonMessage({
          action: "deletePhoto",
          payload: { photo_id: id, album_code: album.code },
        });
      } catch (error) {
        console.error(`Failed to delete file with ID ${id}:`, error);
      }
    });
  }

  async function toggleOpen() {
    try {
      await sendJson("/api/toggleOpen", { album_id: album.id });
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
        <Imageview files={photos} focus={focus} setFocus={setFocus} />
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
            <p onClick={toggleOpen} className="clickable">
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
        {photos.length === 0 ? (
          <p>No files in this album.</p>
        ) : (
          <div className="fileList">
            {photos.map((file, index) => (
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
