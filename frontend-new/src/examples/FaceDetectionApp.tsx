import React, { useState, useRef, useEffect } from 'react';
import LibraryLoader from '../components/ui/LibraryLoader';
import { useLibrary } from '../hooks/useLibrary';
import 'bootstrap/dist/css/bootstrap.min.css';

/**
 * Face Detection App
 * 
 * This component demonstrates how to use dynamic library loading
 * to create a face detection application using face-api.js
 */
const FaceDetectionApp: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectionResults, setDetectionResults] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use our custom hook to load the face-api.js library
  const { library: faceapi, isLoading, error } = useLibrary<any>('face-api.js', {
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
  });
  
  // Load models when face-api is available
  useEffect(() => {
    const loadModels = async () => {
      if (!faceapi) return;
      
      try {
        console.log('Loading face detection models...');
        setDetectionResults('Loading face detection models...');
        
        // Use local model files instead of remote URL
        const MODEL_URL = '/models/face-api';
        
        // Only load TinyFaceDetector model - no need for TinyYolov2
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        
        console.log('Face detection models loaded successfully');
        setModelsLoaded(true);
        setDetectionResults('Models loaded successfully. Ready for detection!');
      } catch (err) {
        console.error('Error loading models:', err);
        setDetectionResults('Failed to load face detection models. Please try again.');
      }
    };
    
    if (faceapi) {
      loadModels();
    }
  }, [faceapi]);
  
  // Handle image detection
  const detectFaces = async () => {
    if (!faceapi || !imageRef.current || !canvasRef.current || !modelsLoaded) {
      setDetectionResults('Models not loaded yet. Please wait.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setDetectionResults('Processing image...');
      
      // Make sure image is loaded
      if (!imageRef.current.complete) {
        await new Promise((resolve) => {
          imageRef.current!.onload = resolve;
        });
      }
      
      // Reset canvas and set it to image dimensions
      const displaySize = {
        width: imageRef.current.width,
        height: imageRef.current.height
      };
      
      faceapi.matchDimensions(canvasRef.current, displaySize);
      
      // Detect faces with TinyFaceDetector only
      const detections = await faceapi.detectAllFaces(
        imageRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      );
      
      // Resize results to match display size
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Clear canvas and draw new results
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw detection results - only boxes
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      
      // Update results text
      setDetectionResults(`Detected ${detections.length} face${detections.length !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Error detecting faces:', err);
      setDetectionResults('Error during face detection. Please try a different image.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle video detection
  const startVideoDetection = async () => {
    if (!faceapi || !videoRef.current || !canvasRef.current || !modelsLoaded) {
      setDetectionResults('Models not loaded yet. Please wait.');
      return;
    }
    
    try {
      // Access webcam
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      
      // Wait for video to start playing
      await new Promise((resolve) => {
        videoRef.current!.onplay = resolve;
      });
      
      // Set canvas dimensions
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      
      // Start detection loop
      const interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !faceapi) {
          clearInterval(interval);
          return;
        }
        
        // Detect faces - only boxes, no landmarks or expressions
        const detections = await faceapi.detectAllFaces(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions()
        );
        
        // Resize and draw results
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Only draw detection boxes
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        
        // Update count
        setDetectionResults(`Detected ${detections.length} face${detections.length !== 1 ? 's' : ''}`);
      }, 100);
      
      // Cleanup on component unmount
      return () => {
        clearInterval(interval);
        if (videoRef.current?.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
        }
      };
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setDetectionResults('Unable to access webcam. Please check your permissions.');
      setCameraActive(false);
    }
  };
  
  // Stop webcam
  const stopVideoDetection = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      
      setDetectionResults('');
    }
  };
  
  // Toggle between image and camera modes
  const toggleMode = () => {
    if (showCamera && cameraActive) {
      stopVideoDetection();
    }
    setShowCamera(!showCamera);
  };
  
  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="text-center">Face Detective</h1>
          <p className="text-center text-muted">Detect faces in images or live from your webcam</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="row">
          <div className="col text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading face detection library...</span>
            </div>
            <p className="mt-2">Loading face detection library...</p>
          </div>
        </div>
      ) : error ? (
        <div className="row">
          <div className="col">
            <div className="alert alert-danger">
              Error loading face detection library: {error.message}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="row mb-3">
            <div className="col text-center">
              <button 
                className={`btn btn-${showCamera ? 'secondary' : 'primary'} me-2`}
                onClick={() => setShowCamera(false)}
                disabled={!showCamera}
              >
                Image Mode
              </button>
              <button 
                className={`btn btn-${showCamera ? 'primary' : 'secondary'}`}
                onClick={() => setShowCamera(true)}
                disabled={showCamera}
              >
                Camera Mode
              </button>
            </div>
          </div>
          
          {!showCamera ? (
            // Image Mode
            <div className="row">
              <div className="col-md-6 offset-md-3">
                <div className="input-group mb-3">
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Enter image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={detectFaces}
                    disabled={!imageUrl || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Detect Faces'}
                  </button>
                </div>
                
                <div className="position-relative mb-3">
                  {imageUrl && (
                    <img 
                      ref={imageRef}
                      src={imageUrl}
                      alt="Uploaded image"
                      className="img-fluid"
                      style={{ maxWidth: '100%' }}
                      onError={() => setDetectionResults('Error loading image. Please check the URL.')}
                    />
                  )}
                  <canvas 
                    ref={canvasRef}
                    className="position-absolute top-0 left-0"
                    style={{ zIndex: 1 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Camera Mode
            <div className="row">
              <div className="col-md-6 offset-md-3">
                <div className="text-center mb-3">
                  {!cameraActive ? (
                    <button 
                      className="btn btn-success"
                      onClick={startVideoDetection}
                    >
                      Start Camera
                    </button>
                  ) : (
                    <button 
                      className="btn btn-danger"
                      onClick={stopVideoDetection}
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
                
                <div className="position-relative mb-3">
                  <video 
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-100"
                  />
                  <canvas 
                    ref={canvasRef}
                    className="position-absolute top-0 left-0"
                    style={{ zIndex: 1 }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {detectionResults && (
            <div className="row mt-3">
              <div className="col text-center">
                <div className="alert alert-info">
                  {detectionResults}
                </div>
              </div>
            </div>
          )}
          
          <div className="row mt-4">
            <div className="col">
              <div className="card">
                <div className="card-header">How it works</div>
                <div className="card-body">
                  <p>This app uses face-api.js with TinyFaceDetector, dynamically loaded through the Morpheo library system:</p>
                  <ul>
                    <li>The library is loaded on-demand when the component mounts</li>
                    <li>Only the TinyFaceDetector model is loaded for lightweight detection</li>
                    <li>Detection works on both images and live webcam feed</li>
                    <li>The app demonstrates Morpheo's dynamic library loading capabilities</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FaceDetectionApp; 