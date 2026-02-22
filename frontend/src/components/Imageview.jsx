import { useEffect, useRef, useState } from "react";
import "./style/Imageview.css";
import blankImage from "../assets/blank.jpg";
import videoImage from "../assets/video.webp";

function Imageview({ files, focus, setFocus, deletedPhoto }) {
  // Reference to the container so we can compute click position
  const containerRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);
  const lastFocus = useRef(focus);

  /* ----------------------------------------------
   *  URL sync logic – now using file.id
   * ---------------------------------------------- */
  // 1️⃣  On mount & popstate: read focus from query string (file.id)
  useEffect(() => {
    if (!files) return;

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const focusId = params.get("focus");
      if (!focusId) {
        setFocus(-1);
        return;
      }

      const targetIndex = files.findIndex((f) => String(f.id) === focusId);
      if (targetIndex !== -1) {
        setFocus(targetIndex);
      }
    };

    // Initial sync
    syncFromUrl();

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [files, setFocus]); // Removed 'focus' dependency

  // 2️⃣  Whenever focus changes, update the query string
  useEffect(() => {
    if (!files || files.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const currentFocusId = params.get("focus");

    if (focus === -1) {
      if (currentFocusId) {
        params.delete("focus");
        const newUrl =
          window.location.pathname +
          (params.toString() ? "?" + params.toString() : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);
      }
    } else {
      const id = files[focus]?.id;
      if (id !== undefined && String(id) !== currentFocusId) {
        params.set("focus", String(id));
        const newUrl =
          window.location.pathname +
          "?" +
          params.toString() +
          window.location.hash;

        if (lastFocus.current === -1) {
          window.history.pushState({}, "", newUrl);
        } else {
          window.history.replaceState({}, "", newUrl);
        }
      }
    }
    lastFocus.current = focus;
  }, [focus, files]);

  /* ----------------------------------------------
   *  Keyboard navigation remains unchanged
   * ---------------------------------------------- */
  useEffect(() => {
    if (focus === -1 || !files) return;

    const handler = (e) => {
      switch (e.key) {
        case "ArrowRight":
          if (focus + 1 < files.length) setFocus(focus + 1);
          else setFocus(0);
          break;
        case " ":
          if (focus + 1 < files.length) setFocus(focus + 1);
          else setFocus(0);
          e.preventDefault();
          break;
        case "ArrowLeft":
          if (focus > 0) setFocus(focus - 1);
          else setFocus(files.length - 1);
          break;
        case "Escape":
          setFocus(-1);
          break;
        case "Delete":
        case "Backspace":
          if (window.confirm("Are you sure you want to delete this file?")) {
            deletedPhoto(files[focus].id);
            if (focus >= files.length - 1) {
              setFocus(focus - 1);
            }
          }
          break;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focus, files, setFocus, deletedPhoto]);

  // Handle temporary visibility of file details when image changes
  useEffect(() => {
    if (focus !== -1) {
      setShowDetails(true);
      const timer = setTimeout(() => {
        setShowDetails(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [focus]);

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

  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv)$/i;
  const isVideo = focus !== -1 && videoExtensions.test(files[focus].filename);
  const placeholder = isVideo ? videoImage : blankImage;

  if (focus === -1) return null;

  return (
    <div className="imageView" ref={containerRef} onClick={handleClick}>
      <div className="primo">
        {isVideo ? (
          <video
            src={files[focus].s3_key}
            controls
            autoPlay
            loop
            muted // Many browsers require muted for autoPlay
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={files[focus].s3_key || placeholder}
            alt={`${files[focus].filename}`}
            // onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              e.target.src = placeholder;
            }}
          />
        )}
      </div>
      <div
        className={`fileDetails ${showDetails ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
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
