import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import "./style/Imageview.css";
import MessageBox from "./MessageBox";
import blankImage from "../assets/blank.jpg";
import videoImage from "../assets/video.webp";
import { saveAs } from "file-saver";

function Imageview({ files, focus, setFocus, deletedPhoto }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("copy URL");
  const [currentBlob, setCurrentBlob] = useState(null);
  const lastFocus = useRef(focus);
  const skipSwipe = useRef(false);

  const handlers = useSwipeable({
    onSwipeStart: (e) => {
      // If more than one finger is touching, it's likely a pinch/zoom gesture
      skipSwipe.current = e.event.touches?.length > 1;
    },
    onSwipedLeft: () => !skipSwipe.current && next(),
    onSwipedRight: () => !skipSwipe.current && previous(),
    onSwipedDown: () => !skipSwipe.current && hide(),
    onSwipedUp: () => !skipSwipe.current && hide(),
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

  // Pre-fetch blob for sharing to avoid activation timeout
  useEffect(() => {
    if (focus !== -1 && files && files[focus]) {
      // Use mid_key if available as it's smaller and likely cached, fallback to s3_key
      const url = files[focus].mid_key || files[focus].s3_key;
      if (url) {
        console.log(`[Share Debug] Pre-fetching image for share: ${url}`);
        fetch(url, { mode: "cors", cache: "default" })
          .then(res => {
            if (res.ok) return res.blob();
            throw new Error(`Fetch failed with status ${res.status}`);
          })
          .then(blob => {
            console.log(`[Share Debug] Pre-fetch successful: ${blob.type} (${blob.size} bytes)`);
            setCurrentBlob(blob);
          })
          .catch(err => {
            console.warn(`[Share Debug] Pre-fetch failed:`, err);
            setCurrentBlob(null);
          });
      }
    } else {
      setCurrentBlob(null);
    }
  }, [focus, files]);

  const handleImageClick = (e) => {
    e.stopPropagation();
    if (focus === -1 || !files) return;
    setShowDetails(!showDetails);
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
    if (!photo) return;

    if (!navigator.share) {
      console.log("[Share Debug] navigator.share not supported, falling back to copy");
      handleCopy(e);
      return;
    }

    console.log("[Share Debug] Share button clicked. Blob ready:", !!currentBlob);

    // Prepare share data
    const shareData = {
      title: photo.filename || "PartyShot Photo",
    };

    // If we have a pre-fetched blob, try to include it
    if (currentBlob) {
      const file = new File([currentBlob], photo.filename || "photo.jpg", { 
        type: currentBlob.type || "image/jpeg" 
      });
      
      const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });
      console.log("[Share Debug] canShare files assessment:", canShareFiles);

      if (canShareFiles) {
        shareData.files = [file];
        // We do NOT include url or text here to force apps to show the photo share sheet
        console.log("[Share Debug] Sharing as FILE");
      } else {
        console.log("[Share Debug] Falling back to URL due to canShare=false");
        shareData.url = window.location.href;
      }
    } else {
      console.log("[Share Debug] Falling back to URL because blob not ready");
      shareData.url = window.location.href;
    }

    try {
      console.log("[Share Debug] Calling navigator.share with payload:", Object.keys(shareData));
      await navigator.share(shareData);
      console.log("[Share Debug] navigator.share call completed");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[Share Debug] navigator.share error:", err);
        handleCopy(e); 
      } else {
        console.log("[Share Debug] User cancelled share menu");
      }
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
    <div className="imageView" {...handlers} onClick={handleBackgroundClick}>
      <div
        className={`imageActions ${showDetails ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="actionRow">
          <span className="actionIcon" onClick={handleDownload} title="Download">
            ⇓
          </span>
          <span className="actionIcon" onClick={handleShare} title={copyFeedback}>
            {copyFeedback === "copied!" ? "✓" : "⇪"}
          </span>
          <span className="actionIcon delete" onClick={handleDelete} title="Delete">
            ⊘
          </span>
        </div>
      </div>
      <div className="primo" onClick={handleImageClick}>
        {isVideo ? (
          <video
            src={files[focus].s3_key}
            controls
            autoPlay
            loop
            muted // Many browsers require muted for autoPlay
            onKeyDown={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={files[focus].mid_key || files[focus].s3_key || placeholder}
            alt={`${files[focus].filename}`}
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
