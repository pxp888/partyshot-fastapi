import { useState, memo } from "react";
import FileItem from "./FileItem";
import "./Iconlist.css";

const Iconlist = memo(({
  photos,
  sortedPhotos,
  lastPhotoElementRef,
  selectMode,
  selected,
  setSelected,
  setFocus,
  isFetching,
  onDrop,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const toggleSelect = (id) => {
    setSelected((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onDrop(files);
    }
  };

  return (
    <div
      className={`albumFiles ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <p>Drop files to upload</p>
        </div>
      )}
      {photos.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
          <p className="helptext">No photos yet.</p>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Drag and drop photos here or use the Upload button to get started.</p>
        </div>
      ) : (
        <div className="fileList">
          {sortedPhotos.map((file, index) => {
            const isSelected = selected.includes(file.id);
            if (sortedPhotos.length === index + 1) {
              return (
                <FileItem
                  ref={lastPhotoElementRef}
                  key={file.id}
                  index={index}
                  file={file}
                  selectMode={selectMode}
                  isSelected={isSelected}
                  toggleSelect={toggleSelect}
                  setFocus={setFocus}
                />
              );
            } else {
              return (
                <FileItem
                  index={index}
                  key={file.id}
                  file={file}
                  selectMode={selectMode}
                  isSelected={isSelected}
                  toggleSelect={toggleSelect}
                  setFocus={setFocus}
                />
              );
            }
          })}
          {isFetching && (
            <div className="fetchingStatus">
              <p>Loading more...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default Iconlist;
