import { useNavigate } from "react-router-dom";
import "./style/AlbumItem.css";
import blankImage from '../assets/blank.jpg';

function AlbumItem({ album }) {
  const navigate = useNavigate();

  function handleClick(event) {
    event.preventDefault();
    navigate(`/album/${album.code}`);
  }

  return (
    <div
      className="album-item"
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <img
        src={album.thumb_key || blankImage}
        alt={album.name}
        onError={(e) => { e.target.src = blankImage; }}
      />
      <h3>{album.name}</h3>
      <p>Owner: {album.username} </p>
      <p>Open: {album.open ? "Yes" : "No"}</p>
      <p>Public: {album.public ? "Yes" : "No"}</p>
      <p>Created on: {new Date(album.created_at).toLocaleDateString()}</p>
      {/* <p>Code: {album.code}</p> */}
    </div>
  );
}

export default AlbumItem;
