import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import axios from 'axios'; // Import axios
// Import Firebase auth instance
import { auth } from '../../config/firebase';
// Remove the incorrect import
// import { useAuth } from '@/hooks/useAuth'; 
import { AnimatePresence, motion } from 'framer-motion';

// Import your API service or utility to get the token if needed
// import { getToken } from '../../utils/auth'; // Example import

interface InlinePreviewProps {
  htmlContent: string | null;
  previewMode: 'desktop' | 'mobile' | 'freeform';
}

// Define type for pending requests map
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const InlinePreview: React.FC<InlinePreviewProps> = ({ htmlContent, previewMode }) => {
  // --- Add console log for debugging env vars ---
  console.log(`InlinePreview mounted. NODE_ENV: ${process.env.NODE_ENV}. process.env:`, process.env);
  // --- End console log ---

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Store pending requests in a ref to persist across re-renders without causing effect re-runs
  const pendingRequestsRef = useRef<Record<string, PendingRequest>>({}); 

  const { generatingFullCode, modifyingCode } = useSelector((state: RootState) => state.ui);
  // Remove useSelector for token, it's fetched from Firebase auth
  // const authToken = useSelector((state: RootState) => state.auth.token); 

  // Ensure finalHtmlContent is always a string for srcDoc
  const finalHtmlContent = htmlContent || '<html><head><title>Loading...</title></head><body><p>Loading preview...</p></body></html>';

  // Remove the useAuth hook call
  // const { getToken } = useAuth(); 

  // Style for the iframe to make it fill its container
  const iframeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    overflow: 'auto !important', // Ensure iframe itself can scroll its content if needed
  };

  // Construct the full HTML for initialContent
  const completeInitialContent = htmlContent
    ? `<!DOCTYPE html><html><head><base target="_blank" /><title>Preview</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:auto;}</style></head><body>${htmlContent}</body></html>`
    : '<!DOCTYPE html><html><head><title>Loading...</title></head><body><p>Loading preview...</p></body></html>';

  // --- Function to inject the morpheoApi helper --- 
  const injectApiHelper = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        const iframeWindow = iframeRef.current.contentWindow as any; // Use any for easier global assignment
        
        // Make sure not to overwrite if already exists (e.g., during fast refresh)
        if (!iframeWindow.morpheoApi) {
            console.log('[InlinePreview - Injector] Injecting morpheoApi helper into iframe.'); // Enhanced log
            iframeWindow.morpheoApi = {
                call: (url: string, options: RequestInit = {}) => {
                    return new Promise((resolve, reject) => {
                        const requestId = Date.now().toString() + Math.random();
                        // Use the pendingRequestsRef defined in the parent scope
                        pendingRequestsRef.current[requestId] = { resolve, reject }; 
                        console.log(`[iframe morpheoApi - Caller] Sending morpheoApiRequest: ${requestId}`, { url, options }); // Enhanced log
                        // Send message to parent (InlinePreview)
                        iframeWindow.parent.postMessage(
                            { type: 'morpheoApiRequest', requestId, payload: { url, options } }, // url and options nested in payload
                            '*' // Use target origin in production
                        );
                        console.log(`[iframe morpheoApi - Caller] Message sent for requestId: ${requestId}`); // Enhanced log
                    });
                }
            };

            // Define the listener within the iframe context as well
            const handleApiResponse = (event: MessageEvent) => {
                 // Add origin check for security in production
                 // if (event.origin !== window.location.origin) return; 
                console.log('[iframe morpheoApi - Listener] Received message:', event.data); // Log ALL messages received by iframe listener
                
                // *** FIX: Destructure 'payload' instead of 'data' ***
                const { type, requestId, success, payload, error } = event.data; // Correctly get payload
                
                if (type === 'morpheoApiResponse') { 
                    console.log(`[iframe morpheoApi - Listener] Received morpheoApiResponse for ${requestId}. Success: ${success}`); // Log success status
                    const promiseFuncs = pendingRequestsRef.current[requestId];
                    if (promiseFuncs) {
                        console.log(`[iframe morpheoApi - Listener] Found pending promise for ${requestId}.`);
                        if (success) { // Check the destructured success variable
                            promiseFuncs.resolve(payload); // <-- Resolve with payload
                        } else {
                            console.error(`[iframe morpheoApi - Listener] API call failed for ${requestId}:`, error); // Log destructured error
                            promiseFuncs.reject(new Error(error)); // Reject with destructured error
                        }
                        delete pendingRequestsRef.current[requestId]; // Clean up
                    } else {
                        console.warn(`[iframe morpheoApi - Listener] Received response for unknown requestId: ${requestId}`);
                    }
                } else if (type) {
                    // Log other message types received by the iframe listener for debugging
                    console.log(`[iframe morpheoApi - Listener] Ignored message type: ${type}`); 
                }
            };
            
            // Add listener within the iframe window
            iframeWindow.addEventListener('message', handleApiResponse);
            console.log('[InlinePreview - Injector] morpheoApi helper and listener injected into iframe.'); // Enhanced log
        }
    } else {
        console.warn('[InlinePreview - Injector] Cannot inject morpheoApi: iframe or contentWindow not ready.');
    }
  }, []);

  const adjustIframeHeight = useCallback(() => {
    if (iframeRef.current) { // Check top-level ref first
      if (previewMode === 'desktop') {
        // --- MODIFICATION START: Set height to 100% for desktop too ---
        console.log('[InlinePreview] Desktop mode: Setting iframe height to 100%.');
        iframeRef.current.style.height = '100%';
        // --- Remove old scrollHeight calculation logic ---
        /*
        try {
          const iframe = iframeRef.current;
          // Check contentWindow before trying to access document
          if (iframe.contentWindow && iframe.contentWindow.document && iframe.contentWindow.document.documentElement) {
            const iframeDoc = iframe.contentWindow.document;
            
            iframe.style.display = 'block'; 
            iframe.style.height = 'auto'; 

            requestAnimationFrame(() => {
              // Re-check refs inside animation frame
              if (iframeRef.current && iframeRef.current.contentWindow && iframeRef.current.contentWindow.document) {
                const currentIframeDoc = iframeRef.current.contentWindow.document; // Use potentially updated ref
                const bodySh = currentIframeDoc.body.scrollHeight;
                const docElSh = currentIframeDoc.documentElement.scrollHeight;
                let newHeight = Math.max(bodySh, docElSh);
                const buffer = 10; 
                iframeRef.current.style.height = `${newHeight + buffer}px`;
                // console.log(`[InlinePreview] Adjusted iframe height (desktop) to: ${newHeight + buffer}px (body: ${bodySh}, docEl: ${docElSh})`);
              } else {
                console.warn("[InlinePreview] iframe or contentWindow became null inside requestAnimationFrame for desktop height adjustment.");
                if(iframeRef.current) iframeRef.current.style.height = '500px'; // Fallback if inner check fails
              }
            });
          } else {
            console.warn("[InlinePreview] iframe.contentWindow or documentElement not available for desktop height adjustment.");
            iframe.style.height = '500px'; // Fallback if contentWindow not ready initially
          }
        } catch (error) {
          console.warn("Error during desktop iframe height adjustment:", error);
          if (iframeRef.current) iframeRef.current.style.height = '500px'; // Fallback on error
        }
        */
       // --- MODIFICATION END ---
      } else { // Mobile mode
        console.log('[InlinePreview] Mobile mode: Setting iframe height to 100%.');
        iframeRef.current.style.height = '100%';
      }
    }
  }, [previewMode]);

  useEffect(() => {
    // Inject API helper once iframe is loaded or content changes
    if (iframeRef.current) {
        // The onLoad event on the iframe handles initial injection
        // Re-injecting might be needed if srcDoc changes drastically, but let's rely on onLoad for now
        // injectApiHelper(); 
    }
    // Adjust height after content potentially changes
    const timer = setTimeout(adjustIframeHeight, 250); 
    return () => clearTimeout(timer);
  }, [finalHtmlContent, adjustIframeHeight]); // Depend on content and the memoized height function

  // --- NEW: Dedicated handler for Resize Requests --- 
  const handleResizeRequest = useCallback((event: MessageEvent) => {
    // Check source? Maybe not needed if type is specific enough
    // if (event.source !== iframeRef.current?.contentWindow) return; 

    if (event.data && event.data.type === 'morpheoResizeRequest') {
      // console.log('[InlinePreview Parent] Received morpheoResizeRequest. Adjusting height (if desktop).');
      adjustIframeHeight(); 
    }
  }, [adjustIframeHeight]); // Include adjustIframeHeight in dependencies
  // --- END NEW HANDLER --- 

  const handleApiRequest = useCallback(async (event: MessageEvent) => {
    // --- DEBUG: Log all received messages --- 
    console.log('[InlinePreview Parent] Raw message received:', event.data, 'Source:', event.source);
    // --- END DEBUG --- 
    
    // --- DEBUG: Log iframe contentWindow reference --- 
    console.log('[InlinePreview Parent] Current iframeRef.current?.contentWindow:', iframeRef.current?.contentWindow);
    // --- END DEBUG ---
    
    // --- FIX: Remove potentially unreliable window source check ---
    /* 
    if (event.source !== iframeRef.current?.contentWindow) {
        console.log('[InlinePreview Parent] Message source mismatch. Ignoring.'); // DEBUG
        return; // Ignore messages not from our iframe
    } 
    */

    const { type, requestId, payload } = event.data;

    // Rely on type and payload structure for validation
    if (type !== 'morpheoApiRequest' || !payload || !requestId) {
        console.log('[InlinePreview Parent] Message type/payload invalid. Ignoring.', { type, requestId, hasPayload: !!payload }); // DEBUG
      return; // Ignore irrelevant messages
    }

    // This log should appear if the checks above pass
    console.log(`[InlinePreview Parent] Processing requestApi message:`, event.data); 

    const { url, options = {} } = payload;
    const apiUrl = `/api/proxy${url}`; // Prepend proxy path
    let responseData: any = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
        // Get the Firebase ID token asynchronously
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No Firebase user currently authenticated.');
        }
        const token = await currentUser.getIdToken(); 
        if (!token) {
            // This case is less likely if currentUser exists, but handle defensively
            throw new Error('Failed to retrieve Firebase ID token.');
        }

        const headers = {
            ...(options.headers || {}),
            'Authorization': `Bearer ${token}`, // Use Firebase token
            // Ensure Content-Type is set, especially for POST/PUT
            // Default to json unless it's a media analysis call, which sends stringified JSON
            'Content-Type': 'application/json', 
        };

        // --- Modification Start ---
        // For media analysis, the body is *already* a stringified JSON.
        // For other requests, the body might be an object that needs stringifying.
        let bodyToSend = options.body;
        if (url.includes('/api/analyze-')) {
             // Body is already stringified JSON from the iframe for media analysis
             // No further parsing or stringification needed here.
             // Ensure Content-Type is application/json as backend expects JSON string in body field
             headers['Content-Type'] = 'application/json'; 
             // bodyToSend is already payload.options.body (the string)
        } else if (bodyToSend && typeof bodyToSend !== 'string') {
             // For non-analysis calls, stringify if body is an object
             bodyToSend = JSON.stringify(bodyToSend);
             headers['Content-Type'] = 'application/json';
        }
        // --- Modification End ---


        const fetchOptions: RequestInit = {
            ...options, // Spread original options (like method)
            headers: headers,
            body: bodyToSend, // Use the correctly prepared body
        };

        console.log(`[InlinePreview Parent] Fetching ${apiUrl} with options:`, fetchOptions);

        const response = await fetch(apiUrl, fetchOptions);

        if (!response.ok) {
            let errorBody = 'Failed to read error response';
            try {
                errorBody = await response.text(); // Try reading response text
            } catch (e) { /* ignore */ }
            throw new Error(`API Error (${response.status}): ${response.statusText}. Body: ${errorBody}`);
    }

        // Assume JSON response unless specified otherwise
        responseData = await response.json();
        success = true;

      } catch (error: any) {
        console.error('[InlinePreview Parent] Error handling API request:', error);
        errorMessage = error.message || 'An unknown error occurred';
        // --- Debugging Parse Error ---
        // Check if the error originated from a failed JSON parse *within this handler*
        // The previous error "undefined is not valid JSON" likely happened *before* the fetch
        // if options.body wasn't correctly handled *before* this try block.
        // The fix above ensures `bodyToSend` is correctly set *before* the fetch.
        // If the error *still* happens, it might be in the backend proxy or the target service.
        // The previous log "Failed to parse JSON payload for media analysis request: SyntaxError: "undefined" is not valid JSON"
        // suggests the issue was indeed trying to parse `payload.options.body` *before* the fetch.
        // The fix applied should prevent this specific parsing error.
        console.error('[InlinePreview Parent] Error details for iframe:', errorMessage); // Log the error message
    }

    // Send response back to iframe
    iframeRef.current?.contentWindow?.postMessage({
        type: 'morpheoApiResponse',
        requestId: requestId,
        success: success,
        payload: responseData,
        error: errorMessage,
    }, '*');

  }, []); // Dependency array is empty as auth instance is stable and token is fetched inside

  // Effect to add and remove the message listener for BOTH request types
  useEffect(() => {
    // Listener added to the PARENT window
    console.log('[InlinePreview Parent] Adding message listeners to parent window.'); // DEBUG
    
    // --- MODIFIED: Add BOTH listeners --- 
    const combinedHandler = (event: MessageEvent) => {
        // Prioritize resize requests first for simplicity
        if (event.data && event.data.type === 'morpheoResizeRequest') {
            handleResizeRequest(event);
        } else if (event.data && event.data.type === 'morpheoApiRequest') {
            // Only call handleApiRequest if it's the correct type
            // Avoid passing resize events to the API handler
            handleApiRequest(event);
        } else {
            // Optional: Log other ignored messages
            // console.log('[InlinePreview Parent] Ignoring message:', event.data);
        }
    };
    
    window.addEventListener('message', combinedHandler);
    // window.addEventListener('message', handleResizeRequest); // OLD - replaced
    // window.addEventListener('message', handleApiRequest); // OLD - replaced
    // --- END MODIFICATION ---

    return () => {
      console.log('[InlinePreview Parent] Removing message listeners from parent window.'); // DEBUG
      // --- MODIFIED: Remove the combined listener --- 
      window.removeEventListener('message', combinedHandler);
      // window.removeEventListener('message', handleResizeRequest); // OLD
      // window.removeEventListener('message', handleApiRequest); // OLD
      // --- END MODIFICATION ---
  };

  // --- MODIFIED dependencies --- 
  }, [handleApiRequest, handleResizeRequest]); // Add handleResizeRequest to dependency array

  // Use a simpler key based on whether content exists, or remove if causing issues
  // const frameKey = htmlContent ? 'content-loaded' : 'empty';

  // --- Desktop preview container style (fills parent, minimal margin) ---
  const desktopContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: '16/9',
    background: '#18191a',
    borderRadius: '18px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.18), 0 0 0 8px #222',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '0',
    margin: 0,
    padding: 0,
  };

  // --- Mobile preview container style (fills parent, phone aspect ratio) ---
  const mobileContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: '430px', // typical phone width
    aspectRatio: '9/19.5', // modern phone aspect ratio
    margin: '0 auto',
    borderRadius: '24px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    background: '#fff',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '0',
    padding: 0,
  };

  // --- Freeform state ---
  const parentRef = useRef<HTMLDivElement>(null);
  const [freeform, setFreeform] = useState({
    width: 900,
    height: 600,
    top: 80,
    left: 80,
    dragging: false,
    resizing: false,
    resizeDir: '',
    startX: 0,
    startY: 0,
    startW: 900,
    startH: 600,
    startTop: 80,
    startLeft: 80,
    initialized: false,
  });
  const minW = 320, minH = 200;

  // Center freeform preview on first switch to freeform mode
  useEffect(() => {
    if (previewMode === 'freeform' && !freeform.initialized && parentRef.current) {
      const parent = parentRef.current;
      const pw = parent.offsetWidth, ph = parent.offsetHeight;
      const width = freeform.width, height = freeform.height;
      const left = Math.max(0, Math.floor((pw - width) / 2));
      const top = Math.max(0, Math.floor((ph - height) / 2));
      setFreeform(f => ({ ...f, left, top, initialized: true }));
    } else if (previewMode !== 'freeform' && freeform.initialized) {
      setFreeform(f => ({ ...f, initialized: false }));
    }
  }, [previewMode, freeform.initialized, freeform.width, freeform.height]);

  // --- Drag logic ---
  const onDragStart = (e: React.MouseEvent) => {
    if (previewMode !== 'freeform') return;
    e.preventDefault();
    setFreeform(f => ({ ...f, dragging: true, startX: e.clientX, startY: e.clientY, startTop: f.top, startLeft: f.left }));
    document.body.style.cursor = 'move';
  };
  const onDrag = (e: MouseEvent) => {
    setFreeform(f => {
      if (!f.dragging) return f;
      const parent = parentRef.current;
      let newLeft = f.startLeft + (e.clientX - f.startX);
      let newTop = f.startTop + (e.clientY - f.startY);
      // Clamp within parent
      if (parent) {
        const pw = parent.offsetWidth, ph = parent.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, pw - f.width));
        newTop = Math.max(0, Math.min(newTop, ph - f.height));
      }
      return { ...f, left: newLeft, top: newTop };
    });
  };
  const onDragEnd = () => {
    setFreeform(f => ({ ...f, dragging: false }));
    document.body.style.cursor = '';
  };

  // --- Resize logic ---
  const onResizeStart = (dir: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFreeform(f => ({ ...f, resizing: true, resizeDir: dir, startX: e.clientX, startY: e.clientY, startW: f.width, startH: f.height, startTop: f.top, startLeft: f.left }));
    document.body.style.cursor = dir.includes('e') ? 'ew-resize' : dir.includes('s') ? 'ns-resize' : 'nwse-resize';
  };
  const onResize = (e: MouseEvent) => {
    setFreeform(f => {
      if (!f.resizing) return f;
      let { width, height, top, left, startX, startY, startW, startH, startTop, startLeft, resizeDir } = f;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let newW = startW, newH = startH, newTop = startTop, newLeft = startLeft;
      if (resizeDir.includes('e')) newW = Math.max(minW, startW + dx);
      if (resizeDir.includes('s')) newH = Math.max(minH, startH + dy);
      if (resizeDir.includes('w')) {
        newW = Math.max(minW, startW - dx);
        newLeft = startLeft + dx;
      }
      if (resizeDir.includes('n')) {
        newH = Math.max(minH, startH - dy);
        newTop = startTop + dy;
      }
      // Clamp within parent
      const parent = parentRef.current;
      if (parent) {
        const pw = parent.offsetWidth, ph = parent.offsetHeight;
        newW = Math.min(newW, pw - newLeft);
        newH = Math.min(newH, ph - newTop);
        newLeft = Math.max(0, Math.min(newLeft, pw - newW));
        newTop = Math.max(0, Math.min(newTop, ph - newH));
      }
      return { ...f, width: newW, height: newH, top: newTop, left: newLeft };
    });
  };
  const onResizeEnd = () => {
    setFreeform(f => ({ ...f, resizing: false, resizeDir: '' }));
    document.body.style.cursor = '';
  };

  // --- Global mouse event listeners for drag/resize ---
  useEffect(() => {
    if (previewMode !== 'freeform') return;
    const move = (e: MouseEvent) => {
      if (freeform.dragging) onDrag(e);
      if (freeform.resizing) onResize(e);
    };
    const up = () => {
      if (freeform.dragging) onDragEnd();
      if (freeform.resizing) onResizeEnd();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [freeform.dragging, freeform.resizing, previewMode]);

  // --- Resize handles ---
  const handles = [
    { dir: 'nw', style: { top: -6, left: -6, cursor: 'nwse-resize' } },
    { dir: 'n', style: { top: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
    { dir: 'ne', style: { top: -6, right: -6, cursor: 'nesw-resize' } },
    { dir: 'e', style: { top: '50%', right: -6, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
    { dir: 'se', style: { bottom: -6, right: -6, cursor: 'nwse-resize' } },
    { dir: 's', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
    { dir: 'sw', style: { bottom: -6, left: -6, cursor: 'nesw-resize' } },
    { dir: 'w', style: { top: '50%', left: -6, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
  ];

  // --- Animation variants ---
  const variants = {
    initial: { opacity: 0, scale: 0.98, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35 } },
    exit: { opacity: 0, scale: 0.98, y: -20, transition: { duration: 0.25 } },
  };

  return (
    <div ref={parentRef} style={{ width: '100%', height: '100vh', minHeight: 0, position: 'relative' }}>
      <AnimatePresence mode="wait">
        {previewMode === 'desktop' && (
          <motion.div key="desktop" variants={variants} initial="initial" animate="animate" exit="exit" style={{ width: '100%', height: '100%' }}>
            <div style={desktopContainerStyle}>
              <iframe
                ref={iframeRef}
                srcDoc={finalHtmlContent}
                style={{ ...iframeStyle, borderRadius: '12px', background: '#fff' }}
                width="100%"
                height="100%"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
                onLoad={() => {
                  injectApiHelper();
                  adjustIframeHeight();
                }}
                title="Preview Content"
              />
            </div>
          </motion.div>
        )}
        {previewMode === 'mobile' && (
          <motion.div key="mobile" variants={variants} initial="initial" animate="animate" exit="exit" style={{ width: '100%', height: '100%' }}>
            <div style={mobileContainerStyle}>
              <iframe
                ref={iframeRef}
                srcDoc={finalHtmlContent}
                style={iframeStyle}
                width="100%"
                height="100%"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
                onLoad={() => {
                  injectApiHelper();
                  adjustIframeHeight();
                }}
                title="Preview Content"
              />
            </div>
          </motion.div>
        )}
        {previewMode === 'freeform' && (
          <motion.div
            key="freeform"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'absolute',
              top: freeform.top,
              left: freeform.left,
              width: freeform.width,
              height: freeform.height,
              background: '#18191a', // Device shell background
              borderRadius: 18,
              boxShadow: '0 4px 32px rgba(0,0,0,0.18), 0 0 0 8px #222',
              overflow: 'hidden',
              zIndex: 10,
              userSelect: freeform.dragging || freeform.resizing ? 'none' : 'auto',
              border: '2px solid #a0aec0',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'stretch',
              minWidth: minW,
              minHeight: minH,
              cursor: freeform.dragging ? 'move' : 'default',
            }}
            onMouseDown={onDragStart}
          >
            {/* The entire preview box (including border/shadow) is now draggable/resizable */}
            <iframe
              ref={iframeRef}
              srcDoc={finalHtmlContent}
              style={{ ...iframeStyle, borderRadius: 12, background: 'transparent', pointerEvents: freeform.dragging || freeform.resizing ? 'none' : 'auto' }}
              width="100%"
              height="100%"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
              onLoad={() => {
                injectApiHelper();
                adjustIframeHeight();
              }}
              title="Preview Content"
            />
            {/* Resize handles */}
            {handles.map(h => (
              <div
                key={h.dir}
                onMouseDown={onResizeStart(h.dir)}
                style={{
                  position: 'absolute',
                  width: 14,
                  height: 14,
                  background: '#fff',
                  border: '2px solid #a0aec0',
                  borderRadius: 8,
                  zIndex: 20,
                  ...h.style,
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlinePreview; 