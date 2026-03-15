(function() {
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    window.initAI = async function() {
        try {
            labelElement.innerText = "Searching for AI brain...";
            
            // Wait up to 30 seconds for the files to actually load
            let TargetClass = null;
            for (let i = 0; i < 60; i++) {
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
                if (TargetClass) break;
                console.log("Still searching... attempt " + i);
                await new Promise(r => setTimeout(r, 500));
            }

            if (!TargetClass) {
                labelElement.innerHTML = "<span style='color:red'>Files missing from GitHub! Re-upload them.</span>";
                return;
            }

            labelElement.innerText = "Starting Engine...";
            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Requesting Camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: "environment" } 
            });
            
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                labelElement.innerText = "AI Online - Detecting...";
                runInference();
            };

        } catch (err) {
            console.error(err);
            labelElement.innerText = "Camera Blocked. Click the 'Lock' icon in URL bar.";
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
