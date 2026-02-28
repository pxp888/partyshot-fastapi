import React, { createContext, useContext, useState } from "react";
import MessageBox from "./MessageBox";

const MessageBoxContext = createContext(null);

export const MessageBoxProvider = ({ children }) => {
    const [modal, setModal] = useState({
        show: false,
        message: "",
        title: "Alert",
        type: "alert",
        onConfirm: null,
    });

    const showMessage = (message, title = "Alert") => {
        setModal({
            show: true,
            message,
            title,
            type: "alert",
            onConfirm: null,
        });
    };

    const showConfirm = (message, title = "Confirm", onConfirm) => {
        setModal({
            show: true,
            message,
            title,
            type: "confirm",
            onConfirm,
        });
    };

    const closeMessage = () => {
        setModal((prev) => ({ ...prev, show: false }));
    };

    return (
        <MessageBoxContext.Provider value={{ showMessage, showConfirm }}>
            {children}
            {modal.show && (
                <MessageBox
                    message={modal.message}
                    title={modal.title}
                    type={modal.type}
                    onConfirm={modal.onConfirm}
                    onClose={closeMessage}
                />
            )}
        </MessageBoxContext.Provider>
    );
};

export const useMessage = () => {
    const context = useContext(MessageBoxContext);
    if (!context) {
        throw new Error("useMessage must be used within a MessageBoxProvider");
    }
    return context;
};
