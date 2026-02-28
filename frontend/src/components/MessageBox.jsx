import React from "react";
import "./style/MessageBox.css";

const MessageBox = ({ message, onClose, title = "Alert", type = "alert", onConfirm }) => {
    if (!message) return null;

    return (
        <div className="messagebox-back" onClick={onClose}>
            <div className="messagebox-container" onClick={(e) => e.stopPropagation()}>
                <h2>{title}</h2>
                <div className="messagebox-content">
                    {message}
                </div>
                <div className="messagebox-actions">
                    {type === "confirm" && (
                        <button className="btn outline" onClick={onClose}>
                            Cancel
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={() => {
                            if (type === "confirm" && onConfirm) {
                                onConfirm();
                            }
                            onClose();
                        }}
                    >
                        {type === "confirm" ? "Confirm" : "OK"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageBox;
