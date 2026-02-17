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

  // Click handler for the three zones
  const handleClick = (e) => {
    // If the viewer is hidden or there are no files, ignore clicks
    if (focus === -1 || !files) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left; // X coordinate relative to the container
    const width = rect.width;

    // Guard against zero width (unlikely but defensive)
    if (width === 0) return;

    const leftZone = width / 3;
    const rightZone = (2 * width) / 3;

    if (clickX < leftZone) {
      // Left zone – previous image
      if (focus > 0) setFocus(focus - 1);
    } else if (clickX > rightZone) {
      // Right zone – next image
      if (focus + 1 < files.length) setFocus(focus + 1);
    } else {
      // Center zone – hide the viewer
      setFocus(-1);
    }
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
    </div>
  );
}

export default Imageview;
