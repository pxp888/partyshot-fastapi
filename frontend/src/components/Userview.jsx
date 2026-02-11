import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { receiveJson, sendJson } from "./helpers";

function Userview({ currentUser, setCurrentUser }) {
  const { username } = useParams();
  const [albums, setAlbums] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const userAlbums = await receiveJson(`/api/user/${username}`);
        setAlbums(userAlbums);
        console.log("Fetched albums for user:", username, userAlbums);
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
        setAlbums((prevAlbums) => [...prevAlbums, response.new_album]);
      })
      .catch((error) => {
        console.error("Failed to create album:", error);
      });
    console.log("Creating album:", albumName);
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
    </div>
  );
}

export default Userview;
