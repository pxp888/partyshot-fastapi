import { useEffect, useRef, useState } from "react";
import "./style/Imageview.css";
import blankImage from "../assets/blank.jpg";
import videoImage from "../assets/video.webp";

function Imageview({ files, focus, setFocus, deletedPhoto }) {
  // Reference to the container so we can compute click position
  const containerRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);
  const lastFocus = useRef(focus);

  const updateUrl = (newFocus, mode = "replace") => {
    if (!files || files.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const currentFocusId = params.get("focus");
    const targetId = newFocus === -1 ? null : String(files[newFocus]?.id);

    // Only update if the ID in the URL actually differs from what we want
    if (targetId === currentFocusId) {
      lastFocus.current = newFocus;
      return;
    }

    if (newFocus === -1) {
      params.delete("focus");
    } else if (targetId) {
      params.set("focus", targetId);
    }

    const newSearch = params.toString() ? "?" + params.toString() : "";
    const newUrl = window.location.pathname + newSearch + window.location.hash;

    // Use pushState only when opening from a closed state, otherwise replaceState
    if (mode === "push" || (lastFocus.current === -1 && newFocus !== -1)) {
      window.history.pushState({}, "", newUrl);
    } else {
      window.history.replaceState({}, "", newUrl);
    }

    lastFocus.current = newFocus;
  };

  const next = () => {
    if (!files || files.length === 0) return;
    const nextFocus = focus + 1 < files.length ? focus + 1 : 0;
    setFocus(nextFocus);
    updateUrl(nextFocus);
  };

  const previous = () => {
    if (!files || files.length === 0) return;
    const prevFocus = focus > 0 ? focus - 1 : files.length - 1;
    setFocus(prevFocus);
    updateUrl(prevFocus);
  };

  const hide = () => {
    setFocus(-1);
    updateUrl(-1);
  };

  /* ----------------------------------------------
   *  URL sync logic – now using file.id
   * ---------------------------------------------- */
  // 1️⃣  On mount & popstate
  useEffect(() => {
    if (!files) return;

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const focusId = params.get("focus");

      setFocus((prevFocus) => {
        if (!focusId) return -1;
        const targetIndex = files.findIndex((f) => String(f.id) === focusId);
        return targetIndex !== -1 ? targetIndex : prevFocus;
      });
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [files, setFocus]); // focus removed from dependencies

  // 2️⃣  Catch external focus changes (e.g. thumbnail clicks in parent)
  useEffect(() => {
    if (focus !== lastFocus.current) {
      updateUrl(focus);
    }
  }, [focus, files]);

  /* ----------------------------------------------
   *  Keyboard navigation remains unchanged
   * ---------------------------------------------- */
  useEffect(() => {
    if (focus === -1 || !files) return;

    const handler = (e) => {
      switch (e.key) {
        case "ArrowRight":
          next();
          break;
        case " ":
          next();
          e.preventDefault();
          break;
        case "ArrowLeft":
          previous();
          break;
        case "Escape":
          hide();
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
  }, [focus, files, setFocus, deletedPhoto, next, previous, hide]);

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
      previous();
    } else if (clickX > rightZone) {
      next();
    } else {
      hide();
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
            src={files[focus].mid_key || files[focus].s3_key || placeholder}
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
