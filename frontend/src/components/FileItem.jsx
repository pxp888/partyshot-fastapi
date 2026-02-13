import "./style/FileItem.css";

function FileItem({
  index,
  file,
  selectMode,
  selected,
  setSelected,
  setFocus,
}) {
  const isSelected = selected.includes(index);

  // console.log(file);

  function handleClick(e) {
    e.preventDefault();
    if (selectMode) {
      if (selected.includes(index)) {
        setSelected(selected.filter((id) => id !== index));
      } else {
        setSelected([...selected, index]);
      }
    } else {
      setFocus(index);
    }
  }

  return (
    <div
      className={`fileItem ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
    >
      <div className="thumbnail">
        <img src={file.thumb_key} alt={`${file.filename}`} />
      </div>
      {isSelected && <div className="selectscreen" />}
      <div className="fileInfo">
        <div className="info">
          <p>{file.filename}</p>
        </div>
        <div className="info">
          <label>user</label>
          <p>{file.username}</p>
        </div>
        <div className="info">
          <label>uploaded</label>
          <p>{new Date(file.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default FileItem;
