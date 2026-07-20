// Aloah Events - QR Code Scanner Engine (Camera & Simulation Fallbacks)

let html5QrcodeScanner = null;

/**
 * Initializes and starts the camera-based QR scanner.
 * Also configures the fallback mock dropdown selector.
 */
export function startScanner(eventId, onScanSuccess, onScanError) {
  stopScanner(); // Clean up active scanners

  const scanViewId = "camera-scan-view";
  const scannerContainer = document.getElementById(scanViewId);
  if (!scannerContainer) return;

  // Clear previous camera message
  scannerContainer.innerHTML = "";

  // 1. Initialize HTML5 QR Reader if library is loaded
  if (window.Html5Qrcode) {
    try {
      html5QrcodeScanner = new window.Html5Qrcode(scanViewId);
      
      const config = { 
        fps: 10, 
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        }
      };

      html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success: parse text token and invoke callback
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Failure (scanning frame-by-frame fails to find code)
          if (onScanError) onScanError(errorMessage);
        }
      ).catch((err) => {
        console.warn("Camera start failed, showing fallback placeholder", err);
        showCameraPlaceholder(scannerContainer, "Camera access denied or unavailable.");
      });
    } catch (e) {
      console.error("Html5Qrcode initialization error", e);
      showCameraPlaceholder(scannerContainer, "Scanner initialization failed.");
    }
  } else {
    showCameraPlaceholder(scannerContainer, "Camera QR scanner library offline.");
  }
}

/**
 * Stop any active camera streams
 */
export function stopScanner() {
  if (html5QrcodeScanner) {
    try {
      if (html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().catch(err => console.error("Error stopping scanner:", err));
      }
    } catch (e) {
      console.error("Scanner stop exception:", e);
    }
    html5QrcodeScanner = null;
  }
}

function showCameraPlaceholder(container, message) {
  container.innerHTML = `
    <div style="
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      height: 100%; 
      color: #71717a; 
      font-size: 13px; 
      padding: 20px; 
      text-align: center;
      gap: 8px;
    ">
      <svg style="width: 32px; height: 32px; stroke: currentColor; fill: none;" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
      <div>${message}</div>
      <div style="font-size: 11px; color: #a1a1aa;">Please use the simulated scanner tools below to check in guests.</div>
    </div>
  `;
}
