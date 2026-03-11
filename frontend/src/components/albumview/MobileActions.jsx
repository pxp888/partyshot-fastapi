import React, { useState, useEffect } from "react";
import "./MobileActions.css";

const MobileActions = ({
  selectMode,
  setSelectMode,
  cancelSelect,
  selectAll,
  selectNone,
  downloadSelected,
  deleteSelected,
  downloadAll,
  handleDeleteAlbum,
  toggleSubscription,
  handleViewTypeChange,
  viewType,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  userLoggedIn,
  isOwner,
  album,
  uploader,
}) => {
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Close drawer when clicking backdrop
  const closeDrawer = () => setActiveDrawer(null);

  const toggleDrawer = (drawer) => {
    if (activeDrawer === drawer) {
      setActiveDrawer(null);
    } else {
      setActiveDrawer(drawer);
    }
  };

  if (!userLoggedIn && !album.open) return null;

  return (
    <div className={`mobile-actions-system ${activeDrawer ? "drawer-open" : ""}`}>
      {/* Backdrop for Drawers */}
      <div className="mobile-drawer-backdrop" onClick={closeDrawer} />

      {/* Drawers Content */}
      <div className={`mobile-drawer ${activeDrawer ? "is-active" : ""}`}>
        <div className="drawer-handle" onClick={closeDrawer} />
        <div className="drawer-content">
          
          {/* VIEW DRAWER */}
          {activeDrawer === "view" && (
            <div className="drawer-pane">
              <h3>View & Sort</h3>
              <div className="view-types-row">
                <button 
                  className={`view-btn ${viewType === 'list' ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange("list")}
                >☰ List</button>
                <button 
                  className={`view-btn ${viewType === 'icon' ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange("icon")}
                >▦ Icons</button>
                <button 
                  className={`view-btn ${viewType === 'grid' ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange("grid")}
                >⊞ Grid</button>
              </div>
              <div className="sort-controls-row">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="mobile-select"
                >
                  <option value="created_at">Sort by Date</option>
                  <option value="filename">Sort by Name</option>
                  <option value="username">Sort by User</option>
                  <option value="size">Sort by Size</option>
                </select>
                <button
                  className="sort-order-btn"
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                  {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              </div>
            </div>
          )}


          {/* ALBUM DRAWER */}
          {activeDrawer === "album" && (
            <div className="drawer-pane">
              <h3>Album Management</h3>
              <div className="action-list">
                <button onClick={() => { downloadAll(); closeDrawer(); }} className="list-action-btn" disabled={!userLoggedIn}>
                  <span className="icon">⇓</span>
                  <div className="text-group">
                    <strong>Download All</strong>
                    <span>Get entire album as ZIP</span>
                  </div>
                </button>

                {isOwner ? (
                  <button onClick={() => { handleDeleteAlbum(); closeDrawer(); }} className="list-action-btn danger">
                    <span className="icon">⊘</span>
                    <div className="text-group">
                      <strong>Delete Album</strong>
                      <span>Permanently remove this album</span>
                    </div>
                  </button>
                ) : (
                  <button onClick={toggleSubscription} className="list-action-btn" disabled={!userLoggedIn}>
                    <span className="icon">{album.subscribed ? "★" : "☆"}</span>
                    <div className="text-group">
                      <strong>{album.subscribed ? "Subscribed" : "Subscribe"}</strong>
                      <span>{album.subscribed ? "Click to unsubscribe" : "Follow this album"}</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PERSISTENT TOOLBAR */}
      <nav className={`mobile-toolbar ${selectMode ? 'selection-mode' : ''}`}>
        {selectMode ? (
          <>
            <button className="toolbar-tab selection-tab" onClick={selectAll}>
              <span className="tab-icon">✓✓</span>
              <span className="tab-label">All</span>
            </button>
            <button className="toolbar-tab selection-tab" onClick={selectNone}>
              <span className="tab-icon">◻</span>
              <span className="tab-label">None</span>
            </button>
            <button className="toolbar-tab selection-tab" onClick={downloadSelected} disabled={!userLoggedIn}>
              <span className="tab-icon">↓</span>
              <span className="tab-label">Get</span>
            </button>
            <button className="toolbar-tab selection-tab" onClick={deleteSelected} disabled={!userLoggedIn}>
              <span className="tab-icon">⊘</span>
              <span className="tab-label">Del</span>
            </button>
            <div className="toolbar-divider" />
            <button className="toolbar-tab selection-tab cancel" onClick={() => { cancelSelect(); closeDrawer(); }}>
              <span className="tab-icon">✕</span>
              <span className="tab-label">Exit</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className={`toolbar-tab ${activeDrawer === 'view' ? 'active' : ''}`} 
              onClick={() => toggleDrawer('view')}
            >
              <span className="tab-icon">▦</span>
              <span className="tab-label">View</span>
            </button>

            <div className="toolbar-tab uploader-tab">
              {uploader}
              <span className="tab-label">Upload</span>
            </div>

            <button 
              className={`toolbar-tab ${activeDrawer === 'select' ? 'active' : ''}`} 
              onClick={() => {
                setSelectMode(true);
              }}
              disabled={!userLoggedIn}
            >
              <span className="tab-icon">⬚</span>
              <span className="tab-label">Select</span>
            </button>

            <button 
              className={`toolbar-tab ${activeDrawer === 'album' ? 'active' : ''}`} 
              onClick={() => toggleDrawer('album')}
            >
              <span className="tab-icon">⑉</span>
              <span className="tab-label">Album</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export default MobileActions;
