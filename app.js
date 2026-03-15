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
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function initAI() {
    let retries = 0;
    // Check for both common Edge Impulse class names
    while (typeof EdgeImpulseClassifier === 'undefined' && typeof Classifier === 'undefined' && retries < 20) {
        await new Promise(r => setTimeout(r, 500));
        retries++;
    }

    try {
        // Use whichever class name was found
        const TargetClass = (typeof EdgeImpulseClassifier !== 'undefined') ? EdgeImpulseClassifier : Classifier;
        
        if (!TargetClass) {
            labelElement.innerText = "Error: Library naming mismatch";
            return;
        }

        labelElement.innerText = "Loading WASM Brain...";
        classifier = new TargetClass();
        await classifier.init();
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            labelElement.innerText = "System Ready";
            runInference();
        };
    } catch (err) {
        labelElement.innerText = "AI Failed. Check Camera permissions.";
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
                    ctx.fillText(`${box.label} ${(box.value * 100).toFixed(0)}%`, box.x, box.y - 5);
                    labelElement.innerText = `Detected: ${box.label}`;
                }
            });
        }
    } catch (e) {}
    requestAnimationFrame(runInference);
}

// Start everything
window.addEventListener('load', () => {
    initChart();
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
                const volts = parseFloat(value.split(',')[0]);
                document.getElementById('cur-val').innerText = volts.toFixed(2);
                if (chart.data.labels.length > 15) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
                chart.data.labels.push(new Date().toLocaleTimeString().split(' ')[0]);
                chart.data.datasets[0].data.push(volts);
                chart.update();
            }
        }
    } catch (e) {}
});
