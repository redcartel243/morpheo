/**
 * Media Utilities for Morpheo
 * 
 * This file contains utilities for working with media (images, video, audio)
 * in a generic way without being specific to any particular domain.
 */

/**
 * Represents a region of interest in a media element
 */
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Represents a detected object in media
 */
export interface DetectedObject {
  region: Region;
  confidence?: number;
  label?: string;
  data?: Record<string, any>;
}

/**
 * Camera access options
 */
export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  frameRate?: number;
  audio?: boolean;
}

/**
 * Captures an image from a video element
 */
export function captureImageFromVideo(
  video: HTMLVideoElement,
  options: {
    width?: number;
    height?: number;
    format?: 'image/jpeg' | 'image/png';
    quality?: number;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas to draw the capture
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set dimensions
      const width = options.width || video.videoWidth;
      const height = options.height || video.videoHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the current video frame on the canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to data URL
      const format = options.format || 'image/jpeg';
      const quality = options.quality || 0.9;
      const dataUrl = canvas.toDataURL(format, quality);
      
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Accesses the device camera
 */
export async function accessCamera(
  options: CameraOptions = {}
): Promise<MediaStream> {
  try {
    // Default options
    const {
      facingMode = 'user',
      width = undefined,
      height = undefined,
      frameRate = undefined,
      audio = false
    } = options;
    
    // Build constraints
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode,
        ...(width && { width: { ideal: width } }),
        ...(height && { height: { ideal: height } }),
        ...(frameRate && { frameRate: { ideal: frameRate } })
      },
      audio
    };
    
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    throw error;
  }
}

/**
 * Get available media devices
 */
export async function getMediaDevices(): Promise<MediaDeviceInfo[]> {
  try {
    // Request permission first (required by some browsers)
    await navigator.mediaDevices.getUserMedia({ video: true });
    
    // Get all devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Filter to video input devices (cameras)
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error getting media devices:', error);
    throw error;
  }
}

/**
 * Helper to check if the browser supports specific media features
 */
export function checkMediaSupport(): {
  camera: boolean;
  microphone: boolean;
  deviceEnumeration: boolean;
  canvas: boolean;
  mediaRecording: boolean;
} {
  return {
    camera: !!navigator.mediaDevices?.getUserMedia,
    microphone: !!navigator.mediaDevices?.getUserMedia,
    deviceEnumeration: !!navigator.mediaDevices?.enumerateDevices,
    canvas: !!document.createElement('canvas').getContext('2d'),
    mediaRecording: typeof MediaRecorder !== 'undefined',
  };
}

/**
 * Process an image using a canvas to apply transformations
 */
export function processImage(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  transformations: {
    resize?: { width: number; height: number };
    grayscale?: boolean;
    blur?: number;
    brightness?: number; // -1 to 1
    contrast?: number; // -1 to 1
    rotate?: number; // degrees
    flip?: { horizontal?: boolean; vertical?: boolean };
    crop?: Region;
  } = {}
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Get source dimensions
      const sourceWidth = 'videoWidth' in imageSource ? imageSource.videoWidth : imageSource.width;
      const sourceHeight = 'videoHeight' in imageSource ? imageSource.videoHeight : imageSource.height;
      
      // Set output dimensions
      const outputWidth = transformations.resize?.width || sourceWidth;
      const outputHeight = transformations.resize?.height || sourceHeight;
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      // Crop region if specified
      const crop = transformations.crop || { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
      
      // Apply transformations
      
      // Begin by saving the current state
      ctx.save();
      
      // Handle rotation
      if (transformations.rotate) {
        ctx.translate(outputWidth / 2, outputHeight / 2);
        ctx.rotate((transformations.rotate * Math.PI) / 180);
        ctx.translate(-outputWidth / 2, -outputHeight / 2);
      }
      
      // Handle flips
      if (transformations.flip?.horizontal) {
        ctx.translate(outputWidth, 0);
        ctx.scale(-1, 1);
      }
      
      if (transformations.flip?.vertical) {
        ctx.translate(0, outputHeight);
        ctx.scale(1, -1);
      }
      
      // Draw the image with crop and resize
      ctx.drawImage(
        imageSource,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, outputWidth, outputHeight
      );
      
      // Restore state
      ctx.restore();
      
      // Apply pixel-level transformations
      if (transformations.grayscale || transformations.blur || 
          transformations.brightness !== undefined || transformations.contrast !== undefined) {
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
        const data = imageData.data;
        
        // Apply grayscale
        if (transformations.grayscale) {
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
          }
        }
        
        // Apply brightness
        if (transformations.brightness !== undefined) {
          const factor = transformations.brightness * 255;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + factor));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + factor));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + factor));
          }
        }
        
        // Apply contrast
        if (transformations.contrast !== undefined) {
          const factor = (transformations.contrast + 1) * 255 / 255;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * factor) + 128));
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * factor) + 128));
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * factor) + 128));
          }
        }
        
        // Apply blur (simplified box blur)
        if (transformations.blur && transformations.blur > 0) {
          const blur = Math.min(10, Math.max(1, Math.floor(transformations.blur)));
          const blurredData = new Uint8ClampedArray(data.length);
          
          // Copy existing data
          blurredData.set(data);
          
          // Apply a very simple box blur
          for (let y = blur; y < outputHeight - blur; y++) {
            for (let x = blur; x < outputWidth - blur; x++) {
              const pixelIndex = (y * outputWidth + x) * 4;
              
              let r = 0, g = 0, b = 0, count = 0;
              
              // Sample the surrounding pixels
              for (let ky = -blur; ky <= blur; ky++) {
                for (let kx = -blur; kx <= blur; kx++) {
                  const index = ((y + ky) * outputWidth + (x + kx)) * 4;
                  r += data[index];
                  g += data[index + 1];
                  b += data[index + 2];
                  count++;
                }
              }
              
              // Set the averaged value
              blurredData[pixelIndex] = r / count;
              blurredData[pixelIndex + 1] = g / count;
              blurredData[pixelIndex + 2] = b / count;
              // Keep original alpha
              blurredData[pixelIndex + 3] = data[pixelIndex + 3];
            }
          }
          
          // Update the image data
          data.set(blurredData);
        }
        
        // Put the modified data back
        ctx.putImageData(imageData, 0, 0);
      }
      
      resolve(canvas);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Analyze an image for objects of interest (using a placeholder implementation)
 * In a real app, this would call into a computer vision library or API
 */
export async function analyzeImage(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options: {
    detectType?: 'generic' | 'object' | 'text' | 'barcode';
    confidenceThreshold?: number;
    maxDetections?: number;
  } = {}
): Promise<DetectedObject[]> {
  const {
    detectType = 'generic',
    confidenceThreshold = 0.5,
    maxDetections = 10
  } = options;
  
  // Create a canvas to analyze the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Get image dimensions
  const width = 'videoWidth' in imageSource ? imageSource.videoWidth : imageSource.width;
  const height = 'videoHeight' in imageSource ? imageSource.videoHeight : imageSource.height;
  
  canvas.width = width;
  canvas.height = height;
  
  // Draw the image
  ctx.drawImage(imageSource, 0, 0, width, height);
  
  // This is a placeholder implementation - just returns a centered region
  // In a real application, this would call a proper computer vision library or API
  const results: DetectedObject[] = [];
  
  // Simulate analysis based on detection type (placeholder implementation)
  // In a real app, this would call different ML models or APIs
  
  if (detectType === 'text') {
    // Simulate text detection with multiple regions
    const regions = [
      { x: width * 0.1, y: height * 0.2, width: width * 0.3, height: height * 0.1 },
      { x: width * 0.1, y: height * 0.4, width: width * 0.4, height: height * 0.1 },
      { x: width * 0.1, y: height * 0.6, width: width * 0.5, height: height * 0.1 }
    ];
    
    regions.forEach((region, i) => {
      results.push({
        region,
        confidence: 0.8 + (i * 0.05),
        label: 'text',
        data: { text: `Sample text ${i + 1}` }
      });
    });
  } else if (detectType === 'barcode') {
    // Simulate barcode detection
    results.push({
      region: {
        x: width * 0.3,
        y: height * 0.4,
        width: width * 0.4,
        height: height * 0.2
      },
      confidence: 0.95,
      label: 'barcode',
      data: { format: 'QR_CODE', value: 'https://example.com' }
    });
  } else {
    // Generic object detection (placeholder)
    const objectWidth = width / 3;
    const objectHeight = height / 3;
    
    results.push({
      region: {
        x: (width - objectWidth) / 2,
        y: (height - objectHeight) / 2,
        width: objectWidth,
        height: objectHeight
      },
      confidence: 0.85,
      label: 'object'
    });
  }
  
  // Filter by confidence and limit results
  return results
    .filter(obj => (obj.confidence || 0) >= confidenceThreshold)
    .slice(0, maxDetections);
}

/**
 * Draw detection results on a canvas
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: DetectedObject[],
  options: {
    boxColor?: string;
    textColor?: string;
    lineWidth?: number;
    showLabels?: boolean;
    fontSize?: number;
    showConfidence?: boolean;
  } = {}
): void {
  const {
    boxColor = 'rgba(255, 0, 0, 0.7)',
    textColor = 'white',
    lineWidth = 2,
    showLabels = true,
    fontSize = 14,
    showConfidence = true
  } = options;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Set drawing styles
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = lineWidth;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = textColor;
  
  // Draw each detection
  detections.forEach(detection => {
    const { region, label, confidence } = detection;
    
    // Draw rectangle
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    
    // Draw label if enabled
    if (showLabels && label) {
      let labelText = label;
      
      // Add confidence if enabled
      if (showConfidence && confidence !== undefined) {
        labelText += ` (${(confidence * 100).toFixed(0)}%)`;
      }
      
      // Draw background for text
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(region.x, region.y - fontSize - 4, textWidth + 8, fontSize + 8);
      
      // Draw text
      ctx.fillStyle = textColor;
      ctx.fillText(labelText, region.x + 4, region.y - 4);
    }
  });
} 