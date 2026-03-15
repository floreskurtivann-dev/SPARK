(function() {
    let chart, classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    async function initAI() {
        try {
            labelElement.innerText = "Connecting to AI Studio...";
            
            // Wait up to 5 seconds for the CDN to deliver the library
            let TargetClass = null;
            for (let i = 0; i < 10; i++) {
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
                if (TargetClass) break;
                await new Promise(r => setTimeout(r, 500));
                console.log("Waiting for library... attempt " + (i + 1));
            }

            if (!TargetClass) {
                labelElement.innerText = "Error: Library still blocked. Try Incognito Mode.";
                return;
            }

            labelElement.innerText = "Waking up AI...";
            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Opening Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: "environment" } 
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
            console.error(err);
            labelElement.innerText = "Camera Error: Please allow access.";
        }
    }

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
                        ctx.fillStyle = '#00d2ff';
                        ctx.font = '18px Arial';
                        ctx.fillText(`${box.label} ${(box.value * 100).toFixed(0)}%`, box.x, box.y - 10);
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }

    window.onload = () => {
        // Simple Chart Setup
        const chartCtx = document.getElementById('energyChart').getContext('2d');
        chart = new Chart(chartCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Voltage (V)', data: [], borderColor: '#00d2ff' }] }
        });
        initAI();
    };

    // Arduino Connect
    document.getElementById('btn-connect').addEventListener('click', async () => {
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            document.getElementById('statusText').innerText = "🟢 Connected";
        } catch (e) {
            document.getElementById('statusText').innerText = "🔴 Connection Failed";
        }
    });
})();
