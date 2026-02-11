import "./style/FileItem.css";

function FileItem({ file }) {
  console.log(file);
  return (
    <div className="fileItem">
      <h2>{file.filename}</h2>
      <p>{file.username}</p>
      <p>{new Date(file.created_at).toLocaleDateString()}</p>
    </div>
  );
}

export default FileItem;
