import { useState, memo } from "react";
import FileItem from "./FileItem";
import "./Gridview.css";

const Gridview = memo(({
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
            className={`albumFiles gridview ${isDragging ? "dragging" : ""}`}
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
                <p className="helptext">Drop files here to get started.</p>
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

export default Gridview;
