import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { receiveJson, sendJson } from "./helpers";

function Albumview(currentUser) {
  const { albumcode } = useParams();
  const [album, setAlbum] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAlbum() {
      try {
        const albumData = await receiveJson(`/api/album/${albumcode}`);
        setAlbum(albumData);
        console.log("Fetched album data for album code:", albumData);
      } catch (error) {
        console.error(
          "Failed to fetch album data for album code:",
          albumcode,
          error,
        );
      }
    }
    fetchAlbum();
  }, [albumcode, navigate]);

  async function handleDeleteAlbum() {
    try {
      sendJson("/api/delete-album", { code: album.code });
      console.log("Album deleted successfully");
      window.location.href = `/user/${currentUser.currentUser}`;
    } catch (error) {
      console.error("Failed to delete album:", error);
    }
  }

  if (!album) {
    return (
      <div className="albumview">
        <h1>Album View</h1>
        <p>Loading album data...</p>
      </div>
    );
  }

  console.log("Rendering album view with album data:", album);
  console.log("Current user:", currentUser);

  return (
    <section>
      <div className="albumview">
        <h3>Album View</h3>
        <div>
          <h1>{album.name}</h1>
          <p>Owner: {album.username} </p>
          <p>Open: {album.open ? "Yes" : "No"}</p>
          <p>Public: {album.public ? "Yes" : "No"}</p>
          <p>Created on: {new Date(album.created_at).toLocaleDateString()}</p>
          <p>Code: {album.code}</p>
        </div>
      </div>
      {album.username === currentUser.currentUser && (
        <button onClick={handleDeleteAlbum} className="btn">
          Delete Album
        </button>
      )}
    </section>
  );
}
export default Albumview;
