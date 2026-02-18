import React, { useState } from "react";

function AlbumRenamer({ album, onRename, onCancel }) {
    const [newName, setNewName] = useState(album.name);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newName.trim() && newName !== album.name) {
            onRename(newName);
        } else {
            onCancel();
        }
    };

    return (
        <div className="album-renamer">
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    className="renamer-input"
                    style={{
                        padding: "4px 8px",
                        fontSize: "1rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: "#fff",
                        color: "#333"
                    }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: "4px 12px" }}>
                    Submit
                </button>
                <button type="button" onClick={onCancel} className="btn" style={{ padding: "4px 12px" }}>
                    Cancel
                </button>
            </form>
        </div>
    );
}

export default AlbumRenamer;