import React, { useState, useRef, useEffect } from 'react';

function VideoStream() {
    const [userData, setUserData] = useState({
        firstName: '',
        lastName: '',
    });
    const [instruction, setInstruction] = useState('Press "Start Recognition" and look straight to the camera ');
    const [position, setPosition] = useState('front');
    const videoRef = useRef();
    const captureInterval = useRef(null);
    const [recognizing, setRecognizing] = useState(false);
    const [transitionMessage, setTransitionMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState('');
    const [faceEncodings, setFaceEncodings] = useState([[], [], []]);


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
        if (value.trim() !== '') {
            setErrorMessage(''); // Clear validation message when user starts typing

        }
    };

    const captureFrame = () => {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataURL = canvas.toDataURL('image/jpeg');
        console.log(`Image captured for ${position}:`);
        return imageDataURL;
    };

    const sendFrameForProcessing = async () => {
        console.log('Sending position to backend:', position, userData.firstName, userData.lastName);
        const image = captureFrame();
        const formData = new FormData();
        formData.append('image', image);
        formData.append('position', position);
        formData.append('name', userData.firstName); // Changed from 'first_name' to 'name'
        formData.append('surname', userData.lastName); // Changed from 'last_name' to 'surname'

            const response = await fetch('http://localhost:8010/api/face_processing/', {
                method: 'POST',
                body: formData,
            });
    
            const data = await response.json();
            console.log('\n \n Backend response:', data);
            if (data.correct) {
                // Determine the index based on the current position
                const positionIndex = { 'front': 0, 'sideways': 1, 'down': 2 }[position];

                // Add the face encoding to the array for the current position
                setFaceEncodings(encodings => {
                    const newEncodings = [...encodings];
                    newEncodings[positionIndex] = data.face_encoding;
                    return newEncodings;
                });

                if (data.position_change_required) {
                    clearInterval(captureInterval.current);
                    setTransitionMessage("OK, now wait for the next position one second...");
                    setTimeout(() => {
                        handlePositionChange();
                        setTransitionMessage("");
                    }, 2000);
                } else {
                    // If all positions are captured, send the faceEncodings to save the user
                    saveUser(faceEncodings);
                }
            } else if (!data.correct) {
                // Handle the case where the position detection failed
                console.log(`Position ${position} detection failed: ${data.error}`);
            }
        };


    const startCapturing = () => {
        if (!userData.firstName.trim() || !userData.lastName.trim()) {
            // Set an error message and prevent recognition from starting
            const errorMsg = "Please fill in both your first name and last name to start recognition.";
            alert(errorMsg); // Using browser alert for immediate feedback
            setErrorMessage(errorMsg); // Optionally update state if you want to display this in the UI
            return; // Exit the function to prevent recognition from starting
        }
    
        // Clear previous error messages when starting recognition
        setErrorMessage('');
    
        // Clear the interval and start a new one for capturing
        clearInterval(captureInterval.current);
        captureInterval.current = setInterval(sendFrameForProcessing, 90); 
        setRecognizing(true);
    };


    const saveUser = async () => {
        const payload = {
            name: userData.firstName,
            surname: userData.lastName,
            face_encoding: faceEncodings  
        };
    
        try {
            const response = await fetch('http://localhost:8010/api/save_user/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
    
            const data = await response.json();
            if (response.ok) {
                alert(`User saved successfully with ID: ${data.user_id}`);
                console.log(`User saved: ${data.message}`);
            } else {
                throw new Error(`Failed to save user: ${data.error}`);
            }
        } catch (error) {
            console.error('Error saving user to the backend:', error);
            alert('Error saving user.');
        }
    };
    
    useEffect(() => {
        if (position === 'down' && faceEncodings.every(encoding => encoding.length > 0)) {
            setInstruction('All positions captured. Saving data...');
            console.log("All positions captured.");
            setTimeout(() => {
                saveUser(); // Call the saveUser function after 3 seconds
            }, 3000);
        }
    }, [faceEncodings, position]); // Adding faceEncodings and position as dependencies
    
    const handlePositionChange = () => {
        let newPosition = '';
        switch (position) {
            case 'front':
                newPosition = 'sideways';
                setInstruction('Please turn your head to the SIDE');
                break;
            case 'sideways':
                newPosition = 'down';
                setInstruction('Please tilt your head DOWN slightly');
                break;
            case 'down':
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

    const stopRecognition = () => {
        // Your existing logic to stop capturing...
        clearInterval(captureInterval.current);
        setInstruction("Recognition stopped.");
        setRecognizing(false); // Turn off the recognition indicator
    };


    return (
        <div className="p-4">
            <h1 className="text-4xl mb-2">Face Encodings</h1>
            <div>
                <input 
                    type="text" 
                    name="firstName" 
                    value={userData.firstName} 
                    onChange={handleInputChange} 
                    placeholder="First Name" 
                    className="m-2 border-2 border-green-200 focus:border-green-500 outline-none focus:outline-none rounded-lg"
                />
                <input 
                    type="text" 
                    name="lastName" 
                    value={userData.lastName} 
                    onChange={handleInputChange} 
                    placeholder="Last Name" 
                    className="m-2 border-2 border-green-200 focus:border-green-500 outline-none focus:outline-none rounded-lg"
                />
                <div className="text-green-600 text-3xl mt-4 font-extrabold">{instruction}</div>
                {transitionMessage && <div className="text-blue-500 text-xl mt-4">{transitionMessage}</div>}
            </div>
            <video playsInline autoPlay muted ref={videoRef} className="mt-4 rounded-lg" />
            <button onClick={stopRecognition} className="bg-blue-500 text-white py-2 px-4 rounded-lg m-2">Stop Recognition</button>
            <button
            onClick={startCapturing}
            className={`bg-green-500 text-white py-2 px-4 rounded-lg m-2 ${recognizing ? 'bg-gray-500 pointer-events-none' : 'bg-green-500'}`}
        >
            Start Recognition
        </button>
            {recognizing && (
                <div className="py-2 px-4 m-2 rounded-lg bg-red-500 text-white text-center">
                    Recognition in process...
                </div>
            )}
        </div>
    );
};

export default VideoStream;