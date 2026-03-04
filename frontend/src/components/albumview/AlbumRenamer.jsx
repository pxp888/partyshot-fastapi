import React, { useState, useEffect, useRef } from "react";

function AlbumRenamer({ album, onRename, onCancel }) {
    const [newName, setNewName] = useState(album.name);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (newName.trim() && newName !== album.name) {
            onRename(newName);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSubmit();
        } else if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <div className="album-renamer">
            <form onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className="renamer-input"
                />
            </form>
        </div>
    );
}

export default AlbumRenamer;