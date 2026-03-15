import { useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../WebSocketContext";
import { useMessage } from "../MessageBoxContext";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import Imageview from "../Imageview";
import Uploader from "./Uploader";
import AlbumRenamer from "./AlbumRenamer";
import Iconlist from "./Iconlist";
import Listview from "./Listview";
import Gridview from "./Gridview";
import QRHover from "./QRHover";
import MobileActions from "./MobileActions";
import DesktopActions from "./DesktopActions";
import { useMediaQuery } from "../../hooks/useMediaQuery";

import "./Albumview.css";

function Albumview({ currentUser }) {
  const { albumcode } = useParams();
  const userLoggedIn = !!currentUser;
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
  const isMobile = useMediaQuery("(max-width: 900px)");

  const handleViewTypeChange = (type) => {
    setViewType(type);
    localStorage.setItem("viewType", type);
  };

  const observer = useRef();
  const uploaderRef = useRef();

  const { sendJsonMessage, lastJsonMessage } = useSocket();
  const { showMessage, showConfirm } = useMessage();
  const navigate = useNavigate();

  const isOwner = album && currentUser && album.username === currentUser;

  useEffect(() => {
    sendJsonMessage({
      action: "getAlbum",
      payload: { albumcode: albumcode },
    });
    return () => {
      if (albumcode) {
        sendJsonMessage({
          action: "recordVisit",
          payload: { albumcode: albumcode },
        });
      }
    };
  }, [albumcode, sendJsonMessage]);

  useEffect(() => {
    if (!albumcode) return;
    const keepAliveInterval = setInterval(() => {
      sendJsonMessage({
        action: "keepAlive",
        payload: { subjects: [`album-${albumcode}`] },
      });
    }, 120000); // 2 minutes

    return () => clearInterval(keepAliveInterval);
  }, [albumcode, sendJsonMessage]);

  const fetchPhotos = useCallback((offset) => {
    if (!albumcode) return;
    setIsFetching(true);
    sendJsonMessage({
      action: "getPhotos",
      payload: {
        albumcode: albumcode,
        limit: limit,
        offset: offset,
        sortField: sortField,
        sortOrder: sortOrder,
      },
    });
  }, [albumcode, limit, sortField, sortOrder, sendJsonMessage]);

  const loadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    fetchPhotos(photos.length);
  }, [isFetching, hasMore, photos.length, fetchPhotos]);

  useEffect(() => {
    setPhotos([]);
    setTotalPhotos(0);
    setHasMore(true);
    fetchPhotos(0);
  }, [albumcode, sortField, sortOrder, fetchPhotos]);

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
    [isFetching, hasMore, loadMore],
  );

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
          return newPhotos;
        });
        setTotalPhotos(payload.total ?? 0);
        setHasMore(payload.offset + batch.length < payload.total);
        setIsFetching(false);
        break;
      }

      case "getDownloadList": {
        const photosToDownload = payload?.photos ?? [];
        if (isDownloadingAll) {
          startZipProcess(photosToDownload);
          setIsDownloadingAll(false);
        }
        break;
      }

      case "addPhoto":
        if (payload && payload.album_id === album?.id) {
          setPhotos((prev) => {
            if (prev.find((p) => p.id === payload.id)) return prev;
            if (sortOrder === "desc") {
              return [payload, ...prev];
            } else {
              return [...prev, payload];
            }
          });
          setTotalPhotos((prev) => prev + 1);
          console.log("Photo added to current album:", payload);
        }
        break;

      case "deletePhoto": {
        if (payload && payload.album_id === album?.id) {
          const deletedId = payload.id;
          setPhotos((prev) => prev.filter((p) => p.id !== deletedId));
          setSelected((prev) => prev.filter((id) => id !== deletedId));
        }
        break;
      }

      case "deleteAlbum":
        if (payload === albumcode) {
          window.location.href = `/user/${currentUser}`;
        } else {
          showMessage(`Album deletion failed: ${payload}`, "Error");
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

      case "toggleOpen":
        if (payload && payload.code?.toLowerCase() === albumcode?.toLowerCase()) {
          setAlbum((prev) => ({ ...prev, ...payload }));
        }
        break;

      case "toggleProfile":
        if (payload && payload.code?.toLowerCase() === albumcode?.toLowerCase()) {
          setAlbum((prev) => ({ ...prev, ...payload }));
        }
        break;

      case "togglePrivate":
        if (payload && payload.code?.toLowerCase() === albumcode?.toLowerCase()) {
          setAlbum((prev) => ({ ...prev, ...payload }));
        }
        break;

      default:
        break;
    }
  }, [lastJsonMessage, currentUser, albumcode]);

  async function handleDeleteAlbum() {
    showConfirm(
      "Are you sure you want to delete this album?",
      "Delete Album",
      () => {
        sendJsonMessage({
          action: "deleteAlbum",
          payload: { albumcode: albumcode },
        });
      },
    );
  }

  const startZipProcess = async (photosToZip) => {
    if (!photosToZip || photosToZip.length === 0) {
      showMessage("No photos available to download.", "Download");
      return;
    }

    const zip = new JSZip();

    const fetchBlob = async (url, filename) => {
      const res = await fetch(url, {
        mode: "cors",
        cache: "no-cache",
      });
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
      showMessage("An error occurred while preparing the ZIP file.", "Error");
    } finally {
      setSelectMode(false);
    }
  };

  function downloadAll(e) {
    e.preventDefault();
    showConfirm("Download the full album?", "Download Album", () => {
      setIsDownloadingAll(true);
      sendJsonMessage({
        action: "getDownloadList",
        payload: { albumcode: albumcode },
      });
    });
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
      return showMessage("No files selected for download.", "Download");
    }

    const zip = new JSZip();

    const fetchBlob = async (url, filename) => {
      const res = await fetch(url, {
        mode: "cors",
        cache: "no-cache",
      });
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
        showMessage("An error occurred while preparing the ZIP file.", "Error");
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
      return showMessage("No files selected for deletion.", "Delete Files");
    }

    showConfirm(
      "Are you sure you want to delete the selected files?",
      "Delete Files",
      () => {
        const idsToDelete = [...selected];
        setSelected([]);

        idsToDelete.forEach(async (id) => {
          deletedPhoto(id);
        });
      },
    );
  }

  function toggleOpen() {
    sendJsonMessage({
      action: "toggleOpen",
      payload: { album_id: album.id },
    });
  }

  function toggleProfile() {
    sendJsonMessage({
      action: "toggleProfile",
      payload: { album_id: album.id },
    });
  }

  function togglePrivate() {
    sendJsonMessage({
      action: "togglePrivate",
      payload: { album_id: album.id },
    });
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

  const handleUpload = useCallback((files) => {
    if (!isOwner && !album.open) {
      showMessage("this album is not open for uploads", "Warning");
      return;
    }
    if (uploaderRef.current) {
      uploaderRef.current.handleFiles(files);
    }
  }, [isOwner, album?.open, showMessage]);

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

      <section className="adetails">
        <div className="title">
          {isRenaming ? (
            <AlbumRenamer
              album={album}
              onRename={handleRename}
              onCancel={() => setIsRenaming(false)}
            />
          ) : (
            <p
              onClick={() => {
                if (isOwner) {
                  setIsRenaming(true);
                }
              }}
              className={isOwner ? "clickable" : ""}
            >
              {album.name}
            </p>
          )}
        </div>

        <div className="spread">
          <div className="vert left">
            <p className="date">
              {new Date(album.created_at)
                .toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
                .replace(/ (AM|PM)$/, (match) => match.toLowerCase())}
            </p>
            <p
              onClick={() => navigate(`/user/${album.username}`)}
              className="clickable username"
            >
              {album.username}{" "}
            </p>
          </div>
          <div className="vert right">

            <div className="av-controls">
              <span
                className={`av-status ${album.open ? "active" : ""} ${isOwner ? "clickable" : ""}`}
                data-type="open"
                onClick={() => {
                  if (isOwner) toggleOpen();
                }}
              >
                open
              </span>
              <span
                className={`av-status ${album.profile ? "active" : ""} ${isOwner || album.subscribed ? "clickable" : ""}`}
                data-type="profile"
                onClick={() => {
                  if (isOwner || album.subscribed) toggleProfile();
                }}
              >
                profile
              </span>
              <span
                className={`av-status ${album.private ? "active" : ""} ${isOwner ? "clickable" : ""}`}
                data-type="private"
                onClick={() => {
                  if (isOwner) togglePrivate();
                }}
              >
                private
              </span>
            </div>
          </div>
        </div>
      </section>

      {isMobile ? (
        <MobileActions
          selectMode={selectMode}
          setSelectMode={setSelectMode}
          cancelSelect={cancelSelect}
          selectAll={selectAll}
          selectNone={selectNone}
          downloadSelected={downloadSelected}
          deleteSelected={deleteSelected}
          downloadAll={downloadAll}
          handleDeleteAlbum={handleDeleteAlbum}
          toggleSubscription={toggleSubscription}
          handleViewTypeChange={handleViewTypeChange}
          viewType={viewType}
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          userLoggedIn={userLoggedIn}
          isOwner={isOwner}
          album={album}
          uploader={
            <Uploader
              album={album}
              ref={uploaderRef}
              isOwner={isOwner}
              userLoggedIn={userLoggedIn}
              disabled={!isOwner && !album.open}
              photos={photos}
              setPhotos={setPhotos}
              setTotalPhotos={setTotalPhotos}
              sortOrder={sortOrder}
            />
          }
        />
      ) : (
        <DesktopActions
          selectMode={selectMode}
          setSelectMode={setSelectMode}
          cancelSelect={cancelSelect}
          selectAll={selectAll}
          selectNone={selectNone}
          downloadSelected={downloadSelected}
          deleteSelected={deleteSelected}
          downloadAll={downloadAll}
          handleDeleteAlbum={handleDeleteAlbum}
          toggleSubscription={toggleSubscription}
          handleViewTypeChange={handleViewTypeChange}
          viewType={viewType}
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          userLoggedIn={userLoggedIn}
          isOwner={isOwner}
          album={album}
          uploader={
            <Uploader
              album={album}
              ref={uploaderRef}
              isOwner={isOwner}
              userLoggedIn={userLoggedIn}
              disabled={!isOwner && !album.open}
              photos={photos}
              setPhotos={setPhotos}
              setTotalPhotos={setTotalPhotos}
              sortOrder={sortOrder}
            />
          }
        />
      )}

      {album?.private &&
        album?.username !== currentUser &&
        album?.open && (
          <p className="helptext">
            This album is private, so you cannot access the photos, but you can
            upload photos.
          </p>
        )}

      {viewType === "icon" && (
        <Iconlist
          photos={photos}
          sortedPhotos={sortedPhotos}
          lastPhotoElementRef={lastPhotoElementRef}
          selectMode={selectMode}
          selected={selected}
          setSelected={setSelected}
          setFocus={setFocus}
          isFetching={isFetching}
          onDrop={handleUpload}
        />
      )}

      {viewType === "list" && (
        <Listview
          photos={photos}
          sortedPhotos={sortedPhotos}
          lastPhotoElementRef={lastPhotoElementRef}
          selectMode={selectMode}
          selected={selected}
          setSelected={setSelected}
          setFocus={setFocus}
          isFetching={isFetching}
          onDrop={handleUpload}
        />
      )}

      {viewType === "grid" && (
        <Gridview
          photos={photos}
          sortedPhotos={sortedPhotos}
          lastPhotoElementRef={lastPhotoElementRef}
          selectMode={selectMode}
          selected={selected}
          setSelected={setSelected}
          setFocus={setFocus}
          isFetching={isFetching}
          onDrop={handleUpload}
        />
      )}

    </section>
  );
}
export default Albumview;
