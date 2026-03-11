import { useState, useEffect, useRef } from "react";
import "./ListItem.css";
import blankImage from '../../assets/blank.jpg';
import videoImage from '../../assets/video.webp'; function ListItem({
  index,
  file,
  selectMode,
  selected,
  setSelected,
  setFocus,
}) {
  const isSelected = selected.includes(file.id);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const localRef = useRef();

  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv)$/i;
  const isVideo = videoExtensions.test(file.filename);
  const placeholder = isVideo ? videoImage : blankImage;

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
      ref={localRef}
      className={`listItem ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
    >
      {isSelected && <div className="listItemSelectscreen" />}
      <div className="listItemThumbnail">
        {isVisible && (
          <img
            src={file.thumb_key || placeholder}
            alt={`${file.filename}`}
            className={isLoaded ? "loaded" : ""}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              e.target.src = placeholder;
              setIsLoaded(true);
            }}
          />
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
}

export default ListItem;
