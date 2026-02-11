function AlbumItem({ album }) {
  console.log(album);
  return (
    <div className="album-item">
      <h3>{album.name}</h3>
      <p>Owner: {album.username} </p>
      <p>Open: {album.open ? "Yes" : "No"}</p>
      <p>Public: {album.public ? "Yes" : "No"}</p>
      <p>Created on: {new Date(album.created_at).toLocaleDateString()}</p>
      <p>Code: {album.code}</p>
    </div>
  );
}

export default AlbumItem;
