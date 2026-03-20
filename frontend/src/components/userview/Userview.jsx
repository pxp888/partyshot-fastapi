import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AlbumItem from "./AlbumItem";
import UserActions from "./UserActions";
import "./Userview.css";
import { useSocket } from "../WebSocketContext"; // ← websocket

function Userview({ currentUser }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← websocket
  const [albums, setAlbums] = useState([]);
  const [sortField, setSortField] = useState(() => localStorage.getItem("userview_sortField") || "modified_at");
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem("userview_sortOrder") || "desc");
  const [profileFirst, setProfileFirst] = useState(() => localStorage.getItem("userview_profileFirst") === "true");

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("userview_sortField", sortField);
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem("userview_sortOrder", sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem("userview_profileFirst", profileFirst);
  }, [profileFirst]);

  // 1️⃣  Initial load – check if we should fetch albums or user photos
  useEffect(() => {
    if (sortField === "my_photos") {
      sendJsonMessage({
        action: "getAlbumsWithUserPhotos",
      });
    } else {
      sendJsonMessage({
        action: "getAlbums",
        payload: { target: username },
      });
    }
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
      case "albumModified":
        if (payload && payload.code) {
          setAlbums((prev) =>
            prev.map((a) =>
              a.code === payload.code ? { ...a, modified_at: payload.modified_at } : a
            )
          );
        }
        break;
      case "albumOpened":
        if (payload && payload.code && payload.viewer === currentUser) {
          setAlbums((prev) =>
            prev.map((a) => {
              if (a.code === payload.code) {
                return a.username === currentUser
                  ? { ...a, opened_at: payload.opened_at }
                  : { ...a, sub_opened_at: payload.opened_at };
              }
              return a;
            })
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
    if (event) event.preventDefault();
    sendJsonMessage({
      action: "createAlbum",
      payload: { album_name: "New album", owner: currentUser },
    });
  }

  // Frontend Sorting Logic
  const sortedAlbums = [...albums].sort((a, b) => {
    // 1. Profile sorting (if enabled)
    if (profileFirst) {
      const aProj = a.profile ? 1 : 0;
      const bProj = b.profile ? 1 : 0;
      if (aProj !== bProj) {
        return bProj - aProj; // Profile (1) comes before Non-profile (0)
      }
    }

    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "created_at" || sortField === "modified_at") {
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
      <UserActions
        username={username}
        currentUser={currentUser}
        handleCreateAlbum={handleCreateAlbum}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        profileFirst={profileFirst}
        setProfileFirst={setProfileFirst}
        sendJsonMessage={sendJsonMessage}
      />
      <div className="album-list">
        {sortedAlbums.length > 0 ? (
          sortedAlbums.map((album) => (
            <AlbumItem
              key={album.id}
              album={album}
              isOtherUser={album.username !== currentUser}
              isOwnProfile={username === currentUser}
              sendJsonMessage={sendJsonMessage}
            />
          ))
        ) : (
          <p>No albums found for this user.</p>
        )}
      </div>
    </div >
  );
}

export default Userview;
