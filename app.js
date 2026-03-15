(function() {
    let chart, port, classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    // 1. MANUALLY INJECT THE LIBRARY
    function loadLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'edge-impulse-standalone.js';
            script.onload = () => resolve();
            script.onerror = () => reject();
            document.head.appendChild(script);
        });
    }

    async function initAI() {
        try {
            labelElement.innerText = "Downloading Engine...";
            await loadLibrary();
            await new Promise(r => setTimeout(r, 2000)); // Wait for JS to settle

            // 2. THE SCANNER: Find the AI class regardless of its name
            let TargetClass = window.EdgeImpulseClassifier || window.Classifier;
            
            if (!TargetClass) {
                console.log("Searching all window variables for AI...");
                for (let key in window) {
                    // Look for a class that has 'init' and 'classify' in its prototype
                    if (typeof window[key] === 'function' && window[key].prototype && window[key].prototype.init && window[key].prototype.classify) {
                        console.log("Detected AI Engine at:", key);
                        TargetClass = window[key];
                        break;
                    }
                }
            }

            if (!TargetClass) {
                labelElement.innerText = "Error: Model not found in memory. Re-export as WASM.";
                return;
            }

            labelElement.innerText = "Waking up " + (TargetClass.name || "AI") + "...";
            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Starting Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "System Active";
                runInference();
            };
        } catch (err) {
            labelElement.innerText = "Hardware Error: " + err.name;
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
                        ctx.font = "16px Arial";
                        ctx.fillText(`${box.label} ${(box.value * 100).toFixed(0)}%`, box.x, box.y - 10);
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }

    // Chart and Arduino code
    window.addEventListener('load', () => {
        const chartCtx = document.getElementById('energyChart').getContext('2d');
        chart = new Chart(chartCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Voltage (V)', data: [], borderColor: '#00d2ff', fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        initAI();
    });

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
