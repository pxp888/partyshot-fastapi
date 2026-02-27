import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import './style/QRHover.css';

const QRHover = ({ text }) => {
    const [showQR, setShowQR] = useState(false);
    const [copied, setCopied] = useState(false);
    const currentUrl = window.location.href;

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    return (
        <div
            className="qr-hover-container"
            onMouseEnter={() => setShowQR(true)}
            onMouseLeave={() => setShowQR(false)}
            onClick={handleCopy}
            title="Click to copy"
        >
            <p className="qr-trigger-text">{text}</p>
            {copied && <span className="copy-feedback">Copied!</span>}
            {showQR && (
                <div className="qr-code-popup" onClick={(e) => e.stopPropagation()}>
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
