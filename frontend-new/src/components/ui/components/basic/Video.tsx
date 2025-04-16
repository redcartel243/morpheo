import React, { useEffect, useRef, useState } from 'react';

interface VideoProps {
  id?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  preload?: 'auto' | 'metadata' | 'none';
  src?: string;
  style?: React.CSSProperties;
  useCamera?: boolean;
  facingMode?: 'user' | 'environment';
  cameraConstraints?: MediaStreamConstraints;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const Video: React.FC<VideoProps> = ({
  id,
  className = '',
  width = '100%',
  height = 'auto',
  autoPlay = false,
  controls = false,
  loop = false,
  muted = false,
  poster = '',
  preload = 'auto',
  src = '',
  style = {},
  useCamera = false,
  facingMode = 'user',
  cameraConstraints,
  onError,
  onPlay,
  onPause,
  onEnded,
  ...rest
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Start/stop camera when the component mounts/unmounts
  useEffect(() => {
    if (!useCamera) return;

    let stream: MediaStream | null = null;
    const startCamera = async () => {
      setIsLoading(true);
      try {
        // Use provided constraints or fallback to defaults
        const constraints: MediaStreamConstraints = cameraConstraints || {
          video: {
            facingMode: facingMode,
          },
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error accessing camera';
        setError(errorMessage);
        console.error('Error accessing camera:', err);
        if (onError && err instanceof Error) {
          onError(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    // Cleanup function to stop camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useCamera, facingMode, cameraConstraints, onError]);

  // Handle video source
  useEffect(() => {
    if (useCamera || !src || !videoRef.current) return;
    
    videoRef.current.src = src;
  }, [src, useCamera]);

  return (
    <div style={{ position: 'relative', width, height, ...style }}>
      <video
        ref={videoRef}
        id={id}
        className={className}
        width={width}
        height={height}
        autoPlay={autoPlay || useCamera} // Auto play if using camera
        controls={controls}
        loop={loop}
        muted={muted || useCamera} // Mute if using camera to avoid feedback
        poster={poster}
        preload={preload}
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        {...rest}
      />
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          background: 'rgba(0,0,0,0.5)',
          padding: '10px',
          borderRadius: '5px'
        }}>
          Loading camera...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          background: 'rgba(255,0,0,0.7)',
          padding: '10px',
          borderRadius: '5px',
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          Camera error: {error}
        </div>
      )}
    </div>
  );
};

export default Video; 