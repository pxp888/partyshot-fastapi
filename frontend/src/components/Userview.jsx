import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { receiveJson, sendJson } from "./helpers";
import AlbumItem from "./AlbumItem";
import "./style/Userview.css";

function Userview({ currentUser }) {
  const { username } = useParams();
  const [albums, setAlbums] = useState([]);
  const navigate = useNavigate();

  // 1️⃣ Helper that only *fetches* the data
  const fetchAlbumsData = useCallback(async () => {
    try {
      return await receiveJson(`/api/user/${username}`);
    } catch (error) {
      console.error("Failed to fetch albums for user:", username, error);
      return [];
    }
  }, [username]);

  // 2️⃣ Effect that *updates* state
  useEffect(() => {
    const loadAlbums = async () => {
      const data = await fetchAlbumsData();
      setAlbums(data); // ← state update happens inside the effect
    };
    loadAlbums();
  }, [fetchAlbumsData]); // dependency on the memoised fetch function

  function handleCreateAlbum(event) {
    event.preventDefault();
    const albumName = event.target.elements.albumName.value;
    sendJson("/api/create-album", { album_name: albumName })
      .then((response) => {
        console.log("Creating album:", response);
        navigate(`/album/${response[0].code}`);
      })
      .catch((error) => {
        console.error("Failed to create album:", error);
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
