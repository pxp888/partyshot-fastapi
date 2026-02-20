import { useEffect, useRef } from "react";
import "./style/Imageview.css";
import blankImage from "../assets/blank.jpg";

function Imageview({ files, focus, setFocus }) {
  // Reference to the container so we can compute click position
  const containerRef = useRef(null);

  // Keyboard navigation remains unchanged
  useEffect(() => {
    const handler = (e) => {
      if (!files) return;

      switch (e.key) {
        case "ArrowRight":
          if (focus + 1 < files.length) setFocus(focus + 1);
          break;
        case " ":
          if (focus + 1 < files.length) setFocus(focus + 1);
          break;
        case "ArrowLeft":
          if (focus > 0) setFocus(focus - 1);
          break;
        case "Escape":
          setFocus(-1);
          break;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focus, files, setFocus]);

  const handleClick = (e) => {
    if (focus === -1 || !files) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (width === 0) return;

    const leftZone = width / 3;
    const rightZone = (2 * width) / 3;

    if (clickX < leftZone) {
      if (focus > 0) setFocus(focus - 1);
    } else if (clickX > rightZone) {
      if (focus + 1 < files.length) setFocus(focus + 1);
    } else {
      setFocus(-1);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="imageView" ref={containerRef} onClick={handleClick}>
      <div className="primo">
        <img
          src={files[focus].s3_key || blankImage}
          alt={`${files[focus].filename}`}
          onError={(e) => {
            e.target.src = blankImage;
          }}
        />
      </div>
      <div className="fileDetails" onClick={(e) => e.stopPropagation()}>
        {/* <div className="fileDetails"> */}
        <div className="detailRow">
          <span className="filename">{files[focus].filename}</span>
        </div>
        <div className="detailRow">
          <span className="meta">
            Uploaded by <strong>{files[focus].username}</strong> on{" "}
            {new Date(files[focus].created_at).toLocaleString()}
            {files[focus].size && ` • ${formatBytes(files[focus].size)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Imageview;
