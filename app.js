(function() {
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    window.initAI = async function() {
        try {
            let TargetClass = window.EdgeImpulseClassifier || window.Classifier;
            if (!TargetClass) {
                labelElement.innerText = "Waking up AI...";
                await new Promise(r => setTimeout(r, 2000));
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
            }

            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Requesting Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "AI System Active";
                runInference();
            };
        } catch (err) { labelElement.innerText = "Camera Blocked. Check site settings."; }
    };

    async function runInference() {
        try {
            const result = await classifier.classify(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (result.bounding_boxes) {
                result.bounding_boxes.forEach(box => {
                    if (box.value > 0.5) {
                        ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 3;
                        ctx.strokeRect(box.x, box.y, box.width, box.height);
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }
})();
