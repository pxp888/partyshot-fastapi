import { useState } from "react";
import ListItem from "./ListItem";

function Listview({ photos, sortedPhotos, lastPhotoElementRef, selectMode, selected, setSelected, setFocus, isFetching, onDrop }) {
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
            className={`albumListview ${isDragging ? "dragging" : ""}`}
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
                <p>No files in this album.</p>
            ) : (
                <div className="listview">
                    {sortedPhotos.map((file, index) => {
                        if (sortedPhotos.length === index + 1) {
                            return (
                                <div ref={lastPhotoElementRef} key={file.id}>
                                    <ListItem
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
                                <ListItem
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

export default Listview;