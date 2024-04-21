import React, { useState, useRef, useEffect } from 'react';
import * as posenet from '@tensorflow-models/posenet';
import '@tensorflow/tfjs-backend-webgl';

function VideoStream() {
    const [userData, setUserData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        faceEncoding: '' // This might not be used if you do not process face encodings anymore
    });
    const [instruction, setInstruction] = useState("Please look straight ahead");
    const [position, setPosition] = useState('front');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        async function setupCamera() {
            const video = videoRef.current;
            video.width = 640; // Define the size of the video or canvas here
            video.height = 480;
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    resolve(video);
                };
            });
        }

        async function loadPoseNet() {
            const net = await posenet.load();
            return net;
        }

        async function detectPose() {
            const video = await setupCamera();
            video.play();
            const net = await loadPoseNet();

            setInterval(async () => {
                const pose = await net.estimateSinglePose(video, {
                    flipHorizontal: false
                });

                drawCanvas(video, pose);
                evaluatePose(pose);
            }, 100); // Check pose at an interval
        }

        function drawCanvas(video, pose) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = video.width;
            canvas.height = video.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            pose.keypoints.forEach(point => {
                if (point.score > 0.5) {
                    ctx.beginPath();
                    ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = 'red';
                    ctx.fill();
                }
            });
        }

        function evaluatePose(pose) {
            if (!pose.keypoints) return;
            const nose = pose.keypoints.find(k => k.part === 'nose');
            const leftEye = pose.keypoints.find(k => k.part === 'leftEye');
            const rightEye = pose.keypoints.find(k => k.part === 'rightEye');
            if (!nose || !leftEye || !rightEye) return;

            // Simple angle calculation (you might need to adjust these conditions based on testing)
            const dy = rightEye.position.y - leftEye.position.y;
            const dx = rightEye.position.x - leftEye.position.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            if (Math.abs(angle) < 10) {
                setInstruction("Please look straight ahead");
                if (position !== 'front') setPosition('front');
            } else if (angle > 10) {
                setInstruction("Please turn your head to the side");
                if (position !== 'sideways') setPosition('sideways');
            } else if (angle < -10) { // Assuming 'down' is another specific angle
                setInstruction("Please tilt your head down slightly");
                if (position !== 'down') setPosition('down');
            }
        }

        detectPose();
    }, []);

    return (
        <div>
            <input type="text" name="firstName" value={userData.firstName} onChange={e => setUserData({...userData, firstName: e.target.value})} placeholder="First Name" />
            <input type="text" name="lastName" value={userData.lastName} onChange={e => setUserData({...userData, lastName: e.target.value})} placeholder="Last Name" />
            <input type="email" name="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} placeholder="Email" />
            <div>{instruction}</div>
            <canvas ref={canvasRef} style={{ width: '640px', height: '480px' }} />
            <video ref={videoRef} style={{ display: 'none' }} playsInline autoPlay muted />
        </div>
    );
}

export default VideoStream;
