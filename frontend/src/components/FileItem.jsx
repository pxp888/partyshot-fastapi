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
      <h2>{file.filename}</h2>
      <p>{index}</p>
      <p>{file.username}</p>
      <p>{new Date(file.created_at).toLocaleDateString()}</p>
      <img src={file.thumb_key} alt={`${file.filename}`} />
    </div>
  );
}

export default FileItem;
