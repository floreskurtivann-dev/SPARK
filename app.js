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
            scales: { y: { beginAtZero: true } }
        }
    });
}

// 2. CONNECT TO ARDUINO (Web Serial)
document.getElementById('btn-connect').addEventListener('click', async () => {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        document.getElementById('statusText').innerText = "🟢 Connected";
        readSerial();
    } catch (e) {
        console.log("Serial Connection Cancelled");
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
            if (data.length >= 2) {
                const volts = parseFloat(data[0]);
                const joules = parseFloat(data[1]);
                
                document.getElementById('cur-val').innerText = volts.toFixed(2);
                document.getElementById('total-val').innerText = joules.toFixed(2);
                
                // Update Chart
                if (chart.data.labels.length > 15) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                chart.data.labels.push(new Date().toLocaleTimeString().split(' ')[0]);
                chart.data.datasets[0].data.push(volts);
                chart.update();
            }
        }
    }
}

// 3. START AI (Edge Impulse)
async function initAI() {
    console.log("AI Loading...");
    try {
        if (typeof EdgeImpulseClassifier === 'undefined') {
            labelElement.innerText = "Error: Library not loaded";
            return;
        }

        classifier = new EdgeImpulseClassifier();
        await classifier.init();
        console.log("WASM Loaded!");

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            labelElement.innerText = "Model Ready: Scanning...";
            runInference();
        };
    } catch (err) {
        console.error(err);
        labelElement.innerText = "AI Init Failed";
    }
}

async function runInference() {
    try {
        const result = await classifier.classify(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.bounding_boxes) {
            result.bounding_boxes.forEach(box => {
                if (box.value > 0.5) {
                    // Draw Box
                    ctx.strokeStyle = '#00d2ff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                    
                    // Draw Label
                    ctx.fillStyle = '#00d2ff';
                    ctx.font = '16px Arial';
                    ctx.fillText(`${box.label} (${(box.value * 100).toFixed(0)}%)`, box.x, box.y - 5);
                    
                    labelElement.innerText = `Detected: ${box.label}`;
                }
            });
        }
    } catch (e) {
        console.error("Inference error:", e);
    }
    requestAnimationFrame(runInference);
}

// Start sequence
window.onload = () => {
    initChart();
    initAI();
};
