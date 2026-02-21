import { useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { sendJson } from "./helpers";
import { useSocket } from "./WebSocketContext"; // ← NEW
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import Imageview from "./Imageview";
import Uploader from "./Uploader";
import AlbumRenamer from "./AlbumRenamer";
import Iconlist from "./Iconlist";
import Listview from "./Listview";

import "./style/Albumview.css";

function Albumview(currentUser) {
  const { albumcode } = useParams();
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [focus, setFocus] = useState(-1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [limit] = useState(50);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [viewType, setViewType] = useState(
    localStorage.getItem("viewType") || "icon",
  );
  const observer = useRef();
  const lastPhotoElementRef = useCallback(
    (node) => {
      if (isFetching) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetching, hasMore],
  );
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← NEW
  const navigate = useNavigate();

  useEffect(() => {
    sendJsonMessage({
      action: "getAlbum",
      payload: { albumcode: albumcode },
    });
  }, [albumcode]);

  useEffect(() => {
    setPhotos([]);
    setTotalPhotos(0);
    setHasMore(true);
    fetchPhotos(0);
  }, [albumcode, sortField, sortOrder]);

  const fetchPhotos = (offset, customLimit) => {
    if (!albumcode) return;
    setIsFetching(true);
    sendJsonMessage({
      action: "getPhotos",
      payload: {
        albumcode: albumcode,
        limit: customLimit || limit,
        offset: offset,
        sortField: sortField,
        sortOrder: sortOrder,
      },
    });
  };

  const loadMore = () => {
    if (isFetching || !hasMore) return;
    fetchPhotos(photos.length);
  };

  // React to messages that come from the WS
  useEffect(() => {
    if (!lastJsonMessage) return;

    const { action, payload } = lastJsonMessage;

    switch (action) {
      case "getAlbum":
        setAlbum(payload);
        break;

      case "getPhotos": {
        const batch = payload?.photos ?? [];
        setPhotos((prev) => {
          const newPhotos = payload.offset === 0 ? batch : [...prev, ...batch];
          if (isDownloadingAll) {
            // Trigger ZIP after photos are updated
            setTimeout(() => startZipProcess(newPhotos), 100);
            setIsDownloadingAll(false);
          }
          return newPhotos;
        });
        setTotalPhotos(payload.total ?? 0);
        setHasMore(payload.offset + batch.length < payload.total);
        setIsFetching(false);
        break;
      }

      case "addPhoto":
        setPhotos((prev) => {
          if (sortOrder === "desc") {
            return [payload, ...prev];
          } else {
            return [...prev, payload];
          }
        });
        setTotalPhotos((prev) => prev + 1);
        console.log("Photo added:", payload);
        break;

      case "deletePhoto": {
        const deletedId = payload;
        setPhotos((prev) => prev.filter((p) => p.id !== deletedId));
        setSelected((prev) => prev.filter((id) => id !== deletedId));
        break;
      }

      case "deleteAlbum":
        if (payload) {
          window.location.href = `/user/${currentUser.currentUser}`;
        } else {
          alert("Album deletion failed");
        }
        break;

      case "setAlbumName":
        if (payload && payload.albumcode === albumcode) {
          setAlbum((prev) => ({ ...prev, name: payload.name }));
          setIsRenaming(false);
        }
        break;

      case "subscribe":
        if (payload) {
          setAlbum((prev) => ({ ...prev, subscribed: true }));
        }
        break;

      case "unsubscribe":
        if (payload) {
          setAlbum((prev) => ({ ...prev, subscribed: false }));
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

  const startZipProcess = async (photosToZip) => {
    if (!photosToZip || photosToZip.length === 0) {
      alert("No photos available to download.");
      return;
    }

    const zip = new JSZip();

    const fetchBlob = async (url, filename) => {
      const res = await fetch(url, { mode: "cors", cache: "no-cache" });
      if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
      return await res.blob();
    };

    try {
      setSelectMode(true);
      for (const photo of photosToZip) {
        if (!photo.s3_key) continue;
        const blob = await fetchBlob(photo.s3_key, photo.filename);
        zip.file(photo.filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName = `${album.name || "album"}_${photosToZip.length}.zip`;
      saveAs(zipBlob, zipName);
    } catch (err) {
      console.error("Error while creating ZIP:", err);
      alert("An error occurred while preparing the ZIP file.");
    } finally {
      setSelectMode(false);
    }
  };

  function downloadAll(e) {
    e.preventDefault();
    if (!window.confirm("Download the full album?")) {
      return;
    }
    if (photos.length >= totalPhotos && totalPhotos > 0) {
      // Already have all photos, just ZIP them
      startZipProcess(photos);
    } else {
      setIsDownloadingAll(true);
      fetchPhotos(0, 5000);
    }
  }

  function selectAll() {
    const allIds = photos.map((p) => p.id);
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
      const res = await fetch(url, { mode: "cors", cache: "no-cache" });
      if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
      return await res.blob();
    };

    (async () => {
      try {
        for (const id of selected) {
          const photo = photos.find((p) => p.id === id);
          if (!photo || !photo.s3_key) continue;
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

  function deletedPhoto(photoId) {
    try {
      sendJsonMessage({
        action: "deletePhoto",
        payload: { photo_id: photoId, album_code: album.code },
      });
    } catch (error) {
      console.error(`Failed to delete file with ID ${photoId}:`, error);
    }
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
    const idsToDelete = [...selected];
    setSelected([]);

    idsToDelete.forEach(async (id) => {
      deletedPhoto(id);
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

  async function togglePublic() {
    try {
      await sendJson("/api/togglePublic", { album_id: album.id });
      setAlbum((prev) => ({
        ...prev,
        public: !prev.public,
      }));
    } catch (error) {
      console.error("Toggle public failed : ", error);
    }
  }

  function handleRename(newName) {
    sendJsonMessage({
      action: "setAlbumName",
      payload: { albumcode: albumcode, name: newName },
    });
  }

  function toggleSubscription() {
    const action = album.subscribed ? "unsubscribe" : "subscribe";
    sendJsonMessage({
      action: action,
      payload: { albumcode: albumcode },
    });
  }

  const sortedPhotos = photos; // Photos are now sorted by the backend

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
      <Imageview
        files={sortedPhotos}
        focus={focus}
        setFocus={setFocus}
        deletedPhoto={deletedPhoto}
      />

      <div className="albumview">
        <div className="albumDetails">
          <div className="infoItem">
            <label>name </label>
            {isRenaming ? (
              <AlbumRenamer
                album={album}
                onRename={handleRename}
                onCancel={() => setIsRenaming(false)}
              />
            ) : (
              <p
                onClick={() => {
                  if (album.username === currentUser.currentUser) {
                    setIsRenaming(true);
                  }
                }}
                className={
                  album.username === currentUser.currentUser ? "clickable" : ""
                }
              >
                {album.name}
              </p>
            )}
          </div>
          <div className="infoItem">
            <label> user </label>
            <p
              onClick={() => navigate(`/user/${album.username}`)}
              className="clickable"
            >
              {album.username}{" "}
            </p>
          </div>
          <div className="infoItem">
            <label>open </label>
            <p onClick={toggleOpen} className="clickable">
              {album.open ? "Yes" : "No"}
            </p>
          </div>
          <div className="infoItem">
            <label>public </label>
            <p onClick={togglePublic} className="clickable">
              {album.public ? "Yes" : "No"}
            </p>
          </div>
          <div className="infoItem">
            <label>created </label>
            <p>{new Date(album.created_at).toLocaleString()}</p>
          </div>
          <div className="infoItem">
            <label>Code: </label>
            <p>{album.code}</p>
          </div>
        </div>
      </div>

      {selectMode && currentUser.currentUser && (
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

          <div className="sortControls">
            <button
              className="sortOrderBtn"
              onClick={() => {
                const nextType = viewType === "icon" ? "list" : "icon";
                setViewType(nextType);
                localStorage.setItem("viewType", nextType);
              }}
              title={
                viewType === "icon"
                  ? "Switch to List View"
                  : "Switch to Icon View"
              }
            >
              {viewType === "icon" ? "☰" : "▦"}
            </button>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="created_at">Date</option>
              <option value="filename">Name</option>
              <option value="username">User</option>
              <option value="size">Size</option>
            </select>
            <button
              className="sortOrderBtn"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      )}

      {!selectMode && currentUser.currentUser && (
        <div className="albumActions">
          <button onClick={() => setSelectMode(true)} className="btn">
            Selection Mode
          </button>
          <Uploader album={album} />
          <button onClick={downloadAll} className="btn">
            Download All
          </button>
          {album.username === currentUser.currentUser && (
            <button onClick={handleDeleteAlbum} className="btn">
              Delete Album
            </button>
          )}

          {album.username !== currentUser.currentUser && (
            <button onClick={toggleSubscription} className="btn">
              {album.subscribed ? "Unsubscribe" : "Subscribe"}
            </button>
          )}

          <div className="sortControls">
            <button
              className="sortOrderBtn"
              onClick={() => {
                const nextType = viewType === "icon" ? "list" : "icon";
                setViewType(nextType);
                localStorage.setItem("viewType", nextType);
              }}
              title={
                viewType === "icon"
                  ? "Switch to List View"
                  : "Switch to Icon View"
              }
            >
              {viewType === "icon" ? "☰" : "▦"}
            </button>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="created_at">Date</option>
              <option value="filename">Name</option>
              <option value="username">User</option>
              <option value="size">Size</option>
            </select>
            <button
              className="sortOrderBtn"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      )}

      {viewType === "icon" ? (
        <Iconlist
          photos={photos}
          sortedPhotos={sortedPhotos}
          lastPhotoElementRef={lastPhotoElementRef}
          selectMode={selectMode}
          selected={selected}
          setSelected={setSelected}
          setFocus={setFocus}
          isFetching={isFetching}
        />
      ) : (
        <Listview
          photos={photos}
          sortedPhotos={sortedPhotos}
          lastPhotoElementRef={lastPhotoElementRef}
          selectMode={selectMode}
          selected={selected}
          setSelected={setSelected}
          setFocus={setFocus}
          isFetching={isFetching}
        />
      )}
    </section>
  );
}
export default Albumview;
