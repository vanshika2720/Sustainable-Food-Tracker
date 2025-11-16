// Barcode Scanner using QuaggaJS

document.addEventListener('DOMContentLoaded', () => {
    const scannerBtn = document.getElementById('scannerBtn');
    const scannerModal = document.getElementById('scannerModal');
    const closeScanner = document.getElementById('closeScanner');
    const scannerContainer = document.getElementById('scanner');
    
    let scannerActive = false;
    
    // Open scanner modal
    if (scannerBtn) {
        scannerBtn.addEventListener('click', () => {
            if (scannerModal) {
                scannerModal.classList.remove('hidden');
                startScanner();
            }
        });
    }
    
    // Close scanner modal
    if (closeScanner) {
        closeScanner.addEventListener('click', () => {
            stopScanner();
            if (scannerModal) {
                scannerModal.classList.add('hidden');
            }
        });
    }
    
    // Close on modal background click
    if (scannerModal) {
        scannerModal.addEventListener('click', (e) => {
            if (e.target === scannerModal) {
                stopScanner();
                scannerModal.classList.add('hidden');
            }
        });
    }
    
    // Start scanner
    function startScanner() {
        if (scannerActive || !scannerContainer) return;
        
        scannerActive = true;
        
        // Check if Quagga is available
        if (typeof Quagga === 'undefined') {
            alert('Barcode scanner library not loaded. Please refresh the page.');
            return;
        }
        
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerContainer,
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment" // Use back camera on mobile
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: 2,
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "i2of5_reader"
                ]
            },
            locate: true
        }, (err) => {
            if (err) {
                console.error('Scanner initialization error:', err);
                alert('Failed to initialize camera. Please check permissions and try again.');
                scannerActive = false;
                return;
            }
            
            Quagga.start();
        });
        
        // Handle successful scan
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            console.log('Barcode detected:', code);
            
            // Stop scanner
            stopScanner();
            
            // Close modal
            if (scannerModal) {
                scannerModal.classList.add('hidden');
            }
            
            // Navigate to product page
            if (code) {
                window.location.href = `product.html?barcode=${code}`;
            }
        });
    }
    
    // Stop scanner
    function stopScanner() {
        if (scannerActive && typeof Quagga !== 'undefined') {
            Quagga.stop();
            scannerActive = false;
        }
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopScanner();
    });
});

