import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AlbumItem from "./AlbumItem";
import "./style/Userview.css";
import { useSocket } from "./WebSocketContext"; // ← websocket

function Userview({ currentUser }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← websocket
  const [albums, setAlbums] = useState([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // --------------------------------------------------------
  // 1️⃣  Initial load – same as before
  // --------------------------------------------------------

  useEffect(() => {
    sendJsonMessage({
      action: "getAlbums",
      payload: { target: username },
    });
  }, [username, sendJsonMessage]);

  // 2️⃣ Keep Alive Heartbeat (every 2 minutes)
  useEffect(() => {
    if (!username) return;

    const keepAliveInterval = setInterval(() => {
      const subjects = [
        `user-${username}`,
        ...albums.map((a) => `album-${a.code}`),
      ];
      sendJsonMessage({
        action: "keepAlive",
        payload: { subjects },
      });
    }, 120000); // 2 minutes

    return () => clearInterval(keepAliveInterval);
  }, [username, albums, sendJsonMessage]);

  // --------------------------------------------------------
  // 2️⃣  React to messages that come from the WS
  // --------------------------------------------------------

  useEffect(() => {
    if (!lastJsonMessage) return;

    const { action, payload } = lastJsonMessage;

    switch (action) {
      case "getAlbums":
        if (payload?.albums !== undefined) {
          setAlbums(Array.isArray(payload?.albums) ? payload.albums : []);
        }
        break;
      case "newAlbum":
        if (payload?.type === "update") {
          sendJsonMessage({
            action: "getAlbums",
            payload: { target: username },
          });
        }
        break;
      case "createAlbum":
        if (payload) {
          navigate(`/album/${payload}`);
        }
        break;
      case "toggleOpen":
      case "toggleProfile":
      case "togglePrivate":
        if (payload && payload.code) {
          setAlbums((prev) =>
            prev.map((a) =>
              a.code === payload.code ? { ...a, ...payload } : a
            )
          );
        }
        break;
      case "setAlbumName":
        if (payload && payload.albumcode) {
          setAlbums((prev) =>
            prev.map((a) =>
              a.code === payload.albumcode ? { ...a, name: payload.name } : a
            )
          );
        }
        break;
      default:
        break;
    }
  }, [lastJsonMessage, sendJsonMessage, username, navigate]);

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

  // Frontend Sorting Logic
  const sortedAlbums = [...albums].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "created_at") {
      valA = new Date(valA);
      valB = new Date(valB);
    } else {
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="userview">
      <div className="userActions">
        {username === currentUser && (
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
        )}
        <div className="sortControls">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
          >
            <option value="created_at">Date</option>
            <option value="name">Name</option>
            <option value="username">User</option>
          </select>
          <button
            className="sortOrderBtn"
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>
      <div className="album-list">
        {sortedAlbums.length > 0 ? (
          sortedAlbums.map((album) => (
            <AlbumItem
              key={album.id}
              album={album}
              isOtherUser={album.username !== currentUser}
              sendJsonMessage={sendJsonMessage}
            />
          ))
        ) : (
          <p>No albums found for this user.</p>
        )}
      </div>
    </div>
  );
}

export default Userview;
