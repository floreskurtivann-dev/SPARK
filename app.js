let chart;
let port;
let totalEnergy = 0;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('energyChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Harvesting (Volts)',
                data: [],
                borderColor: '#38bdf8',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Web Serial: Connect to Arduino
document.getElementById('btn-connect').addEventListener('click', async () => {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        document.getElementById('statusText').innerText = "🟢 Connected";
        readSerial();
    } catch (e) {
        console.error("Serial error:", e);
    }
});

async function readSerial() {
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    while (true) {
        const { value, done } = await reader.read();
        if (value) {
            // Expecting "current,total" from Arduino
            const data = value.split(',');
            if (data.length >= 2) {
                const current = parseFloat(data[0]);
                const total = parseFloat(data[1]);
                
                document.getElementById('cur-val').innerText = current.toFixed(2);
                document.getElementById('total-val').innerText = total.toFixed(2);
                
                updateChart(current);
            }
        }
    }
}

function updateChart(val) {
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(val);
    chart.update();
}

// Edge Impulse Logic (Skeleton)
async function startAI() {
    const video = document.getElementById('webcam');
    // Request webcam access
    if (navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    }
    
    // NOTE: Here is where you call your Edge Impulse Classifier 
    // using the methods provided in your edge-impulse-standalone.js
    console.log("Model loaded. Ready for YOLO inference.");
}

initChart();
startAI();