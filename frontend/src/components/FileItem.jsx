import "./style/FileItem.css";
import blankImage from '../assets/blank.jpg';

function FileItem({
  index,
  file,
  selectMode,
  selected,
  setSelected,
  setFocus,
}) {
  const isSelected = selected.includes(file.id);

  // console.log(file);

  function handleClick(e) {
    e.preventDefault();
    if (selectMode) {
      if (isSelected) {
        setSelected(selected.filter((id) => id !== file.id));
      } else {
        setSelected([...selected, file.id]);
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
        <img
          src={file.thumb_key || blankImage}
          alt={`${file.filename}`}
          onError={(e) => { e.target.src = blankImage; }}
        />
      </div>
      {isSelected && <div className="selectscreen" />}
      <div className="fileInfo">
        <div className="info">
          <p className="title">{file.filename}</p>
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
