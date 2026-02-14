// import { useParams, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
// import { receiveJson, sendJson } from "./helpers";
import { receiveJson } from "./helpers";
import AlbumItem from "./AlbumItem";
import "./style/Userview.css";
import { useSocket } from "./WebSocketContext"; // ← NEW

function Userview({ currentUser }) {
  const { username } = useParams();
  // const navigate = useNavigate();

  // --------------------------------------------
  // WebSocket state & helpers
  // --------------------------------------------
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← NEW

  // Store the list of albums locally
  const [albums, setAlbums] = useState([]);

  // --------------------------------------------
  // 1️⃣  Initial load – same as before
  // --------------------------------------------
  const fetchAlbumsData = useCallback(async () => {
    try {
      return await receiveJson(`/api/user/${username}`);
    } catch (error) {
      console.error("Failed to fetch albums for user:", username, error);
      return [];
    }
  }, [username]);

  useEffect(() => {
    const loadAlbums = async () => {
      const data = await fetchAlbumsData();
      setAlbums(data);
    };
    loadAlbums();
  }, [fetchAlbumsData]);

  // --------------------------------------------
  // 2️⃣  React to messages that come from the WS
  // --------------------------------------------
  useEffect(() => {
    if (!lastJsonMessage) return;

    console.log(lastJsonMessage);

    // Handle a bulk list of albums
    if (lastJsonMessage.type === "albumList") {
      const payload = lastJsonMessage.albums || [];
      // Compare the new list with the current state to avoid unnecessary updates
      const isEqual =
        payload.length === albums.length &&
        payload.every((p, idx) => p.id === albums[idx]?.id);

      if (!isEqual) {
        setAlbums(payload);
      }
    }

    // Handle a single album addition
    if (lastJsonMessage.type === "albumAdded") {
      const newAlbum = lastJsonMessage.album;
      // Avoid duplicate entries
      if (!albums.some((a) => a.id === newAlbum?.id)) {
        setAlbums((prev) => [...prev, newAlbum]);
      }
    }
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

    // Optionally you can still POST to the REST endpoint
    // if you want to guarantee persistence:
    // sendJson("/api/create-album", { album_name: albumName })
    //   .then((response) => {
    //     console.log("Creating album via REST:", response);
    //     navigate(`/album/${response[0].code}`);
    //   })
    //   .catch((error) => {
    //     console.error("Failed to create album via REST:", error);
    //   });
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
