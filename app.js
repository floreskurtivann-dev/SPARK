(function() {
    let chart, port, classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    async function initAI() {
        labelElement.innerText = "Searching for AI SDK...";
        
        // Try to find the library name in multiple common locations
        let foundClass = null;
        for (let i = 0; i < 20; i++) {
            foundClass = window.EdgeImpulseClassifier || window.Classifier || (window.module && window.module.exports);
            if (foundClass) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (!foundClass) {
            labelElement.innerText = "Error: SDK not detected. Try Chrome on Laptop.";
            return;
        }

        try {
            labelElement.innerText = "Found SDK! Loading Brain...";
            classifier = new foundClass();
            await classifier.init();
            
            labelElement.innerText = "Requesting Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
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
            labelElement.innerText = "Camera/AI Error: " + err.name;
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
        // Initialize Chart
        const chartCtx = document.getElementById('energyChart').getContext('2d');
        chart = new Chart(chartCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Voltage (V)', data: [], borderColor: '#00d2ff', fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        initAI();
    });

    // Arduino Connection
    document.getElementById('btn-connect').addEventListener('click', async () => {
        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            document.getElementById('statusText').innerText = "🟢 Connected";
            const decoder = new TextDecoderStream();
            port.readable.pipeTo(decoder.writable);
            const reader = decoder.readable.getReader();
            while (true) {
                const { value } = await reader.read();
                if (value) {
                    const v = parseFloat(value.split(',')[0]);
                    document.getElementById('cur-val').innerText = v.toFixed(2);
                    if (chart.data.labels.length > 15) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
                    chart.data.labels.push(new Date().toLocaleTimeString().split(' ')[0]);
                    chart.data.datasets[0].data.push(v);
                    chart.update();
                }
            }
        } catch (e) { document.getElementById('statusText').innerText = "🔴 Off"; }
    });
})();
