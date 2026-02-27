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
      className={`album-item ${isOtherUser ? "other-user" : ""} ${!album.profile ? "not-profile" : ""} ${album.private ? "is-private" : ""}`}
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
        <label className="hideMobile">open</label>
        <p className="hideMobile">{album.open ? "Yes" : "No"}</p>
        <label className="hideMobile">profile</label>
        <p className="hideMobile">{album.profile ? "Yes" : "No"}</p>
        <label className="hideMobile">private</label>
        <p className="hideMobile">{album.private ? "Yes" : "No"}</p>
        <label className="hideMobile">created</label>
        <p className="hideMobile">
          {new Date(album.created_at).toLocaleString()}
        </p>
      </div>
      {/* <p>Code: {album.code}</p> */}
    </div>
  );
}

export default AlbumItem;
