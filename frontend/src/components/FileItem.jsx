import "./style/FileItem.css";
import blankImage from '../assets/blank.jpg';
import videoImage from '../assets/video.webp';

function FileItem({
  index,
  file,
  selectMode,
  selected,
  setSelected,
  setFocus,
}) {
  const isSelected = selected.includes(file.id);

  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv)$/i;
  const isVideo = videoExtensions.test(file.filename);
  const placeholder = isVideo ? videoImage : blankImage;

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
          src={file.thumb_key || placeholder}
          alt={`${file.filename}`}
          onError={(e) => { e.target.src = placeholder; }}
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
