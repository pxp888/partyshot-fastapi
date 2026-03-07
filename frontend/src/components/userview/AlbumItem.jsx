import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMessage } from "../MessageBoxContext";
import { receiveJson } from "../helpers";
import "./AlbumItem.css";
import blankImage from "../../assets/blank.jpg";

function AlbumItem({ album, isOtherUser, sendJsonMessage }) {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchThumbnail = async () => {
      try {
        const data = await receiveJson(`/api/album-thumbnail/${album.code}`);
        if (isMounted) {
          setThumbnailUrl(data.thumbnail);
        }
      } catch (error) {
        console.error("Error fetching thumbnail:", error);
      }
    };

    fetchThumbnail();

    return () => {
      isMounted = false;
    };
  }, [album.code]);

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
    if (isOtherUser) return;
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
      className={`album-item ${isOtherUser ? "other-user" : ""} ${!album.profile ? "not-profile" : ""} ${album.private ? "is-private" : ""}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="thumbnail-container">
        <img
          src={thumbnailUrl || blankImage}
          alt={album.name}
          className={isLoaded ? "loaded" : ""}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            e.target.src = blankImage;
            setIsLoaded(true);
          }}
        />
      </div>
      <div className="info">
        <h3>{album.name}</h3>
        <div className="album-details">
          {/* <label>user</label> */}
          <p>{album.username}</p>
          {/* <label className="hideMobile">created</label> */}
          <p className="hideMobile">
            {new Date(album.created_at).toLocaleDateString()}
          </p>
        </div>

        {!isOtherUser && (
          <div className="album-actions hideMobile">
            <span
              className={`status-word ${album.open ? "selected" : ""} ${!isOtherUser ? "clickable" : ""}`}
              onClick={handleToggleOpen}
            >
              open
            </span>
            <span
              className={`status-word ${album.profile ? "selected" : ""} ${!isOtherUser ? "clickable" : ""}`}
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
        )}
      </div>
    </div>
  );
}

export default AlbumItem;
