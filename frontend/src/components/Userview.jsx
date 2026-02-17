import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import AlbumItem from "./AlbumItem";
import "./style/Userview.css";
import { useSocket } from "./WebSocketContext"; // ← websocket

function Userview({ currentUser }) {
  const { username } = useParams();
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← websocket
  const [albums, setAlbums] = useState([]);

  // --------------------------------------------------------
  // 1️⃣  Initial load – same as before
  // --------------------------------------------------------

  useEffect(() => {
    sendJsonMessage({
      action: "getAlbums",
      payload: { target: username },
    });
  }, [username]);

  // --------------------------------------------------------
  // 2️⃣  React to messages that come from the WS
  // --------------------------------------------------------

  useEffect(() => {
    if (!lastJsonMessage) return;

    const { action, payload } = lastJsonMessage;

    switch (action) {
      case "getAlbums":
        setAlbums(Array.isArray(payload?.albums) ? payload.albums : []);
        break;
      case "newAlbum":
        if (payload?.type === "update") {
          sendJsonMessage({
            action: "getAlbums",
            payload: { target: username },
          });
        }
        break;
      default:
        break;
    }
  }, [lastJsonMessage, sendJsonMessage, username]);

  // --------------------------------------------------------
  // 3️⃣  Create a new album – send via WS
  // --------------------------------------------------------

  function handleCreateAlbum(event) {
    event.preventDefault();
    const albumName = event.target.elements.albumName.value;
    if (!albumName || albumName.trim() === "") {
      return;
    }
    sendJsonMessage({
      action: "createAlbum",
      payload: { album_name: albumName, owner: currentUser },
    });
  }

  return (
    <div className="userview">
      {username === currentUser && (
        <div className="userActions">
          <form onSubmit={handleCreateAlbum}>
            {/* <label htmlFor="albumName">New Album Name : </label>*/}
            <input
              type="text"
              id="albumName"
              name="albumName"
              placeholder="New Album Name"
            />
            <button className="btn" type="submit">
              Create Album
            </button>
          </form>
        </div>
      )}
      <div className="album-list">
        {albums.length > 0 ? (
          albums.map((album) => <AlbumItem key={album.id} album={album} />)
        ) : (
          <p>No albums found for this user.</p>
        )}
      </div>
    </div>
  );
}

export default Userview;
