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
  liveUpdateCommand?: {
    targetId: string;
    propertySchema: any;
    newValue: any;
  } | null;
  selectedComponent?: string | null;
}

// Define type for pending requests map
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const InlinePreview: React.FC<InlinePreviewProps> = ({ htmlContent, previewMode, liveUpdateCommand, selectedComponent }) => {
  // --- Add console log for debugging env vars ---
  console.log(`InlinePreview mounted. NODE_ENV: ${process.env.NODE_ENV}. process.env:`, process.env);
  // --- End console log ---

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Store pending requests in a ref to persist across re-renders without causing effect re-runs
  const pendingRequestsRef = useRef<Record<string, PendingRequest>>({}); 

  const { generatingFullCode, modifyingCode, streamCompletedSuccessfully } = useSelector((state: RootState) => state.ui);
  // Remove useSelector for token, it's fetched from Firebase auth
  // const authToken = useSelector((state: RootState) => state.auth.token); 

  // --- Add console log for htmlContent prop ---
  useEffect(() => {
    console.log('[InlinePreview] htmlContent prop updated:', htmlContent);
  }, [htmlContent]);
  // --- End console log ---

  // --- Define the core iframe script ---
  const coreIframeScript = `
    (function() {
      let lastSelectedEl = null;
      let currentFullHtml = ''; // Store the full HTML to avoid re-appending same content
      console.log('[IFRAME_SCRIPT] Core script loaded and running (streaming enabled).');

      function highlightSelected(morpheoId) {
        if (lastSelectedEl) {
          lastSelectedEl.style.outline = '';
          lastSelectedEl.classList.remove('morpheo-selected-highlight');
        }
        if (morpheoId) {
          const el = document.querySelector('[data-morpheo-id="' + morpheoId + '"]');
          if (el) {
            el.style.outline = '3px solid #805ad5';
            el.classList.add('morpheo-selected-highlight');
            lastSelectedEl = el;
          } else {
            lastSelectedEl = null;
          }
        } else {
          lastSelectedEl = null;
        }
      }

      window.addEventListener('message', function(event) {
        const { type, morpheoId, script, htmlChunk } = event.data || {}; // Removed unused schema, values from destructuring for this top-level handler

        switch (type) {
          case 'MORPHEO_STREAM_CHUNK':
            console.log('[IFRAME_SCRIPT] Received MORPHEO_STREAM_CHUNK. htmlChunk length:', htmlChunk ? htmlChunk.length : 'null');
            const contentRoot = document.getElementById('content-root');
            if (contentRoot) {
              console.log('[IFRAME_SCRIPT] #content-root found.');
              if (htmlChunk && htmlChunk !== currentFullHtml) {
                contentRoot.innerHTML = htmlChunk; 
                currentFullHtml = htmlChunk;
                console.log('[IFRAME_SCRIPT] #content-root.innerHTML updated.');
              } else if (htmlChunk === currentFullHtml) {
                console.log('[IFRAME_SCRIPT] htmlChunk is same as currentFullHtml, no update to innerHTML.');
              } else if (!htmlChunk) {
                console.log('[IFRAME_SCRIPT] htmlChunk is null/empty, no update to innerHTML.');
              }
            } else {
              console.error('[IFRAME_SCRIPT] #content-root not found for streaming chunk.');
            }
            break;

          case 'MORPHEO_EXECUTE_LIVE_SCRIPT':
            console.log('[IFRAME_SCRIPT] Executing live script:', script);
            try {
              eval(script); // Be cautious with eval
            } catch (e) {
              console.error('IFRAME_SCRIPT Error executing live script:', e, script);
            }
            break;

          case 'MORPHEO_EXTRACT_PROPERTIES':
            // console.log('[IFRAME_SCRIPT] Extracting properties for id:', morpheoId);
            const elToExtract = document.querySelector('[data-morpheo-id="' + morpheoId + '"]');
            if (!elToExtract) {
              window.parent.postMessage({ type: 'MORPHEO_PROPERTIES', morpheoId, schema: [], values: {} }, '*');
              return;
            }
            let originalOutline = elToExtract.style.outline;
            let hadHighlightClass = elToExtract.classList.contains('morpheo-selected-highlight');
            elToExtract.style.outline = '';
            if (hadHighlightClass) {
              elToExtract.classList.remove('morpheo-selected-highlight');
            }
            var extractedSchema = [];
            var extractedValues = {};
            // Attribute extraction
            for (var i = 0; i < elToExtract.attributes.length; i++) {
              var attr = elToExtract.attributes[i];
              if (attr.name.startsWith('data-') || attr.name === 'style' || attr.name === 'class') continue; // Added 'class' to exclusion
              var name = attr.name;
              var value = attr.value;
              var propType = 'string';
              if (/color/i.test(name) && /^#([0-9a-f]{3}){1,2}$|rgb|hsl/i.test(value)) propType = 'color';
              else if (value === 'true' || value === 'false') propType = 'boolean';
              // Simplified number check: check if it's a number string and not empty
              else if (value !== '' && !isNaN(Number(value))) propType = 'number';
              
              extractedSchema.push({ name, label: name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), type: propType });
              extractedValues[name] = propType === 'number' ? Number(value) : propType === 'boolean' ? value === 'true' : value;
            }
            // Style extraction (example for a few common style properties)
            const computedStyle = window.getComputedStyle(elToExtract);
            const relevantStyles = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'padding', 'margin', 'width', 'height']; // Example list
            relevantStyles.forEach(styleName => {
                const styleValue = computedStyle.getPropertyValue(styleName);
                if (styleValue) { // Only add if a value exists
                    let stylePropType = 'string';
                    if (/color/i.test(styleName) && /^#([0-9a-f]{3}){1,2}$|rgb|hsl/i.test(styleValue)) stylePropType = 'color';
                    else if (styleValue.match(/px$|em$|rem$|%$|vw$|vh$/) && !isNaN(parseFloat(styleValue))) stylePropType = 'string'; // Keep as string for units like '10px'
                    else if (styleValue !== '' && !isNaN(Number(styleValue))) stylePropType = 'number';

                    extractedSchema.push({ 
                        name: styleName, 
                        label: styleName.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, c => c.toUpperCase()), // Format camelCase
                        type: stylePropType, 
                        isStyle: true 
                    });
                    extractedValues[styleName] = stylePropType === 'number' ? Number(styleValue) : styleValue;
                }
            });

            window.parent.postMessage({ type: 'MORPHEO_PROPERTIES', morpheoId, schema: extractedSchema, values: extractedValues }, '*');
            if (originalOutline || hadHighlightClass) {
              elToExtract.style.outline = '3px solid #805ad5';
              if(hadHighlightClass) elToExtract.classList.add('morpheo-selected-highlight');
            }
            break;

          case 'MORPHEO_HIGHLIGHT_SELECTION':
            highlightSelected(morpheoId);
            break;

          default:
            break;
        }
      });

      document.addEventListener('click', function(e) {
        let el = e.target;
        let clickedMorpheoId = null;
        let depth = 0;
        while (el && el !== document.body && depth < 10) {
          if (el.hasAttribute && el.hasAttribute('data-morpheo-id')) {
            clickedMorpheoId = el.getAttribute('data-morpheo-id');
            const morpheoType = el.getAttribute('data-component-type') || null;
            window.parent.postMessage({ type: 'MORPHEO_COMPONENT_SELECT', morpheoId: clickedMorpheoId, morpheoType }, '*');
            break;
          }
          el = el.parentElement;
          depth++;
        }
      }, true);

      console.log('[IFRAME_SCRIPT] Event listeners attached (streaming enabled).');
      window.parent.postMessage({ type: 'MORPHEO_IFRAME_READY' }, '*');
    })();
  `;
  // --- End core iframe script ---

  const initialIframeSrcDoc = `<!DOCTYPE html>
    <html>
    <head>
      <base target="_blank" />
      <title>Preview</title>
      <style>
        html, body { margin:0; padding:0; width:100%; height:100%; overflow:auto; }
        #content-root { width:100%; height:100%; } /* Ensure content root takes full space */
        .morpheo-selected-highlight { outline: 3px solid #805ad5 !important; box-shadow: 0 0 0 3px rgba(128, 90, 213, 0.3) !important; z-index: 9999 !important; }
      </style>
    </head>
    <body>
      <div id="content-root"></div>
      <script>${coreIframeScript}</script>
    </body>
    </html>
  `;
  
  const iframeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    overflow: 'auto !important', // Ensure iframe itself can scroll its content if needed
  };

  // State to manage if the iframe is ready to receive stream messages
  const [iframeReadyForStream, setIframeReadyForStream] = useState(false);

  // Use the new initialIframeSrcDoc for the iframe's srcDoc initially
  const [currentSrcDoc, setCurrentSrcDoc] = useState(initialIframeSrcDoc);

  // This effect handles sending chunks to the iframe via postMessage
  useEffect(() => {
    // --- Add console log for iframeReadyForStream state ---
    console.log('[InlinePreview] Effect for sending chunks. iframeReadyForStream:', iframeReadyForStream, 'generatingFullCode:', generatingFullCode, 'modifyingCode:', modifyingCode, 'htmlContent:', !!htmlContent);
    // --- End console log ---
    if (iframeRef.current && iframeRef.current.contentWindow && htmlContent && (generatingFullCode || modifyingCode) && iframeReadyForStream) {
      console.log('[InlinePreview] Streaming: Posting MORPHEO_STREAM_CHUNK to iframe. Content length:', htmlContent.length);
      iframeRef.current.contentWindow.postMessage({ type: 'MORPHEO_STREAM_CHUNK', htmlChunk: htmlContent }, '*');
    }
  }, [htmlContent, generatingFullCode, modifyingCode, iframeReadyForStream]);

  // This effect handles the final content load or non-streaming updates
  useEffect(() => {
    if (htmlContent && (!generatingFullCode && !modifyingCode)) {
      console.log('[InlinePreview] Non-streaming/final update: Setting full srcDoc.');
      // Construct the full HTML: Take the user's generated htmlContent for the body,
      // and ensure our core script and necessary styles are in the head.
      
      let finalHtml = htmlContent;
      
      // Ensure the core script is present. Add it before </body> or at the end.
        const bodyEndTag = '</body>';
      const bodyEndIndex = finalHtml.toLowerCase().lastIndexOf(bodyEndTag);
      const scriptTag = `<script>${coreIframeScript}</script>`;
        if (bodyEndIndex !== -1) {
        finalHtml = finalHtml.substring(0, bodyEndIndex) + scriptTag + finalHtml.substring(bodyEndIndex);
        } else {
        finalHtml += scriptTag; // Append if no body tag found (less ideal)
        }

      // Ensure highlight style is present in the head
        const headEndTag = '</head>';
      const headEndIndex = finalHtml.toLowerCase().lastIndexOf(headEndTag);
      const highlightStyleTag = `<style>.morpheo-selected-highlight { outline: 3px solid #805ad5 !important; box-shadow: 0 0 0 3px rgba(128, 90, 213, 0.3) !important; z-index: 9999 !important; }</style>`;
      
      let headContent = '';
      let bodyContent = finalHtml;

        if (headEndIndex !== -1) {
        headContent = finalHtml.substring(finalHtml.toLowerCase().indexOf('<head>') + '<head>'.length, headEndIndex);
        // Check if our highlight style is already in headContent to avoid duplication
        if (!headContent.includes('.morpheo-selected-highlight')) {
            headContent += highlightStyleTag;
        }
        bodyContent = finalHtml.substring(finalHtml.toLowerCase().indexOf('<body>')); // Assumes body tag exists
        } else {
        // No <head> tag found, create one with the style
        headContent = `<title>Preview</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:auto;}</style>${highlightStyleTag}`;
        // The script is already added to finalHtml (which is bodyContent here)
      }
      
      // Reconstruct the document. If htmlContent provided a full HTML structure, try to respect it.
      // Otherwise, wrap it.
      if (htmlContent.toLowerCase().startsWith('<!doctype html>') || htmlContent.toLowerCase().startsWith('<html>')) {
         // User provided full HTML, try to inject script and styles carefully
         // This logic re-inserts the script and style if not present or if body/head tags are missing.
         // For simplicity, the current logic above might add script/style again if user content also had them.
         // A more robust merge would be complex. Let's assume htmlContent is mostly body content for now.
         // The current addition of scriptTag and highlightStyleTag to finalHtml aims to ensure they are there.
         // The below reconstruction might be simplified if we assume htmlContent is just body inner HTML.

        let tempFinalSrcDoc = htmlContent;
        // Ensure highlight style
        if (tempFinalSrcDoc.toLowerCase().includes('</head>')) {
            if (!tempFinalSrcDoc.includes('.morpheo-selected-highlight')) {
                 tempFinalSrcDoc = tempFinalSrcDoc.replace('</head>', `${highlightStyleTag}</head>`);
            }
        } else {
            tempFinalSrcDoc = `<head>${highlightStyleTag}</head>${tempFinalSrcDoc}`;
        }
        // Ensure script
        if (tempFinalSrcDoc.toLowerCase().includes('</body>')) {
            if(!tempFinalSrcDoc.includes(coreIframeScript.substring(0,50))) { // check a snippet
                tempFinalSrcDoc = tempFinalSrcDoc.replace('</body>', `${scriptTag}</body>`);
            }
        } else {
            tempFinalSrcDoc += scriptTag;
        }
        setCurrentSrcDoc(tempFinalSrcDoc);

      } else {
        // htmlContent is likely partial (e.g. just body elements)
        setCurrentSrcDoc(`<!DOCTYPE html>
          <html>
          <head>
            <base target="_blank" />
            ${headContent}
          </head>
          ${bodyContent}`); // bodyContent already has script if it was appended
      }

      setIframeReadyForStream(false); 
    } else if (!htmlContent && (!generatingFullCode && !modifyingCode)) {
      console.log('[InlinePreview] No content and not generating: Setting initial iframe srcDoc.');
      setCurrentSrcDoc(initialIframeSrcDoc);
      setIframeReadyForStream(false);
    }
  }, [htmlContent, generatingFullCode, modifyingCode, streamCompletedSuccessfully, initialIframeSrcDoc, coreIframeScript]);

  // Log the complete srcDoc content for debugging script injection
  useEffect(() => {
    console.log('[InlinePreview] currentSrcDoc (for iframe):', currentSrcDoc);
  }, [currentSrcDoc]);

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
  }, [currentSrcDoc, adjustIframeHeight]); // Depend on content and the memoized height function

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
    console.log('[InlinePreview Parent] Adding message listeners to parent window.');
    
    const combinedHandler = (event: MessageEvent) => {
        // Ensure message is from our iframe
        if (event.source !== iframeRef.current?.contentWindow) {
            // console.warn('[InlinePreview Parent] Message from unexpected source ignored:', event.source, event.data);
            return;
        }

        const { type: messageType, morpheoId, requestId, payload } = event.data || {};

        // Handle iframe ready signal for streaming
        if (messageType === 'MORPHEO_IFRAME_READY') {
            console.log('[InlinePreview Parent] Received MORPHEO_IFRAME_READY from iframe.');
            setIframeReadyForStream(true);
            // After iframe signals ready, if we are in a streaming state and have content, send it immediately.
            // This handles cases where content might have been set in Redux before the iframe was ready.
            if (iframeRef.current && iframeRef.current.contentWindow && htmlContent && (generatingFullCode || modifyingCode)) {
                console.log('[InlinePreview Parent] Iframe ready, sending initial/missed MORPHEO_STREAM_CHUNK. Content length:', htmlContent.length);
                iframeRef.current.contentWindow.postMessage({ type: 'MORPHEO_STREAM_CHUNK', htmlChunk: htmlContent }, '*');
            }
            return; // MORPHEO_IFRAME_READY is handled.
        }
        
        // Delegate to other handlers based on type
        if (messageType === 'morpheoResizeRequest') {
            // console.log('[InlinePreview Parent] Routing to handleResizeRequest');
            handleResizeRequest(event);
        } else if (messageType === 'morpheoApiRequest' && requestId && payload) {
            // console.log('[InlinePreview Parent] Routing to handleApiRequest');
            handleApiRequest(event);
        } else if (messageType === 'MORPHEO_COMPONENT_SELECT' && morpheoId) {
             // console.log('[InlinePreview Parent] Routing to selectComponent (placeholder)');
             // Placeholder: dispatch action to select component based on morpheoId and morpheoType from event.data
             // Example: dispatch(selectComponent({ id: morpheoId, type: event.data.morpheoType }));
        } else if (messageType === 'MORPHEO_PROPERTIES' && morpheoId) {
            // console.log('[InlinePreview Parent] Routing to handleExtractedProperties (placeholder)');
            // Placeholder: dispatch action to store extracted properties
            // Example: dispatch(setExtractedProperties({ schema: event.data.schema, values: event.data.values }));
        }
        // Add other specific message type handling here if needed
    };
    
    window.addEventListener('message', combinedHandler);

    return () => {
      console.log('[InlinePreview Parent] Removing message listeners from parent window.');
      window.removeEventListener('message', combinedHandler);
  };
  // Ensure htmlContent, generatingFullCode, modifyingCode are dependencies for the MORPHEO_IFRAME_READY logic that sends initial chunk.
  }, [handleApiRequest, handleResizeRequest, htmlContent, generatingFullCode, modifyingCode]); 

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

  // Live update effect: send script to iframe when liveUpdateCommand changes
  useEffect(() => {
    if (liveUpdateCommand && iframeRef.current && iframeRef.current.contentWindow) {
      const { targetId, propertySchema, newValue } = liveUpdateCommand;
      const iframeWindow = iframeRef.current.contentWindow;
      if (propertySchema.liveUpdateSnippet) {
        let serializedValue;
        if (typeof newValue === 'string') {
          serializedValue = `'${newValue.replace(/'/g, "\\'")}'`;
        } else if (typeof newValue === 'number' || typeof newValue === 'boolean') {
          serializedValue = newValue.toString();
        } else {
          console.warn('[InlinePreview] Live update for unsupported value type:', newValue);
          return;
        }
        const scriptToExecute = `(${propertySchema.liveUpdateSnippet})(${serializedValue});`;
        iframeWindow.postMessage({
          type: 'MORPHEO_EXECUTE_LIVE_SCRIPT',
          script: scriptToExecute
        }, '*');
      } else if (propertySchema.htmlAttribute && targetId) {
        const script = `\n          try {\n            const el = document.querySelector('[data-morpheo-id="${targetId}"]');\n            if (el) {\n              el.setAttribute('${propertySchema.htmlAttribute}', '${newValue.toString().replace(/'/g, "\\'")}');\n            } else {\n              console.warn('Element with data-morpheo-id ${targetId} not found for live HTML attribute update.');\n            }\n          } catch (e) {\n            console.error('Error live updating HTML attribute:', e);\n          }\n        `;
        iframeWindow.postMessage({
          type: 'MORPHEO_EXECUTE_LIVE_SCRIPT',
          script: script
        }, '*');
      } else {
        console.warn('[InlinePreview] No live update method for property:', propertySchema.label);
      }
    }
  }, [liveUpdateCommand]);

  // Highlight selected element when selectedComponent changes
  useEffect(() => {
    if (iframeRef.current && selectedComponent) {
      iframeRef.current.contentWindow?.postMessage({ type: 'MORPHEO_HIGHLIGHT_SELECTION', morpheoId: selectedComponent }, '*');
      console.log('[InlinePreview] Sent MORPHEO_HIGHLIGHT_SELECTION for', selectedComponent);
    }
  }, [selectedComponent]);

  return (
    <div ref={parentRef} style={{ width: '100%', height: '100vh', minHeight: 0, position: 'relative' }}>
      <AnimatePresence mode="wait">
        {previewMode === 'desktop' && (
          <motion.div key="desktop" variants={variants} initial="initial" animate="animate" exit="exit" style={{ width: '100%', height: '100%' }}>
            <div style={desktopContainerStyle}>
              <iframe
                ref={iframeRef}
                srcDoc={currentSrcDoc}
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
                srcDoc={currentSrcDoc}
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
              srcDoc={currentSrcDoc}
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