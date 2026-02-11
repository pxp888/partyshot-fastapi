import "./style/FileItem.css";

function FileItem({ file, selectMode, selected, setSelected, setFocus }) {
  const isSelected = selected.includes(file.id);

  // console.log(file);

  function handleClick(e) {
    e.preventDefault();
    if (selectMode) {
      if (selected.includes(file.id)) {
        setSelected(selected.filter((id) => id !== file.id));
      } else {
        setSelected([...selected, file.id]);
      }
    } else {
      setFocus(file);
    }
  }

  return (
    <div
      className={`fileItem ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
    >
      <h2>{file.filename}</h2>
      <p>{file.username}</p>
      <p>{new Date(file.created_at).toLocaleDateString()}</p>
    </div>
  );
}

export default FileItem;
