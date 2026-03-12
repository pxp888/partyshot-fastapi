import React, { useState, useEffect } from "react";
import QRHover from "./QRHover";
import "./DesktopActions.css";

const DesktopActions = ({
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

  return (
    <div className="desktop-actions-system">
      <nav className={`desktop-toolbar ${selectMode ? 'selection-mode' : ''}`}>
        <div className="toolbar-left">
          <div className={`dt-tab dt-uploader-tab ${!userLoggedIn ? 'disabled' : ''}`}>
            {uploader}
            <span className="dt-tab-icon">↑</span>
            <span className="dt-tab-label">Upload</span>
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
        </div>

        <div className="toolbar-right">
          <button 
            className={`dt-tab ${viewType === 'list' ? 'active' : ''}`}
            onClick={() => handleViewTypeChange("list")}
          >
            <span className="dt-tab-icon">☰</span>
            <span className="tab-label">List</span>
          </button>
          <button 
            className={`dt-tab ${viewType === 'icon' ? 'active' : ''}`}
            onClick={() => handleViewTypeChange("icon")}
          >
            <span className="dt-tab-icon">▦</span>
            <span className="tab-label">Icons</span>
          </button>
          <button 
            className={`dt-tab ${viewType === 'grid' ? 'active' : ''}`}
            onClick={() => handleViewTypeChange("grid")}
          >
            <span className="dt-tab-icon">⊞</span>
            <span className="tab-label">Grid</span>
          </button>
          
          <div className="dt-divider" />
          
          <button className="dt-tab" onClick={cycleSortField}>
            <span className="dt-tab-icon">⇅</span>
            <span className="dt-tab-label">{getSortFieldLabel()}</span>
          </button>
          <button className="dt-tab" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
            <span className="dt-tab-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            <span className="dt-tab-label">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </button>
        </div>
      </nav>

      {/* Action Pane Area */}
      <div className={`desktop-pane-container ${activePane ? "is-active" : ""}`}>
        <div className="pane-content">
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
              <button className="pane-item" onClick={deleteSelected} disabled={!userLoggedIn}>
                <span className="item-icon">⊘</span>
                <span className="item-label">Del</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopActions;
