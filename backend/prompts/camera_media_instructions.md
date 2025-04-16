# CAMERA AND MEDIA PROCESSING INSTRUCTIONS

## VIDEO AND CAMERA IMPLEMENTATION

When implementing camera-based applications or any application that requires video input:

1. **Always use the proper video component type**:
   ```json
   {
     "id": "media-input",
     "type": "video", 
     "properties": {
       "useCamera": true,
       "facingMode": "user",
       "autoPlay": true,
       "muted": true
     }
   }
   ```

2. **Add canvas overlay for visualizations**:
   ```json
   {
     "id": "detection-overlay",
     "type": "canvas",
     "properties": {
       "overlayFor": "media-input",
       "transparent": true
     },
     "styles": {
       "position": "absolute",
       "top": "0",
       "left": "0",
       "width": "100%",
       "height": "100%"
     }
   }
   ```

3. **Implement proper camera access**:
   - Use the MediaDevices API through the video component's built-in functionality
   - Do not use placeholder images or static containers

4. **Handle canvas drawing properly**:
   - Match canvas dimensions to video dimensions
   - Clear the canvas before drawing new content
   - Use standard canvas methods for drawing

5. **Include library loading for specialized detection**:
   - Load appropriate libraries like face-api.js for face detection
   - Include proper error handling and status updates

6. **Use generic naming conventions**:
   - Use "Media Analysis" or "Object Detection" instead of domain-specific terms
   - Refer to "objects" or "elements" instead of specific types (like "faces")

## EXAMPLE IMPLEMENTATION

For face recognition or similar camera-based detection applications:

```javascript
// Initialize detection
async function initializeDetection($m) {
  // Load required libraries
  await loadLibrary('face-api.js');
  
  // Access camera through video element
  const video = document.getElementById('media-input');
  
  // Set up canvas overlay
  const canvas = document.getElementById('detection-overlay');
  
  // Match dimensions
  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };
  faceapi.matchDimensions(canvas, displaySize);
  
  // Start detection loop
  setInterval(async () => {
    // Perform detection
    const detections = await faceapi.detectAllFaces(video);
    
    // Draw results on canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, detections);
    
    // Update UI
    $m('#results').setProperty('content', `Detected ${detections.length} object(s)`);
  }, 100);
}
```

## IMPORTANT GUIDELINES

1. **NEVER use static images as placeholders** for camera views
2. **ALWAYS implement proper error handling** for camera access
3. **ALWAYS provide status feedback** to the user during initialization and processing
4. **USE generic component IDs and terminology** to maintain Morpheo's domain-agnostic philosophy
5. **IMPLEMENT proper cleanup** when stopping camera access (track.stop()) 