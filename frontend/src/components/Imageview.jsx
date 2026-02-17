import { useEffect } from "react";
import "./style/Imageview.css";
import blankImage from '../assets/blank.jpg';

function Imageview({ files, focus, setFocus }) {
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

  return (
    <div className="imageView">
      <div className="primo">
        {/* <h2>{files[focus].filename}</h2>*/}
        {/* <p>{focus}</p>*/}
        <img
          src={files[focus].s3_key || blankImage}
          alt={`${files[focus].filename}`}
          onError={(e) => { e.target.src = blankImage; }}
        />
      </div>
    </div>
  );
}

export default Imageview;
