import React, { useState, useRef, useEffect } from 'react';

function VideoStream() {
    const [userData, setUserData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        faceEncoding: ''
    });
    const [instruction, setInstruction] = useState("Please look straight ahead");
    const [position, setPosition] = useState('front');
    const videoRef = useRef();
    const captureInterval = useRef(null);

    useEffect(() => {
        console.log('Position effect:', position);
        if (position !== 'front') { // Only start capturing if position changes
            startCapturing();
        }
    }, [position]); // Adding position as a dependency

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => console.error("Error accessing webcam:", err));

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            clearInterval(captureInterval.current);
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const captureFrame = () => {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataURL = canvas.toDataURL('image/jpeg');
        console.log(`Image captured for ${position}:`, imageDataURL);
        return imageDataURL;
    };

    const sendFrameForProcessing = async () => {
        console.log('Sending position to backend:', position);
        const image = captureFrame();
        const formData = new FormData();
        formData.append('image', image);
        formData.append('position', position);

        const response = await fetch('http://localhost:8010/api/face_processing/', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        console.log('Backend response:', data);
        if (data.correct) {
            console.log(`Position ${position} detected correctly, changing position.`);
            if (data.position_change_required) {
                handlePositionChange();
            }
        } else {
            console.log(`Position ${position} detection failed: ${data.error}`);
        }
    };

    const startCapturing = () => {
        clearInterval(captureInterval.current);
        captureInterval.current = setInterval(sendFrameForProcessing, 90); 
    };

    const handlePositionChange = () => {
        let newPosition = '';
        switch (position) {
            case 'front':
                newPosition = 'sideways';
                setInstruction('Please turn your head to the side');
                break;
            case 'sideways':
                newPosition = 'down';
                setInstruction('Please tilt your head down slightly');
                break;
            case 'down':
                newPosition = 'front'; // Reset to front for potential restart
                setInstruction('Processing complete. All positions captured.');
                console.log("All positions captured.");
                clearInterval(captureInterval.current);
                break;
            default:
                newPosition = 'front';
                setInstruction('Please look straight ahead');
                break;
        }
        console.log('Updating position to:', newPosition);
        setPosition(newPosition); // This will trigger the useEffect
    };

    return (
        <div>
            <div>
                <input type="text" name="firstName" value={userData.firstName} onChange={handleInputChange} placeholder="First Name" />
                <input type="text" name="lastName" value={userData.lastName} onChange={handleInputChange} placeholder="Last Name" />
                <input type="email" name="email" value={userData.email} onChange={handleInputChange} placeholder="Email" />
                <div>{instruction}</div>
                <button onClick={() => { clearInterval(captureInterval.current); setInstruction("Recognition stopped."); }}>Stop Recognition</button>
                <button onClick={() => { setPosition('front'); setInstruction("Please look straight ahead"); startCapturing(); }}>Start Recognition</button>
            </div>
            <h1>FaceRecognition</h1>
            <video playsInline autoPlay muted ref={videoRef} />
        </div>
    );
}

export default VideoStream;
