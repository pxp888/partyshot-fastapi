import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
// import { receiveJson } from "./helpers";
import AlbumItem from "./AlbumItem";
import "./style/Userview.css";
import { useSocket } from "./WebSocketContext"; // ← NEW

function Userview({ currentUser }) {
  const { username } = useParams();
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← NEW
  const [albums, setAlbums] = useState([]);

  // --------------------------------------------
  // 1️⃣  Initial load – same as before
  // --------------------------------------------

  useEffect(() => {
    sendJsonMessage({
      action: "getAlbums",
      payload: { target: username },
    });
  }, [sendJsonMessage, username]);

  // --------------------------------------------
  // 2️⃣  React to messages that come from the WS
  // --------------------------------------------
  useEffect(() => {
    if (!lastJsonMessage) return;
    const { action, payload } = lastJsonMessage;

    // 1️⃣  Initial list of albums (sent from db.py)
    if (action === "getAlbums") {
      setAlbums(Array.isArray(payload) ? payload : []);
      return;
    }

    console.log(lastJsonMessage);
  }, [lastJsonMessage, albums]); // Note the extra `albums` dependency

  // --------------------------------------------
  // 3️⃣  Create a new album – send via WS
  // --------------------------------------------
  function handleCreateAlbum(event) {
    event.preventDefault();
    const albumName = event.target.elements.albumName.value;
    sendJsonMessage({
      action: "createAlbum",
      payload: { album_name: albumName, owner: currentUser },
    });
  }

  return (
    <div className="userview">
      {username === currentUser && (
        <form onSubmit={handleCreateAlbum}>
          <label htmlFor="albumName">New Album Name : </label>
          <input type="text" id="albumName" name="albumName" />
          <button className="btn" type="submit">
            Create Album
          </button>
        </form>
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
