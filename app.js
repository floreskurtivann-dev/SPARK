(function() {
    let chart, port, classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    async function initAI() {
        try {
            labelElement.innerText = "Checking Memory...";
            
            // Wait up to 5 seconds for the library to finish loading
            let TargetClass = null;
            for (let i = 0; i < 10; i++) {
                TargetClass = window.EdgeImpulseClassifier || window.Classifier || window.EdgeImpulse;
                if (TargetClass) break;
                await new Promise(r => setTimeout(r, 500));
            }

            if (!TargetClass) {
                labelElement.innerText = "Error: Library Load Failed.";
                return;
            }

            labelElement.innerText = "Starting " + (TargetClass.name || "AI") + "...";
            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Opening Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
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
            labelElement.innerText = "Error: " + err.name;
            console.error(err);
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
                        ctx.fillText(`${box.label} ${(box.value * 100).toFixed(0)}%`, box.x, box.y - 10);
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }

    window.addEventListener('load', () => {
        // Init Chart
        const chartCtx = document.getElementById('energyChart').getContext('2d');
        chart = new Chart(chartCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Voltage (V)', data: [], borderColor: '#00d2ff' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        initAI();
    });

    // Connect Button
    document.getElementById('btn-connect').addEventListener('click', async () => {
        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            document.getElementById('statusText').innerText = "🟢 Connected";
        } catch (e) { console.log(e); }
    });
})();
