// Wrap everything in an IIFE to prevent variable conflicts
(function() {
    let chart;
    let port;
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    function initChart() {
        const chartCtx = document.getElementById('energyChart').getContext('2d');
        chart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Piezo Voltage (V)',
                    data: [],
                    borderColor: '#00d2ff',
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { min: 0, max: 5 } }
            }
        });
    }

    async function initAI() {
        labelElement.innerText = "Waiting for System...";
        
        // Wait until the library is actually defined in the window
        let retries = 0;
        const checkLibrary = () => {
            return typeof window.EdgeImpulseClassifier !== 'undefined' || typeof window.Classifier !== 'undefined';
        };

        while (!checkLibrary() && retries < 30) {
            await new Promise(r => setTimeout(r, 500));
            retries++;
            console.log("Searching for AI Library... trial " + retries);
        }

        try {
            const TargetClass = window.EdgeImpulseClassifier || window.Classifier;
            
            if (!TargetClass) {
                throw new Error("LibraryNotFound");
            }

            labelElement.innerText = "Loading AI Brain...";
            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Starting Camera...";

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: "environment" } 
            });
            
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "System Active";
                runInference();
            };

        } catch (err) {
            console.error(err);
            if (err.message === "LibraryNotFound") {
                labelElement.innerText = "Error: AI Library not found. Check index.html order.";
            } else {
                labelElement.innerText = "Camera Error: Please allow access.";
            }
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

    // Arduino logic
    document.getElementById('btn-connect').addEventListener('click', async () => {
        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            document.getElementById('statusText').innerText = "🟢 Connected";
            
            const decoder = new TextDecoderStream();
            port.readable.pipeTo(decoder.writable);
            const reader = decoder.readable.getReader();

            while (true) {
                const { value, done } = await reader.read();
                if (value) {
                    const volts = parseFloat(value.split(',')[0]);
                    if(!isNaN(volts)) {
                        document.getElementById('cur-val').innerText = volts.toFixed(2);
                        if (chart.data.labels.length > 15) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
                        chart.data.labels.push(new Date().toLocaleTimeString().split(' ')[0]);
                        chart.data.datasets[0].data.push(volts);
                        chart.update();
                    }
                }
                if (done) break;
            }
        } catch (e) {
            document.getElementById('statusText').innerText = "🔴 Disconnected";
        }
    });

    // START ON LOAD
    window.addEventListener('load', () => {
        initChart();
        initAI();
    });
})();
