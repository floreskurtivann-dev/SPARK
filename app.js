(function() {
    // --- 1. SETUP ---
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');
    
    // Arduino UI Elements
    const btnConnect = document.getElementById('btn-connect');
    const statusText = document.getElementById('statusText');
    const curVal = document.getElementById('cur-val');
    const totalVal = document.getElementById('total-val');
    let totalEnergy = 0;

    // --- 2. AI INITIALIZATION ---
    window.initAI = async function() {
        try {
            labelElement.innerText = "Waking up AI Engine...";
            
            let TargetClass = null;
            // Wait for WASM to compile
            for (let i = 0; i < 40; i++) {
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
                if (typeof TargetClass === 'function') break;
                await new Promise(r => setTimeout(r, 500));
            }

            if (typeof TargetClass !== 'function') {
                labelElement.innerText = "Engine Timeout. Refresh Page.";
                return;
            }

            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Connecting to Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } } 
            });
            
            video.srcObject = stream;
            
            video.onloadedmetadata = () => {
                video.play();
                // SYNC CANVAS TO VIDEO SIZE
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "AI Online: Scanning...";
                runInference();
            };

        } catch (err) {
            console.error(err);
            labelElement.innerText = "Hardware Error: " + err.message;
        }
    };

    // --- 3. OBJECT DETECTION LOGIC ---
    async function runInference() {
        if (!classifier || video.paused || video.ended) {
            requestAnimationFrame(runInference);
            return;
        }

        try {
            const result = await classifier.classify(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (result && result.bounding_boxes) {
                let detectionFound = false;

                result.bounding_boxes.forEach(box => {
                    // Only show boxes with > 50% confidence
                    if (box.value > 0.5) {
                        detectionFound = true;
                        
                        // DRAW BOX
                        ctx.strokeStyle = '#00d2ff';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(box.x, box.y, box.width, box.height);

                        // DRAW LABEL
                        ctx.fillStyle = '#00d2ff';
                        ctx.font = 'bold 18px Arial';
                        ctx.fillText(`${box.label} ${(box.value * 100).toFixed(0)}%`, box.x, box.y - 10);
                        
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });

                if (!detectionFound) {
                    labelElement.innerText = "AI Scanning: No objects found";
                }
            }
        } catch (e) {
            console.error("Inference Error:", e);
        }
        
        // Loop back for the next frame
        requestAnimationFrame(runInference);
    }

    // --- 4. ARDUINO SERIAL LOGIC ---
    if ('serial' in navigator) {
        btnConnect.addEventListener('click', async () => {
            try {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 9600 });
                statusText.innerText = "🟢 Online";
                btnConnect.innerText = "Connected";
                
                const reader = port.readable.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const data = decoder.decode(value).trim();
                    if (data && !isNaN(data)) {
                        const voltage = parseFloat(data);
                        curVal.innerText = voltage.toFixed(2);
                        totalEnergy += (voltage * 0.01);
                        totalVal.innerText = totalEnergy.toFixed(3);
                    }
                }
            } catch (err) {
                statusText.innerText = "🔴 Connection Failed";
            }
        });
    }
})();
