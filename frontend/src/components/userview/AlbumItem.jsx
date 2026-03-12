import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMessage } from "../MessageBoxContext";
import "./AlbumItem.css";
import blankImage from "../../assets/blank.jpg";

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
    setThumbnailUrl(album.thumbnail || blankImage);
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
      className={`album-item ${isOtherUser ? "other-user" : ""} ${!album.profile ? "not-profile" : ""} ${album.private ? "is-private" : ""}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="thumbnail-container">
        {isVisible && thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={album.name}
            className={isLoaded ? "loaded" : ""}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              e.target.src = blankImage;
              setIsLoaded(true);
            }}
          />
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

        <div className="album-actions hideMobile">
          <span
            className={`status-word ${album.open ? "selected" : ""} ${!isOtherUser ? "clickable" : ""}`}
            onClick={handleToggleOpen}
          >
            open
          </span>
          <span
            className={`status-word ${album.profile ? "selected" : ""} ${isOwnProfile ? "clickable" : ""}`}
            onClick={handleToggleProfile}
          >
            profile
          </span>
          <span
            className={`status-word ${album.private ? "selected" : ""} ${!isOtherUser ? "clickable" : ""}`}
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
