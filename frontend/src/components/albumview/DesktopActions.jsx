import React, { useState, useEffect, memo } from "react";
import QRHover from "./QRHover";
import "./DesktopActions.css";

const DesktopActions = memo(({
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
  selected,
  uploader,
  setShowImporter,
}) => {
  const [activePane, setActivePane] = useState(null);

  // Synchronize selectMode with open pane
  useEffect(() => {
    if (selectMode) {
      setActivePane("select");
    } else if (activePane === "select") {
      setActivePane(null);
    }
  }, [selectMode]);

  const togglePane = (pane) => {
    if (selectMode && pane !== 'select') {
      cancelSelect();
    }
    
    if (pane === 'select' && selectMode) {
      cancelSelect();
      return;
    }

    setActivePane(activePane === pane ? null : pane);
  };

  return (
    <div className="desktop-actions-system">
      <nav className={`desktop-toolbar ${selectMode ? 'selection-mode' : ''}`}>
        <div className="toolbar-left">
          <div className={`dt-tab dt-uploader-tab ${(!userLoggedIn && !album.open) ? 'disabled' : ''}`}>
            {uploader}
          </div>

          <QRHover text="Share">
            <div className="dt-tab">
              <span className="dt-tab-icon">⇪</span>
              <span className="dt-tab-label">Share</span>
            </div>
          </QRHover>

          <button 
            className={`dt-tab ${selectMode ? 'active' : ''}`} 
            onClick={() => {
              if (!selectMode) {
                setSelectMode(true);
              } else {
                togglePane('select');
              }
            }} 
            disabled={!userLoggedIn}
          >
            <span className="dt-tab-icon">⬚</span>
            <span className="dt-tab-label">Select</span>
          </button>

          {!selectMode && (
            <>
              <div className="dt-divider" />

              <button className="dt-tab" onClick={downloadAll} disabled={!userLoggedIn}>
                <span className="dt-tab-icon">⇓</span>
                <span className="dt-tab-label">ZIP All</span>
              </button>

              {isOwner ? (
                <button className="dt-tab dt-tab-danger" onClick={handleDeleteAlbum}>
                  <span className="dt-tab-icon">⊘</span>
                  <span className="dt-tab-label">Delete</span>
                </button>
              ) : (
                <button className={`dt-tab ${album.subscribed ? 'active' : ''}`} onClick={toggleSubscription} disabled={!userLoggedIn}>
                  <span className="dt-tab-icon">{album.subscribed ? "★" : "☆"}</span>
                  <span className="dt-tab-label">{album.subscribed ? "Sub'd" : "Follow"}</span>
                </button>
              )}
            </>
          )}
        </div>

        <div className="toolbar-right">
          <button 
            className={`dt-tab ${viewType === 'list' ? 'active' : ''}`}
            onClick={() => handleViewTypeChange("list")}
          >
            <span className="dt-tab-icon">☰</span>
            <span className="dt-tab-label">List</span>
          </button>
          <button 
            className={`dt-tab ${viewType === 'icon' ? 'active' : ''}`}
            onClick={() => handleViewTypeChange("icon")}
          >
            <span className="dt-tab-icon">▦</span>
            <span className="dt-tab-label">Icons</span>
          </button>
          <button 
            className={`dt-tab ${viewType === 'grid' ? 'active' : ''}`}
            onClick={() => handleViewTypeChange("grid")}
          >
            <span className="dt-tab-icon">⊞</span>
            <span className="dt-tab-label">Large</span>
          </button>
          
          <div className="dt-divider" />
          
          <button 
            className={`dt-tab ${activePane === 'sort' ? 'active' : ''}`} 
            onClick={() => togglePane('sort')}
          >
            <span className="dt-tab-icon">⇅</span>
            <span className="dt-tab-label">Sort</span>
          </button>
        </div>
      </nav>

      {/* Action Pane Area */}
      <div className={`desktop-pane-container ${activePane ? "is-active" : ""}`}>
        <div className="pane-content" style={activePane === 'sort' ? { paddingRight: '4rem' } : {}}>
          {activePane === "select" && (
            <div className="action-pane">
              <button className="pane-item" onClick={selectAll}>
                <span className="item-icon">✓✓</span>
                <span className="item-label">All</span>
              </button>
              <button className="pane-item" onClick={selectNone}>
                <span className="item-icon">◻</span>
                <span className="item-label">None</span>
              </button>
              <button className="pane-item" onClick={downloadSelected} disabled={!userLoggedIn}>
                <span className="item-icon">↓</span>
                <span className="item-label">Get</span>
              </button>
              <button className="pane-item" onClick={() => setShowImporter(true)} disabled={!userLoggedIn || selected.length === 0}>
                <span className="item-icon">⇲</span>
                <span className="item-label">Copy To</span>
              </button>
              <button className="pane-item" onClick={deleteSelected} disabled={!userLoggedIn}>
                <span className="item-icon">⊘</span>
                <span className="item-label">Del</span>
              </button>
            </div>
          )}

          {activePane === "sort" && (
            <div className="action-pane pane-right">
              <button 
                className={`pane-item ${sortField === 'created_at' ? 'active' : ''}`} 
                onClick={() => setSortField('created_at')}
              >
                <span className="item-icon">12</span>
                <span className="item-label">Date</span>
              </button>
              <button 
                className={`pane-item ${sortField === 'filename' ? 'active' : ''}`} 
                onClick={() => setSortField('filename')}
              >
                <span className="item-icon">Aa</span>
                <span className="item-label">Name</span>
              </button>
              <button 
                className={`pane-item ${sortField === 'username' ? 'active' : ''}`} 
                onClick={() => setSortField('username')}
              >
                <span className="item-icon">☺</span>
                <span className="item-label">User</span>
              </button>
              <button 
                className={`pane-item ${sortField === 'size' ? 'active' : ''}`} 
                onClick={() => setSortField('size')}
              >
                <span className="item-icon">▤</span>
                <span className="item-label">Size</span>
              </button>
              
              <div className="pane-divider" />
              
              <button 
                className={`pane-item ${sortOrder === 'asc' ? 'active' : ''}`} 
                onClick={() => setSortOrder('asc')}
              >
                <span className="item-icon">↑</span>
                <span className="item-label">Asc</span>
              </button>
              <button 
                className={`pane-item ${sortOrder === 'desc' ? 'active' : ''}`} 
                onClick={() => setSortOrder('desc')}
              >
                <span className="item-icon">↓</span>
                <span className="item-label">Desc</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DesktopActions;
