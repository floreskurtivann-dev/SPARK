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
            scales: { y: { min: 0, max: 5 } }
        }
    });
}

// 2. AI LOGIC (With Library & Camera Fixes)
async function initAI() {
    console.log("Checking for Edge Impulse SDK...");
    
    // Wait up to 10 seconds for the library to load
    let retries = 0;
    while (typeof EdgeImpulseClassifier === 'undefined' && typeof Classifier === 'undefined' && retries < 20) {
        await new Promise(r => setTimeout(r, 500));
        retries++;
    }

    try {
        const TargetClass = (typeof EdgeImpulseClassifier !== 'undefined') ? EdgeImpulseClassifier : Classifier;
        
        if (!TargetClass) {
            labelElement.innerText = "Error: Library Load Timeout";
            return;
        }

        labelElement.innerText = "Waking up AI...";
        classifier = new TargetClass();
        await classifier.init();
        
        labelElement.innerText = "Requesting Camera...";

        // ULTRA COMPATIBLE CAMERA REQUEST
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "environment" // Uses back camera on phones
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        // Force the video to play
        video.onloadedmetadata = () => {
            video.play();
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            labelElement.innerText = "System Active";
            runInference();
        };

    } catch (err) {
        console.error("Critical Error:", err);
        // Display the specific error so we can debug
        labelElement.innerText = "Error: " + err.name + " - Check Permissions";
    }
}

// 3. THE INFERENCE LOOP
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
                    ctx.font = '18px Arial';
                    ctx.fillText(`${box.label} ${(box.value * 100).toFixed(0)}%`, box.x, box.y - 10);
                    
                    labelElement.innerText = `Detected: ${box.label}`;
                }
            });
        }
    } catch (e) {
        console.error("Inference break:", e);
    }
    requestAnimationFrame(runInference);
}

// 4. ARDUINO SERIAL CONNECTION
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
                    updateDashboard(volts);
                }
            }
            if (done) break;
        }
    } catch (e) {
        console.log("Serial Error:", e);
        document.getElementById('statusText').innerText = "🔴 Disconnected";
    }
});

function updateDashboard(volts) {
    document.getElementById('cur-val').innerText = volts.toFixed(2);
    
    // Update Chart
    if (chart.data.labels.length > 15) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.data.labels.push(new Date().toLocaleTimeString().split(' ')[0]);
    chart.data.datasets[0].data.push(volts);
    chart.update();
}

// Start the page
window.onload = () => {
    initChart();
    initAI();
};
