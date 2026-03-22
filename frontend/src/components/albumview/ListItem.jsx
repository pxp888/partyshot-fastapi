import { useState, useEffect, useRef, memo } from "react";
import "./ListItem.css";
import videoImage from '../../assets/video.webp'; 

const ListItem = memo(function ListItem({
  index,
  file,
  selectMode,
  isSelected,
  toggleSelect,
  setFocus,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const localRef = useRef();

  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv)$/i;
  const isVideo = videoExtensions.test(file.filename);
  const [imgSrc, setImgSrc] = useState(file.thumb_key || (isVideo ? videoImage : null));

  useEffect(() => {
    setImgSrc(file.thumb_key || (isVideo ? videoImage : null));
  }, [file.thumb_key, isVideo]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(localRef.current);
        }
      });
    }, {
      rootMargin: '100px',
    });

    if (localRef.current) {
      observer.observe(localRef.current);
    }

    return () => {
      if (localRef.current) {
        observer.unobserve(localRef.current);
      }
    };
  }, []);

  const formatSize = (bytes) => {
    if (bytes === 0 || bytes === null || bytes === undefined) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
      ref={localRef}
      className={`listItem ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
    >
      {isSelected && <div className="listItemSelectscreen" />}
      <div className="listItemThumbnail" style={{ position: 'relative' }}>
        {isVisible && (
          imgSrc ? (
            <img
              src={imgSrc}
              alt={`${file.filename}`}
              crossOrigin="anonymous"
              className={isLoaded ? "loaded" : ""}
              onLoad={() => setIsLoaded(true)}
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          )
        )}
      </div>
      <div className="listItemInfo">
        <div className="listItemInfoItem">
          <p className="listItemInfoItemTitle">{file.filename}</p>
        </div>
        <div className="listItemInfoItem">
          {/* <label>user</label>*/}
          <p>{file.username}</p>
        </div>
        <div className="listItemInfoItem">
          {/* <label>size</label>*/}
          <p>{formatSize(file.size)}</p>
        </div>
        <div className="listItemInfoItem">
          {/* <label>uploaded</label>*/}
          <p>
            {new Date(file.created_at)
              .toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
              .replace(/ (AM|PM)$/, (match) => match.toLowerCase())}
          </p>
        </div>
      </div>
    </div>
  );
});

export default ListItem;
