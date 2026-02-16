import React from "react";

function Adminpage(currentUser) {
  const handleCleanup = async () => {
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

      const data = await response.json();
      alert("Cleanup performed: " + JSON.stringify(data));
    } catch (err) {
      console.error(err);
      alert("Error performing cleanup");
    }
  };

  console.log(currentUser);

  return (
    <div>
      <h1>admin stuff</h1>
      {currentUser.currentUser === "admin" ? (
        <button onClick={handleCleanup}>cleanup</button>
      ) : (
        <h2>only for admin user</h2>
      )}
    </div>
  );
}

export default Adminpage;
