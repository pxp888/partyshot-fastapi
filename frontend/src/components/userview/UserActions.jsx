import React from "react";
import "./UserActions.css";

const UserActions = ({
  username,
  currentUser,
  handleCreateAlbum,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  sendJsonMessage,
}) => {
  const isOwner = username === currentUser;

  const cycleSortField = () => {
    const fields = ["created_at", "name", "username"];
    const currentIndex = fields.indexOf(sortField === "my_photos" ? "created_at" : sortField);
    const nextIndex = (currentIndex + 1) % fields.length;
    setSortField(fields[nextIndex]);
  };

  const getSortFieldLabel = () => {
    switch (sortField) {
      case "created_at": return "Date";
      case "name": return "Name";
      case "username": return "User";
      case "my_photos": return "Date";
      default: return "Sort";
    }
  };

  const toggleMyPhotos = () => {
    if (sortField === "my_photos") {
      setSortField("created_at");
      sendJsonMessage({
        action: "getAlbums",
        payload: { target: username },
      });
    } else {
      setSortField("my_photos");
      sendJsonMessage({
        action: "getAlbumsWithUserPhotos",
      });
    }
  };

  return (
    <div className="user-actions-system">
      <nav className="user-toolbar">
        <div className="toolbar-left">
          {isOwner && (
            <button className="dt-tab" onClick={handleCreateAlbum}>
              <span className="dt-tab-icon">+</span>
              <span className="dt-tab-label">Create</span>
            </button>
          )}

          {currentUser && (
            <button
              className={`dt-tab ${sortField === 'my_photos' ? 'active' : ''}`}
              onClick={toggleMyPhotos}
            >
              <span className="dt-tab-icon">□</span>
              <span className="dt-tab-label">
                {sortField === 'my_photos' ? 'my albums' : 'my photos'}
              </span>
            </button>
          )}        </div>

        <div className="toolbar-right">
          <button 
            className="dt-tab" 
            onClick={cycleSortField}
            disabled={sortField === "my_photos"}
          >
            <span className="dt-tab-icon">⇅</span>
            <span className="dt-tab-label">{getSortFieldLabel()}</span>
          </button>
          
          <button 
            className="dt-tab" 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            disabled={sortField === "my_photos"}
          >
            <span className="dt-tab-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            <span className="dt-tab-label">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default UserActions;
