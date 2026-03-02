import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { receiveJson } from "../helpers";
import "./AlbumItem.css";
import blankImage from "../../assets/blank.jpg";

function AlbumItem({ album, isOtherUser, sendJsonMessage }) {
  const navigate = useNavigate();
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

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
    >
      <div className="thumbnail-container">
        <img
          src={thumbnailUrl || blankImage}
          alt={album.name}
          onError={(e) => {
            e.target.src = blankImage;
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
      </div>
    </div>
  );
}

export default AlbumItem;
