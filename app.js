(function() {
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    window.initAI = async function() {
        try {
            labelElement.innerText = "Checking Library...";
            
            // This loop waits up to 10 seconds for the library to "wake up"
            let TargetClass = null;
            for (let i = 0; i < 20; i++) {
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
                if (TargetClass) break;
                await new Promise(r => setTimeout(r, 500));
            }

            if (!TargetClass) {
                labelElement.innerText = "Error: Library not responding.";
                return;
            }

            labelElement.innerText = "Waking up AI...";
            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Opening Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: "environment" } 
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
            console.error(err);
            labelElement.innerText = "Camera Error. Check permissions!";
        }
    };

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
})();
