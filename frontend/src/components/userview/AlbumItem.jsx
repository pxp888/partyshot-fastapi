import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMessage } from "../MessageBoxContext";
import "./AlbumItem.css";

function AlbumItem({ album, isOtherUser, isOwnProfile, sendJsonMessage }) {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const localRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(localRef.current);
        }
      });
    }, {
      rootMargin: '100px',
    });

    if (localRef.current) {
      observer.observe(localRef.current);
    }

    return () => {
      if (localRef.current) {
        observer.unobserve(localRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    setThumbnailUrl(album.thumbnail);
  }, [album.thumbnail, isVisible]);

  function handleClick(event) {
    event.preventDefault();
    navigate(`/album/${album.code}`);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isOtherUser && !album.open) {
      showMessage("this album is not open for uploads", "Warning");
    }
  }

  function handleToggleOpen(event) {
    event.stopPropagation();
    if (isOtherUser) return;
    sendJsonMessage({
      action: "toggleOpen",
      payload: { album_id: album.id },
    });
  }

  function handleToggleProfile(event) {
    event.stopPropagation();
    if (!isOwnProfile) return;
    sendJsonMessage({
      action: "toggleProfile",
      payload: { album_id: album.id },
    });
  }

  function handleTogglePrivate(event) {
    event.stopPropagation();
    if (isOtherUser) return;
    sendJsonMessage({
      action: "togglePrivate",
      payload: { album_id: album.id },
    });
  }

  return (
    <div
      ref={localRef}
      className={`album-item ${isOtherUser ? "other-user" : ""} ${!album.profile ? "not-profile" : ""} ${album.private ? "is-private" : ""} ${album.open ? "is-open" : ""}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="thumbnail-container">
        {isVisible && (
          thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={album.name}
              className={isLoaded ? "loaded" : ""}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setThumbnailUrl(null);
                setIsLoaded(true);
              }}
            />
          ) : (
            <svg width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          )
        )}
      </div>
      <div className="info">
        <h3>{album.name}</h3>
        <div className="album-details">
          {/* <label>user</label> */}
          <p>{album.username}</p>
          {/* <label className="hideMobile">created</label> */}
          <p className="hideMobile">
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
        </div>

        <div className="ai-controls hideMobile">
          <span
            className={`ai-status ${album.open ? "selected" : ""} ${!isOtherUser ? "clickable" : ""}`}
            onClick={handleToggleOpen}
          >
            open
          </span>
          <span
            className={`ai-status ${album.profile ? "selected" : ""} ${isOwnProfile ? "clickable" : ""}`}
            onClick={handleToggleProfile}
          >
            profile
          </span>
          <span
            className={`ai-status ${album.private ? "selected" : ""} ${!isOtherUser ? "clickable" : ""}`}
            onClick={handleTogglePrivate}
          >
            private
          </span>
        </div>
      </div>
    </div>
  );
}

export default AlbumItem;
