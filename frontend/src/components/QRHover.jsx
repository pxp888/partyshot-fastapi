import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import './style/QRHover.css';

const QRHover = ({ text }) => {
    const [showQR, setShowQR] = useState(false);
    const currentUrl = window.location.href;

    return (
        <div
            className="qr-hover-container"
            onMouseEnter={() => setShowQR(true)}
            onMouseLeave={() => setShowQR(false)}
        >
            <p className="qr-trigger-text">{text}</p>
            {showQR && (
                <div className="qr-code-popup">
                    <div className="qr-inner">
                        <QRCodeSVG value={currentUrl} size={320} level="H" includeMargin={true} />
                        <span>Scan to view album</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRHover;
