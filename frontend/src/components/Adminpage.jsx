import React, { useState, useEffect } from "react";
import "./style/Adminpage.css";

function Adminpage({ currentUser }) {
  const [spaceUsed, setSpaceUsed] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSpaceUsed = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/space-used", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSpaceUsed(data);
      }
    } catch (err) {
      console.error("Error fetching space usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser === "admin") {
      fetchSpaceUsed();
    }
  }, [currentUser]);

  const handleCleanup = async () => {
    if (!window.confirm("Are you sure you want to perform cleanup? This will remove orphan files from S3.")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/cleanup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert("Cleanup failed: " + (error.detail || response.statusText));
        return;
      }

      alert("Cleanup performed successfully.");
      fetchSpaceUsed();
    } catch (err) {
      console.error(err);
      alert("Error performing cleanup");
    }
  };

  const handleRecountSizes = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/recount-sizes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert("Recount task failed: " + (error.detail || response.statusText));
        return;
      }

      alert("Recount task enqueued. Sizes will be updated in the background.");
    } catch (err) {
      console.error(err);
      alert("Error enqueuing recount task");
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    if (!bytes) return "Loading...";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="adminpage">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>

        {currentUser === "admin" ? (
          <div className="admin-controls">
            <div className="space-usage-card">
              <h3>Storage Infrastructure</h3>
              {loading ? (
                <p>Calculating storage usage...</p>
              ) : spaceUsed ? (
                <div className="usage-grid">
                  <div className="usage-item">
                    <span className="usage-label">Original Images</span>
                    <div className="usage-value">{formatBytes(spaceUsed.total)}</div>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">System Thumbnails</span>
                    <div className="usage-value">{formatBytes(spaceUsed.thumbs)}</div>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">Total Albums</span>
                    <div className="usage-value">{spaceUsed.total_albums || 0}</div>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">Total Files</span>
                    <div className="usage-value">{spaceUsed.total_files || 0}</div>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">Photos Missing Size</span>
                    <div className="usage-value">{spaceUsed.no_size_count || 0}</div>
                  </div>
                  <div className="usage-item total-usage">
                    <span className="usage-label">Total Cloud Storage</span>
                    <div className="total-value">
                      {formatBytes((spaceUsed.total || 0) + (spaceUsed.thumbs || 0))}
                    </div>
                  </div>
                </div>
              ) : (
                <p>Unable to retrieve storage data.</p>
              )}
            </div>

            <div className="action-section">
              <button className="recount-button" onClick={handleRecountSizes}>
                Recount Missing Sizes
              </button>
              <p className="cleanup-hint">
                Triggers a background process to fetch and record dimensions for photos that
                currently have no size data in the database.
              </p>
            </div>

            <div className="action-section">
              <button className="cleanup-button" onClick={handleCleanup}>
                Run S3 Garbage Collection
              </button>
              <p className="cleanup-hint">
                This process synchronizes physical S3 storage with the database by removing
                obsolete files that are no longer referenced in any albums.
              </p>
            </div>


          </div>
        ) : (
          <div className="denied-container">
            <h2>Access Restricted</h2>
            <p>You do not have the required administrative privileges to view this page.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Adminpage;
