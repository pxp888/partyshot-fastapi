import { useNavigate } from "react-router-dom";
import "./style/AlbumItem.css";
import blankImage from "../assets/blank.jpg";

function AlbumItem({ album, isOtherUser }) {
  const navigate = useNavigate();

  function handleClick(event) {
    event.preventDefault();
    navigate(`/album/${album.code}`);
  }

  return (
    <div
      className={`album-item ${isOtherUser ? "other-user" : ""} ${!album.public ? "not-public" : ""}`}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <img
        src={album.thumb_key || blankImage}
        alt={album.name}
        onError={(e) => {
          e.target.src = blankImage;
        }}
      />
      <div className="info">
        <h3>{album.name}</h3>
        <label>user</label>
        <p>{album.username} </p>
        <label>open</label>
        <p>{album.open ? "Yes" : "No"}</p>
        <label>public</label>
        <p>{album.public ? "Yes" : "No"}</p>
        <label>created</label>
        <p>{new Date(album.created_at).toLocaleString()}</p>
      </div>
      {/* <p>Code: {album.code}</p> */}
    </div>
  );
}

export default AlbumItem;
