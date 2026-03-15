(function() {
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');
    
    const btnConnect = document.getElementById('btn-connect');
    const statusText = document.getElementById('statusText');
    const curVal = document.getElementById('cur-val');
    const totalVal = document.getElementById('total-val');
    let totalEnergy = 0;

    window.initAI = async function() {
        try {
            labelElement.innerText = "Waking up AI Engine...";
            
            // THE FIX: Wait until the class is actually a 'function' (constructor)
            let TargetClass = null;
            for (let i = 0; i < 40; i++) {
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
                if (typeof TargetClass === 'function') break; 
                await new Promise(r => setTimeout(r, 500));
            }

            if (typeof TargetClass !== 'function') {
                labelElement.innerText = "Error: Engine failed to prime. Refreshing...";
                location.reload();
                return;
            }

            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Connecting to Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment", width: 640, height: 480 } 
            });
            
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "AI System Active";
                runInference();
            };

        } catch (err) {
            labelElement.innerText = "Hardware Error: " + err.message;
        }
    };

    async function runInference() {
        try {
            const result = await classifier.classify(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (result.bounding_boxes) {
                result.bounding_boxes.forEach(box => {
                    if (box.value > 0.5) {
                        ctx.strokeStyle = '#00d2ff';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(box.x, box.y, box.width, box.height);
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }

    // --- ARDUINO SERIAL LOGIC ---
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
                        totalEnergy += (voltage * 0.1);
                        totalVal.innerText = totalEnergy.toFixed(3);
                    }
                }
            } catch (err) {
                statusText.innerText = "🔴 Connection Failed";
            }
        });
    }
})();
