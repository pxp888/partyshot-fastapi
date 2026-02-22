import { useState } from "react";
import FileItem from "./FileItem";

function Iconlist({ photos, sortedPhotos, lastPhotoElementRef, selectMode, selected, setSelected, setFocus, isFetching, onDrop }) {
    const [isDragging, setIsDragging] = useState(false);

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
                <p>Drop files here to get started.</p>
            ) : (
                <div className="fileList">
                    {sortedPhotos.map((file, index) => {
                        if (sortedPhotos.length === index + 1) {
                            return (
                                <div ref={lastPhotoElementRef} key={file.id}>
                                    <FileItem
                                        index={index}
                                        file={file}
                                        selectMode={selectMode}
                                        selected={selected}
                                        setSelected={setSelected}
                                        setFocus={setFocus}
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <FileItem
                                    index={index}
                                    key={file.id}
                                    file={file}
                                    selectMode={selectMode}
                                    selected={selected}
                                    setSelected={setSelected}
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
}

export default Iconlist;