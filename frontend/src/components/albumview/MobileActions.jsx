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

  // Synchronize selectMode with open drawer
  useEffect(() => {
    if (selectMode) {
      setActiveDrawer("select");
    } else if (activeDrawer === "select") {
      setActiveDrawer(null);
    }
  }, [selectMode]);

  const toggleDrawer = (drawer) => {
    // If we're in select mode and touch anything other than the current select drawer, exit select mode
    if (selectMode && drawer !== 'select') {
      cancelSelect();
    }
    
    // If we touch 'select' while already in select mode, exit select mode
    if (drawer === 'select' && selectMode) {
      cancelSelect();
      return;
    }

    setActiveDrawer(activeDrawer === drawer ? null : drawer);
  };

  const cycleSortField = () => {
    const fields = ["created_at", "filename", "username", "size"];
    const currentIndex = fields.indexOf(sortField);
    const nextIndex = (currentIndex + 1) % fields.length;
    setSortField(fields[nextIndex]);
  };

  const getSortFieldLabel = () => {
    switch (sortField) {
      case "created_at": return "Date";
      case "filename": return "Name";
      case "username": return "User";
      case "size": return "Size";
      default: return "Sort";
    }
  };

  if (!userLoggedIn && !album.open) return null;

  return (
    <div className={`mobile-actions-system ${activeDrawer && activeDrawer !== 'select' ? "drawer-open" : ""}`}>
      
      {/* Drawer Backdrop - Only for View/Album, allows photo interaction in Select mode */}
      {activeDrawer && activeDrawer !== 'select' && (
        <div className="mobile-drawer-backdrop" onClick={closeDrawer} />
      )}

      {/* DRAWERS */}
      <div className={`mobile-drawer ${activeDrawer ? "is-active" : ""}`}>
        {/* Hide handle for select mode since it shouldn't be dragged down manually */}
        {activeDrawer !== 'select' && <div className="drawer-handle" onClick={closeDrawer} />}
        <div className="drawer-content">
          
          {/* VIEW DRAWER */}
          {activeDrawer === "view" && (
            <div className="drawer-pane">
              <div className="toolbar-like-layout">
                <button 
                  className={`toolbar-tab ${viewType === 'list' ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange("list")}
                >
                  <span className="tab-icon">☰</span>
                  <span className="tab-label">List</span>
                </button>
                <button 
                  className={`toolbar-tab ${viewType === 'icon' ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange("icon")}
                >
                  <span className="tab-icon">▦</span>
                  <span className="tab-label">Icons</span>
                </button>
                <button 
                  className={`toolbar-tab ${viewType === 'grid' ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange("grid")}
                >
                  <span className="tab-icon">⊞</span>
                  <span className="tab-label">Grid</span>
                </button>
                <div className="toolbar-divider" />
                <button className="toolbar-tab" onClick={cycleSortField}>
                  <span className="tab-icon">⇅</span>
                  <span className="tab-label">{getSortFieldLabel()}</span>
                </button>
                <button className="toolbar-tab" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                  <span className="tab-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  <span className="tab-label">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                </button>
              </div>
            </div>
          )}

          {/* SELECT DRAWER */}
          {activeDrawer === "select" && (
            <div className="drawer-pane">
              <div className="toolbar-like-layout">
                <button className="toolbar-tab" onClick={selectAll}>
                  <span className="tab-icon">✓✓</span>
                  <span className="tab-label">All</span>
                </button>
                <button className="toolbar-tab" onClick={selectNone}>
                  <span className="tab-icon">◻</span>
                  <span className="tab-label">None</span>
                </button>
                <button className="toolbar-tab" onClick={downloadSelected} disabled={!userLoggedIn}>
                  <span className="tab-icon">↓</span>
                  <span className="tab-label">Get</span>
                </button>
                <button className="toolbar-tab" onClick={deleteSelected} disabled={!userLoggedIn}>
                  <span className="tab-icon">⊘</span>
                  <span className="tab-label">Del</span>
                </button>
              </div>
            </div>
          )}

          {/* ALBUM DRAWER */}
          {activeDrawer === "album" && (
            <div className="drawer-pane">
              <div className="toolbar-like-layout">
                <button className="toolbar-tab" onClick={() => { downloadAll(); closeDrawer(); }} disabled={!userLoggedIn}>
                  <span className="tab-icon">⇓</span>
                  <span className="tab-label">ZIP All</span>
                </button>
                <div className="toolbar-divider" />
                {isOwner ? (
                  <button className="toolbar-tab" onClick={() => { handleDeleteAlbum(); closeDrawer(); }}>
                    <span className="tab-icon">⊘</span>
                    <span className="tab-label">Delete</span>
                  </button>
                ) : (
                  <button className="toolbar-tab" onClick={toggleSubscription} disabled={!userLoggedIn}>
                    <span className="tab-icon">{album.subscribed ? "★" : "☆"}</span>
                    <span className="tab-label">{album.subscribed ? "Sub'd" : "Follow"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PERSISTENT MAIN TOOLBAR */}
      <nav className={`mobile-toolbar ${selectMode ? 'selection-mode' : ''}`}>
        <div className="toolbar-tab uploader-tab">
          {uploader}
          <span className="tab-label">Upload</span>
        </div>

        <button 
          className={`toolbar-tab ${activeDrawer === 'view' ? 'active' : ''}`} 
          onClick={() => toggleDrawer('view')}
        >
          <span className="tab-icon">▦</span>
          <span className="tab-label">View</span>
        </button>

        <button 
          className={`toolbar-tab ${selectMode ? 'active' : ''}`} 
          onClick={() => {
            if (!selectMode) {
              setSelectMode(true);
            } else {
              toggleDrawer('select');
            }
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
      </nav>
    </div>
  );
};

export default MobileActions;
