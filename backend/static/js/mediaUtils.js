/**
 * Media Utilities for Morpheo
 * 
 * This file contains utilities for working with media (images, video, audio)
 * in a generic way without being specific to any particular domain.
 */

// MediaUtils namespace
(function(global) {
  'use strict';
  
  // Main namespace
  const mediaUtils = {};
  
  /**
   * Captures an image from a video element
   */
  mediaUtils.captureImageFromVideo = function(
    video,
    options = {}
  ) {
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
  };

  /**
   * Accesses the device camera
   */
  mediaUtils.accessCamera = async function(
    options = {}
  ) {
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
      const constraints = {
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
  };

  /**
   * Get available media devices
   */
  mediaUtils.getMediaDevices = async function() {
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
  };

  /**
   * Helper to check if the browser supports specific media features
   */
  mediaUtils.checkMediaSupport = function() {
    return {
      camera: !!navigator.mediaDevices?.getUserMedia,
      microphone: !!navigator.mediaDevices?.getUserMedia,
      deviceEnumeration: !!navigator.mediaDevices?.enumerateDevices,
      canvas: !!document.createElement('canvas').getContext('2d'),
      mediaRecording: typeof MediaRecorder !== 'undefined',
    };
  };

  /**
   * Process an image using a canvas to apply transformations
   */
  mediaUtils.processImage = function(
    imageSource,
    transformations = {}
  ) {
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
            const factor = transformations.contrast + 1;
            const intercept = 128 * (1 - factor);
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
              data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
              data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
            }
          }
          
          // Write back the image data
          ctx.putImageData(imageData, 0, 0);
        }
        
        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Represents a region of interest in a media element
   * @typedef {Object} Region
   * @property {number} x - X coordinate
   * @property {number} y - Y coordinate
   * @property {number} width - Width
   * @property {number} height - Height
   */

  /**
   * Represents a detected object in media
   * @typedef {Object} DetectedObject
   * @property {Region} region - Region where the object was detected
   * @property {number} [confidence] - Confidence score (0-1)
   * @property {string} [label] - Label or classification
   * @property {Object} [data] - Additional data about the detection
   */

  /**
   * Analyze an image to detect objects
   * In a real implementation, this would connect to ML services
   * This is a simplified placeholder
   */
  mediaUtils.analyzeImage = async function(
    imageSource,
    options = {}
  ) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // This is a placeholder implementation that returns simulated detections
        // In a real app, this would integrate with a real detection service

        const { 
          detectType = 'generic', 
          confidenceThreshold = 0.7, 
          maxDetections = 10
        } = options;
        
        // Create a canvas to analyze the image content
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions based on source
        const sourceWidth = 'videoWidth' in imageSource ? imageSource.videoWidth : imageSource.width;
        const sourceHeight = 'videoHeight' in imageSource ? imageSource.videoHeight : imageSource.height;
        
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        
        // Draw the image to the canvas
        ctx.drawImage(imageSource, 0, 0, sourceWidth, sourceHeight);
        
        // Simulate detections
        const detections = [];
        
        // Simple algorithm to find regions with significant variation
        // This is just a placeholder for demonstration
        const regions = [
          // Center-ish region - high confidence
          {
            x: Math.round(sourceWidth * 0.4),
            y: Math.round(sourceHeight * 0.35),
            width: Math.round(sourceWidth * 0.2),
            height: Math.round(sourceHeight * 0.3),
            confidence: 0.92,
            label: 'Object'
          },
          // Upper left - medium confidence 
          {
            x: Math.round(sourceWidth * 0.1),
            y: Math.round(sourceHeight * 0.1),
            width: Math.round(sourceWidth * 0.15),
            height: Math.round(sourceHeight * 0.15),
            confidence: 0.78,
            label: 'Object'
          },
          // Lower right - lower confidence
          {
            x: Math.round(sourceWidth * 0.7),
            y: Math.round(sourceHeight * 0.7),
            width: Math.round(sourceWidth * 0.15),
            height: Math.round(sourceHeight * 0.15),
            confidence: 0.65,
            label: 'Object'
          }
        ];
        
        // Filter by confidence and add to detections
        regions
          .filter(r => r.confidence >= confidenceThreshold)
          .slice(0, maxDetections)
          .forEach(r => {
            detections.push({
              region: {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height
              },
              confidence: r.confidence,
              label: r.label,
              data: {
                type: detectType,
                timestamp: Date.now()
              }
            });
          });
          
        resolve(detections);
      }, 500); // Simulate processing time
    });
  };

  /**
   * Draw detection boxes on a canvas
   */
  mediaUtils.drawDetections = function(
    canvas,
    detections,
    options = {}
  ) {
    const {
      boxColor = 'rgba(255, 0, 0, 0.7)',
      textColor = 'white',
      lineWidth = 2,
      showLabels = true,
      fontSize = 12,
      showConfidence = true
    } = options;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear previous drawings
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    detections.forEach(detection => {
      const { region, confidence, label } = detection;
      const { x, y, width, height } = region;
      
      // Draw the detection box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, width, height);
      
      // Draw the label if requested
      if (showLabels) {
        const displayText = showConfidence && confidence !== undefined
          ? `${label} (${(confidence * 100).toFixed(0)}%)`
          : label;
        
        ctx.font = `${fontSize}px Arial`;
        const textWidth = ctx.measureText(displayText).width;
        
        // Draw background for text
        ctx.fillStyle = boxColor;
        ctx.fillRect(x, y - fontSize - 4, textWidth + 6, fontSize + 6);
        
        // Draw text
        ctx.fillStyle = textColor;
        ctx.fillText(displayText, x + 3, y - 5);
      }
    });
  };

  // Export to global namespace
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mediaUtils;
  } else {
    global.mediaUtils = mediaUtils;
  }
})(typeof window !== 'undefined' ? window : this); 