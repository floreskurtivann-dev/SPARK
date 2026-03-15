(function() {
    let chart, classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    async function initAI() {
        try {
            labelElement.innerText = "Connecting to AI...";
            
            // Wait for library
            await new Promise(r => setTimeout(r, 2000));
            const TargetClass = window.EdgeImpulseClassifier || window.Classifier;

            if (!TargetClass) {
                labelElement.innerText = "Error: Library still blocked.";
                return;
            }

            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Starting Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "AI System Active";
                runInference();
            };
        } catch (err) {
            labelElement.innerText = "Check Camera Permissions";
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
                        ctx.strokeRect(box.x, box.y, box.width, box.height);
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }

    window.onload = () => {
        const chartCtx = document.getElementById('energyChart').getContext('2d');
        chart = new Chart(chartCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Voltage', data: [], borderColor: '#00d2ff' }] }
        });
        initAI();
    };
})();
