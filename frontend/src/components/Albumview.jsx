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
        // console.log("Fetched album data for album code:", albumcode, albumData);
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

  return (
    <div className="albumview">
      <h1>Album View</h1>
    </div>
  );
}

export default Albumview;
