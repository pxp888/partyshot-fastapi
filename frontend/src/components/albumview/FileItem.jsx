import { useState, useEffect, useRef, forwardRef, memo } from "react";
import "./FileItem.css";
import videoImage from '../../assets/video.webp';

const FileItem = memo(forwardRef(({
  index,
  file,
  selectMode,
  isSelected,
  toggleSelect,
  setFocus,
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const localRef = useRef();

  const setRefs = (node) => {
    localRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv)$/i;
  const isVideo = videoExtensions.test(file.filename);
  const [imgSrc, setImgSrc] = useState(file.thumb_key || (isVideo ? videoImage : null));

  useEffect(() => {
    setImgSrc(file.thumb_key || (isVideo ? videoImage : null));
  }, [file.thumb_key, isVideo]);

  useEffect(() => {
    const node = localRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, {
      rootMargin: '200px',
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function handleClick(e) {
    e.preventDefault();
    if (selectMode) {
      toggleSelect(file.id);
    } else {
      setFocus(index);
    }
  }

  return (
    <div
      ref={setRefs}
      className={`fileItem ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
      style={{ "--ar": aspectRatio }}
    >
      <div className="thumbnail" style={{ position: 'relative' }}>
        {/* Actual Image - falls back to black background while loading, then fades in */}
        {isVisible && (
          imgSrc ? (
            <img
              src={imgSrc}
              alt={`${file.filename}`}
              crossOrigin="anonymous"
              className={isLoaded ? "loaded" : ""}
              onLoad={(e) => {
                setIsLoaded(true);
                if (e.target.naturalWidth && e.target.naturalHeight) {
                  setAspectRatio(e.target.naturalWidth / e.target.naturalHeight);
                }
              }}
              onError={() => {
                if (isVideo && imgSrc !== videoImage) {
                  setImgSrc(videoImage);
                } else {
                  setImgSrc(null);
                  setIsLoaded(true);
                }
              }}
            />
          ) : (
            <svg width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
          )
        )}
      </div>
      <div className="selectscreen" />
      <div className="selection-indicator">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div className="fileInfo">
        <p className="title">{file.filename}</p>
        <div className="info">
          <label>By <strong>{file.username}</strong></label>
          <p>
            {new Date(file.created_at)
              .toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
          </p>
        </div>
      </div>
    </div>
  );
}));

export default FileItem;
