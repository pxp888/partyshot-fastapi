import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import "./style/Imageview.css";
import MessageBox from "./MessageBox";
import blankImage from "../assets/blank.jpg";
import videoImage from "../assets/video.webp";
import { saveAs } from "file-saver";

function Imageview({ files, focus, setFocus, deletedPhoto, onImport, userLoggedIn }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("copy URL");
  const [isSharing, setIsSharing] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastFocus = useRef(focus);
  const skipSwipe = useRef(false);
  const pinchStartDist = useRef(null);
  const initialScale = useRef(1);
  const lastTouch = useRef(null);
  const lastTap = useRef(0);

  const handlers = useSwipeable({
    onSwipeStart: (e) => {
      // If more than one finger is touching or we are already zoomed, skip swipe
      skipSwipe.current = e.event.touches?.length > 1 || scale > 1.1;
    },
    onSwipedLeft: () => !skipSwipe.current && scale <= 1.1 && next(),
    onSwipedRight: () => !skipSwipe.current && scale <= 1.1 && previous(),
    onSwipedDown: () => !skipSwipe.current && scale <= 1.1 && hide(),
    onSwipedUp: () => !skipSwipe.current && scale <= 1.1 && hide(),
    delta: 75, // Higher threshold to avoid accidental swipes during zoom
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

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
      window.history.pushState({ pushed: true }, "", newUrl);
    } else {
      window.history.replaceState(window.history.state, "", newUrl);
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
    if (window.history.state?.pushed) {
      window.history.back();
    } else {
      setFocus(-1);
    }
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
      // Reset zoom on image change
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [focus, files]);

  /* ----------------------------------------------
   *  Keyboard navigation remains unchanged
   * ---------------------------------------------- */
  useEffect(() => {
    if (focus === -1 || !files) return;

    const handler = (e) => {
      if (showDeleteConfirm) {
        if (e.key === "Escape") setShowDeleteConfirm(false);
        return;
      }
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
          setShowDeleteConfirm(true);
          break;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    focus,
    files,
    setFocus,
    deletedPhoto,
    next,
    previous,
    hide,
    showDeleteConfirm,
  ]);

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

  const handleImageClick = (e) => {
    e.stopPropagation();
    if (focus === -1 || !files) return;

    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - toggle zoom
      if (scale > 1.1) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setShowDetails(!showDetails);
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      pinchStartDist.current = dist;
      initialScale.current = scale;
      skipSwipe.current = true;
    } else if (e.touches.length === 1 && scale > 1.1) {
      lastTouch.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const newScale = Math.max(1, Math.min(5, (dist / pinchStartDist.current) * initialScale.current));
      setScale(newScale);
      if (newScale > 1.1) skipSwipe.current = true;
    } else if (e.touches.length === 1 && scale > 1.1 && lastTouch.current) {
      const dx = e.touches[0].pageX - lastTouch.current.x;
      const dy = e.touches[0].pageY - lastTouch.current.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouch.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchStartDist.current = null;
    }
    if (e.touches.length === 0) {
      lastTouch.current = null;
      // Keep skipSwipe true for a moment if we are zoomed to prevent accidental swipe on release
      if (scale > 1.1) {
        skipSwipe.current = true;
      } else {
        setTimeout(() => {
          if (scale <= 1.1) skipSwipe.current = false;
        }, 100);
      }
    }
  };

  const handleBackgroundClick = (e) => {
    if (focus === -1 || !files) return;
    hide();
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

  const handleCopy = (e) => {
    if (e) e.stopPropagation();
    const fullUrl = window.location.href;

    navigator.clipboard
      .writeText(fullUrl)
      .then(() => {
        setCopyFeedback("copied!");
        setTimeout(() => setCopyFeedback("copy URL"), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleShare = async (e) => {
    if (e) e.stopPropagation();
    const photo = files[focus];
    if (!photo || isSharing) return;

    if (!navigator.share) {
      handleCopy(e);
      return;
    }

    setIsSharing(true);
    const originalUrl = photo.s3_key;
    const shareData = {
      title: photo.filename || (isVideo ? "PartyShot Video" : "PartyShot Photo"),
    };

    try {
      // Fetch the original high-res media on demand
      if (originalUrl) {
        console.log("[Share Debug] Fetching original media for share...");
        const res = await fetch(originalUrl, { mode: "cors", cache: "default" });
        if (res.ok) {
          const blob = await res.blob();
          
          // Use the blob's type or fallback based on isVideo
          const mimeType = blob.type || (isVideo ? "video/mp4" : "image/jpeg");
          const defaultName = isVideo ? "video.mp4" : "photo.jpg";
          
          const file = new File([blob], photo.filename || defaultName, { 
            type: mimeType
          });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          } else {
            // Fallback to URL sharing if file sharing is not supported for this type
            shareData.url = window.location.href;
          }
        } else {
          shareData.url = window.location.href;
        }
      } else {
        shareData.url = window.location.href;
      }

      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[Share Debug] Share failed:", err);
        handleCopy(e); 
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const photo = files[focus];
    if (!photo || !photo.s3_key) return;

    // Standard fetch without credentials for compatibility with CORS * policies
    fetch(photo.s3_key, { mode: "cors" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        saveAs(blob, photo.filename || "download");
      })
      .catch((err) => {
        console.error("Download failed:", err);
      });
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  if (focus === -1) return null;

  return (
    <div
      className="imageView"
      {...handlers}
      onClick={handleBackgroundClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`imageActions ${showDetails ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="actionRow">
          <span className="actionIcon" onClick={handleDownload} title="Download">
            ⇓
          </span>
          <span 
            className={`actionIcon ${isSharing ? 'loading' : ''}`} 
            onClick={handleShare} 
            title={isSharing ? "Preparing..." : (copyFeedback === "copied!" ? "✓" : "⇪")}
          >
            {isSharing ? "..." : (copyFeedback === "copied!" ? "✓" : "⇪")}
          </span>
          {userLoggedIn && (
            <span 
              className="actionIcon" 
              onClick={(e) => {
                e.stopPropagation();
                if (files[focus]) onImport(files[focus].id);
              }} 
              title="Copy To"
            >
              ⇲
            </span>
          )}
          <span className="actionIcon delete" onClick={handleDelete} title="Delete">
            ⊘
          </span>
        </div>
      </div>
      <div className={`primo ${scale > 1.1 ? "zoomed" : ""}`} onClick={handleImageClick}>
        {isVideo ? (
          <video
            src={files[focus].mid_key || files[focus].s3_key || placeholder}
            controls
            autoPlay
            loop
            muted // Many browsers require muted for autoPlay
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transition: pinchStartDist.current ? "none" : "transform 0.1s ease-out",
              touchAction: "none",
            }}
          />
        ) : (
          <img
            src={files[focus].mid_key || files[focus].s3_key || placeholder}
            alt={`${files[focus].filename}`}
            crossOrigin="anonymous"
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transition: pinchStartDist.current ? "none" : "transform 0.1s ease-out",
              touchAction: "none",
            }}
            onError={(e) => {
              e.target.src = placeholder;
            }}
          />
        )}
      </div>
      <div
        className={`fileDetails ${showDetails ? "visible" : ""}`}
      >
        <div className="detailRow">
          <span className="filename">{files[focus].filename}</span>
        </div>
        <div className="detailRow">
          <span className="meta">
            Uploaded by <strong>{files[focus].username}</strong> on{" "}
            {new Date(files[focus].created_at)
              .toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
              .replace(/ (AM|PM)$/, (match) => match.toLowerCase())}
            {files[focus].size && ` • ${formatBytes(files[focus].size)}`}
          </span>
        </div>
      </div>
      {showDeleteConfirm && (
        <MessageBox
          title="Delete photo"
          message="Are you sure you want to delete this file?"
          type="confirm"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            deletedPhoto(files[focus].id);
            if (focus >= files.length - 1) {
              setFocus(focus - 1);
            }
          }}
        />
      )}
    </div>
  );
}

export default Imageview;
