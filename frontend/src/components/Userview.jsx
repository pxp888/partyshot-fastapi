import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { receiveJson, sendJson } from "./helpers";
import AlbumItem from "./AlbumItem";

function Userview({ currentUser, setCurrentUser }) {
  const { username } = useParams();
  const [albums, setAlbums] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const userAlbums = await receiveJson(`/api/user/${username}`);
        setAlbums(userAlbums);
        // console.log("Fetched albums for user:", username, userAlbums);
      } catch (error) {
        console.error("Failed to fetch albums for user:", username, error);
      }
    }

    fetchAlbums();
  }, [username, navigate]);

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
      <h1>User View</h1>
      <p>This is the user view of the application.</p>

      {username === currentUser && (
        <form onSubmit={handleCreateAlbum}>
          <label htmlFor="albumName">Album Name:</label>
          <input type="text" id="albumName" name="albumName" />
          <button type="submit">Create Album</button>
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
