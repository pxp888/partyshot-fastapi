import { useState, useEffect, useRef, forwardRef } from "react";
import "./style/FileItem.css";
import blankImage from '../assets/blank.jpg';
import videoImage from '../assets/video.webp';

const FileItem = forwardRef(({
  index,
  file,
  selectMode,
  selected,
  setSelected,
  setFocus,
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const internalRef = useRef();
  const domRef = ref || internalRef;

  const isSelected = selected.includes(file.id);

  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv)$/i;
  const isVideo = videoExtensions.test(file.filename);
  const placeholder = isVideo ? videoImage : blankImage;

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(domRef.current);
        }
      });
    }, {
      rootMargin: '100px',
    });

    if (domRef.current) {
      observer.observe(domRef.current);
    }

    return () => {
      if (domRef.current) {
        observer.unobserve(domRef.current);
      }
    };
  }, []);

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
      ref={domRef}
      className={`fileItem ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
      style={{ "--ar": aspectRatio }}
    >
      <div className="thumbnail">
        {/* Actual Image - falls back to black background while loading, then fades in */}
        {isVisible && (
          <img
            src={file.thumb_key || placeholder}
            alt={`${file.filename}`}
            className={isLoaded ? "loaded" : ""}
            onLoad={(e) => {
              setIsLoaded(true);
              if (e.target.naturalWidth && e.target.naturalHeight) {
                setAspectRatio(e.target.naturalWidth / e.target.naturalHeight);
              }
            }}
            onError={(e) => {
              e.target.src = placeholder;
              setIsLoaded(true);
            }}
          />
        )}
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
});

export default FileItem;
