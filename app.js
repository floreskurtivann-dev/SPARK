(function() {
    let classifier;
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    const labelElement = document.getElementById('labels-container');

    window.initAI = async function() {
        try {
            labelElement.innerText = "Waking up AI Engine...";
            
            let TargetClass = window.EdgeImpulseClassifier || window.Classifier;
            if (!TargetClass) {
                await new Promise(r => setTimeout(r, 1000));
                TargetClass = window.EdgeImpulseClassifier || window.Classifier;
            }

            classifier = new TargetClass();
            await classifier.init();
            
            labelElement.innerText = "Connecting to Camera...";

            // THE FIX: Constraints must be very simple for some mobile/laptop cams
            const constraints = { 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            video.srcObject = stream;
            
            // Critical: Wait for video to actually start playing
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play().then(resolve).catch(e => {
                        console.error("Autoplay blocked:", e);
                        labelElement.innerText = "Click anywhere to start Camera";
                        document.body.addEventListener('click', () => video.play(), {once: true});
                    });
                };
            });

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            labelElement.innerText = "AI System Active";
            runInference();

        } catch (err) {
            console.error("Camera Error:", err);
            // Detailed error reporting
            if (err.name === 'NotAllowedError') {
                labelElement.innerText = "Permission Denied by Browser.";
            } else {
                labelElement.innerText = "Hardware Error: " + err.message;
            }
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
                        labelElement.innerText = `Detected: ${box.label}`;
                    }
                });
            }
        } catch (e) {}
        requestAnimationFrame(runInference);
    }
})();
