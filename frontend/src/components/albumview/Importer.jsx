import React, { useState, useEffect } from "react";
import { useSocket } from "../WebSocketContext";
import { useMessage } from "../MessageBoxContext";
import "./Importer.css";

const Importer = ({ selected, onClose, currentUser, onImportComplete }) => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { sendJsonMessage, lastJsonMessage } = useSocket();
  const { showMessage } = useMessage();

  useEffect(() => {
    if (currentUser) {
      sendJsonMessage({
        action: "getAlbums",
        payload: { target: currentUser },
      });
    } else {
      setLoading(false);
    }
  }, [sendJsonMessage, currentUser]);

  useEffect(() => {
    if (!lastJsonMessage) return;
    
    const { action, payload } = lastJsonMessage;
    
    if (action === "getAlbums") {
      setAlbums(payload?.albums || []);
      setLoading(false);
    } else if (action === "createAlbum") {
      if (isCreatingNew && payload && isImporting) {
        const targetCode = typeof payload === 'string' ? payload : payload.code;
        handleImport(targetCode);
      }
    } else if (action === "importSuccess") {
      setIsImporting(false);
      showMessage(`Successfully imported ${payload} photos`, "Success");
      if (onImportComplete) onImportComplete();
      onClose();
    }
  }, [lastJsonMessage, isCreatingNew, isImporting, showMessage, onClose, onImportComplete]);

  const handleCreateAndImport = () => {
    if (!newAlbumName.trim()) {
      showMessage("Please enter an album name.", "Error");
      return;
    }
    setIsImporting(true);
    sendJsonMessage({
      action: "createAlbum",
      payload: { album_name: newAlbumName },
    });
  };

  const handleImport = (targetCode) => {
    const code = targetCode || selectedAlbum;
    if (!code && !isCreatingNew) {
      showMessage("Please select an album to import to.", "Error");
      return;
    }

    setIsImporting(true);
    sendJsonMessage({
      action: "importPhotos",
      payload: {
        photo_ids: selected,
        target_album_code: code
      }
    });
  };

  return (
    <div className="importer-modal-backdrop" onClick={onClose}>
      <div className="importer-modal-content" onClick={e => e.stopPropagation()}>
        <h2>Copy Photos</h2>
        <p>Select an album to copy {selected.length} photos into.</p>
        
        {loading ? (
          <p>Loading your albums...</p>
        ) : (
          <div className="importer-options">
            <label className="importer-option">
              <input 
                type="radio" 
                name="albumSelection" 
                checked={isCreatingNew}
                onChange={() => setIsCreatingNew(true)}
              />
              <span>Create New Album</span>
            </label>
            
            {isCreatingNew && (
              <div className="importer-new-album-input">
                <input 
                  type="text" 
                  placeholder="New Album Name" 
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="importer-album-list">
              {albums.filter(a => a.username === currentUser || a.open).map(album => (
                <label key={album.code} className="importer-option">
                  <input 
                    type="radio" 
                    name="albumSelection" 
                    checked={!isCreatingNew && selectedAlbum === album.code}
                    onChange={() => {
                      setIsCreatingNew(false);
                      setSelectedAlbum(album.code);
                    }}
                  />
                  <span>{album.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="importer-actions">
          <button className="importer-btn cancel" onClick={onClose} disabled={isImporting}>Cancel</button>
          <button 
            className="importer-btn import" 
            onClick={isCreatingNew ? handleCreateAndImport : () => handleImport()}
            disabled={isImporting || loading}
          >
            {isImporting ? "Copying..." : "Copy To"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Importer;
