// Global Variables
let chart;
let port;
let classifier;
const video = document.getElementById('webcam');
const canvas = document.getElementById('detection-canvas');
const ctx = canvas.getContext('2d');
const labelElement = document.getElementById('labels-container');

// 1. INITIALIZE CHART
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
            scales: { y: { beginAtZero: true, max: 5 } }
        }
    });
}

// 2. ARDUINO SERIAL LOGIC
document.getElementById('btn-connect').addEventListener('click', async () => {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        document.getElementById('statusText').innerText = "🟢 Connected";
        readSerial();
    } catch (e) {
        console.log("Connection Cancelled");
    }
});

async function readSerial() {
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    while (true) {
        const { value, done } = await reader.read();
        if (value) {
            const data = value.split(',');
            if (data.length >= 1) {
                const volts = parseFloat(data[0]);
                updateUI(volts);
            }
        }
    }
}

function updateUI(volts) {
    document.getElementById('cur-val').innerText = volts.toFixed(2);
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.data.labels.push(new Date().toLocaleTimeString().split(' ')[0]);
    chart.data.datasets[0].data.push(volts);
    chart.update();
}

// 3. AI LOGIC WITH RETRY LOOP
async function initAI() {
    console.log("Searching for Edge Impulse SDK...");
    
    // Wait for the SDK to appear in global window object
    let retries = 0;
    while (typeof EdgeImpulseClassifier === 'undefined' && retries < 10) {
        await new Promise(r => setTimeout(r, 500));
        retries++;
        console.log(`Retry ${retries}: Library not ready...`);
    }

    if (typeof EdgeImpulseClassifier === 'undefined') {
        labelElement.innerText = "Error: Library not found. Refresh page.";
        return;
    }

    try {
        labelElement.innerText = "Loading Model (WASM)...";
        classifier = new EdgeImpulseClassifier();
        await classifier.init();
        
        console.log("Model Initialized!");

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            labelElement.innerText = "Scanning Ready";
            runInference();
        };
    } catch (err) {
        console.error(err);
        labelElement.innerText = "AI Failed: Check Camera";
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
    } catch (e) {
        console.error("Inference Error", e);
    }
    requestAnimationFrame(runInference);
}

// Start everything
window.addEventListener('DOMContentLoaded', () => {
    initChart();
    initAI();
});
