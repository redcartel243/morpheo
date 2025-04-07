import React, { useState, useEffect } from 'react';
import { loadLibrary, useLibrary } from '../utils/LibraryManager';
import ComponentFactory from '../components/ui/ComponentFactory';

/**
 * Examples of components that use dynamic library loading
 */
const DynamicLibraryExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  // Common UI for all examples
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dynamic Library Loading Examples</h1>
      
      <p className="mb-6 text-gray-700">
        These examples demonstrate how Morpheo dynamically loads external libraries only when needed.
        Each component will automatically fetch its required dependencies when rendered.
      </p>
      
      {/* Tab navigation */}
      <div className="flex border-b mb-6">
        <button 
          className={`py-2 px-4 ${activeTab === 'editor' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('editor')}
        >
          Code Editor
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'richtext' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('richtext')}
        >
          Rich Text Editor
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'maps' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('maps')}
        >
          Maps
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'ml' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('ml')}
        >
          Machine Learning
        </button>
      </div>
      
      {/* Examples */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        {activeTab === 'editor' && <CodeEditorExample />}
        {activeTab === 'richtext' && <RichTextExample />}
        {activeTab === 'maps' && <MapsExample />}
        {activeTab === 'ml' && <MachineLearningExample />}
      </div>
      
      {/* Documentation */}
      <div className="mt-8 bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <p className="mb-3">
          Morpheo uses a dynamic library loading system that:
        </p>
        <ul className="list-disc ml-6 space-y-2 mb-4">
          <li>Only loads external libraries when they're actually required by components</li>
          <li>Handles dependencies between libraries automatically</li>
          <li>Provides graceful fallbacks when libraries can't be loaded</li>
          <li>Caches libraries to avoid repeated downloads</li>
          <li>Supports version-specific loading for compatibility</li>
        </ul>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm mb-4 overflow-x-auto">
{`// Example usage in your own components:
import { loadLibrary, useLibrary } from '../utils/LibraryManager';

function YourComponent() {
  useEffect(() => {
    async function loadDependencies() {
      try {
        // Load the library
        await loadLibrary('chart.js');
        
        // Get access to the library
        const Chart = await useLibrary('chart.js');
        
        // Use the library...
      } catch (error) {
        console.error("Failed to load library:", error);
      }
    }
    
    loadDependencies();
  }, []);
  
  return <div>Your component content</div>;
}`}
        </pre>
      </div>
    </div>
  );
};

/**
 * Example of a code editor component that dynamically loads Monaco Editor
 */
const CodeEditorExample: React.FC = () => {
  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [editorValue, setEditorValue] = useState<string>(
`// Example TypeScript code
function greeting(name: string): string {
  return \`Hello, \${name}!\`;
}

const result = greeting("World");
console.log(result);`
  );
  const editorContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadMonacoEditor = async () => {
      try {
        // Load Monaco Editor with special loading handler
        await loadLibrary('monaco-editor');
        if (!isMounted) return;
        
        // Once loaded, we can use the global require loaded by Monaco
        const monaco = (window as any).monaco;
        
        if (editorContainerRef.current && monaco) {
          // Create editor instance
          const editor = monaco.editor.create(editorContainerRef.current, {
            value: editorValue,
            language: 'typescript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            roundedSelection: true,
            wordWrap: 'on',
          });
          
          // Store editor instance
          setEditorInstance(editor);
          setEditorReady(true);
          
          // Update state when editor content changes
          editor.onDidChangeModelContent(() => {
            setEditorValue(editor.getValue());
          });
        }
      } catch (error) {
        console.error("Failed to load Monaco Editor:", error);
      }
    };
    
    loadMonacoEditor();
    
    return () => {
      isMounted = false;
      // Dispose editor instance on unmount
      if (editorInstance && editorInstance.dispose) {
        editorInstance.dispose();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Monaco Code Editor</h2>
      <p className="text-gray-600">
        This component dynamically loads Microsoft's Monaco Editor (the engine behind VS Code).
        The 1MB+ JavaScript bundle is only loaded when this component is rendered.
      </p>
      
      <div 
        ref={editorContainerRef} 
        className="border rounded-md" 
        style={{ height: '300px', width: '100%' }}
      >
        {!editorReady && (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            <span>Loading Monaco Editor...</span>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-gray-100 rounded-md text-sm">
        <p className="font-semibold">Libraries Loaded:</p>
        <ul className="list-disc ml-5 mt-1">
          <li>monaco-editor (~1.2MB)</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Example of a rich text editor that dynamically loads Quill
 */
const RichTextExample: React.FC = () => {
  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadQuillEditor = async () => {
      try {
        // Load Quill editor
        await loadLibrary('quill');
        if (!isMounted) return;
        
        const Quill = (window as any).Quill;
        
        if (editorContainerRef.current && toolbarRef.current && Quill) {
          // Create editor instance
          const editor = new Quill(editorContainerRef.current, {
            modules: {
              toolbar: toolbarRef.current
            },
            theme: 'snow'
          });
          
          // Set initial content
          editor.clipboard.dangerouslyPasteHTML(`
            <h2>Welcome to Quill Rich Text Editor</h2>
            <p>This editor is <strong>dynamically loaded</strong> when needed.</p>
            <p>Try formatting this text or adding <em>new content</em>!</p>
          `);
          
          // Store editor instance
          setEditorInstance(editor);
          setEditorReady(true);
        }
      } catch (error) {
        console.error("Failed to load Quill Editor:", error);
      }
    };
    
    loadQuillEditor();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Quill Rich Text Editor</h2>
      <p className="text-gray-600">
        This rich text editor uses Quill.js, which is loaded on demand with its CSS styles.
        The editor only appears after the library has been successfully loaded.
      </p>
      
      <div className="border rounded-md">
        <div ref={toolbarRef} style={{ display: editorReady ? 'block' : 'none' }}>
          <span className="ql-formats">
            <select className="ql-header">
              <option value="1">Heading</option>
              <option value="2">Subheading</option>
              <option value="3">Subheading 2</option>
              <option selected>Normal</option>
            </select>
            <select className="ql-font">
              <option selected>Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </span>
          <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
            <button className="ql-strike"></button>
          </span>
          <span className="ql-formats">
            <select className="ql-color"></select>
            <select className="ql-background"></select>
          </span>
          <span className="ql-formats">
            <button className="ql-list" value="ordered"></button>
            <button className="ql-list" value="bullet"></button>
            <button className="ql-indent" value="-1"></button>
            <button className="ql-indent" value="+1"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-link"></button>
            <button className="ql-image"></button>
            <button className="ql-video"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-clean"></button>
          </span>
        </div>
        
        <div 
          ref={editorContainerRef} 
          style={{ height: '250px', display: editorReady ? 'block' : 'none' }}
        ></div>
        
        {!editorReady && (
          <div className="flex items-center justify-center h-300px bg-gray-100 p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            <span>Loading Quill Editor...</span>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-gray-100 rounded-md text-sm">
        <p className="font-semibold">Libraries Loaded:</p>
        <ul className="list-disc ml-5 mt-1">
          <li>quill.js (~100KB)</li>
          <li>quill.snow.css (~20KB)</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Example of a map component that dynamically loads Leaflet
 */
const MapsExample: React.FC = () => {
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadLeafletMap = async () => {
      try {
        // Load Leaflet library
        await loadLibrary('leaflet');
        if (!isMounted) return;
        
        const L = (window as any).L;
        
        if (mapContainerRef.current && L) {
          // Initialize map
          const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);
          
          // Add tile layer (OpenStreetMap)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
          
          // Add a marker
          L.marker([51.5, -0.09])
            .addTo(map)
            .bindPopup('A sample marker that you can click on.')
            .openPopup();
          
          // Add a circle
          L.circle([51.508, -0.11], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 500
          }).addTo(map);
          
          // Store map instance
          setMapInstance(map);
          setMapReady(true);
        }
      } catch (error) {
        console.error("Failed to load Leaflet Map:", error);
      }
    };
    
    loadLeafletMap();
    
    return () => {
      isMounted = false;
      // Clean up map instance
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Leaflet Interactive Map</h2>
      <p className="text-gray-600">
        This component dynamically loads the Leaflet mapping library when needed.
        The map and all interactive features only appear after the library is loaded.
      </p>
      
      <div 
        ref={mapContainerRef} 
        style={{ height: '400px', width: '100%', display: mapReady ? 'block' : 'none' }}
      ></div>
      
      {!mapReady && (
        <div className="flex items-center justify-center h-400px bg-gray-100 border rounded-md">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span>Loading Leaflet Map...</span>
        </div>
      )}
      
      <div className="p-3 bg-gray-100 rounded-md text-sm">
        <p className="font-semibold">Libraries Loaded:</p>
        <ul className="list-disc ml-5 mt-1">
          <li>leaflet.js (~140KB)</li>
          <li>leaflet.css (~12KB)</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Example of a machine learning component that dynamically loads TensorFlow.js
 */
const MachineLearningExample: React.FC = () => {
  const [tensorflowReady, setTensorflowReady] = useState<boolean>(false);
  const [predicting, setPredicting] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [model, setModel] = useState<any>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Initialize canvas for drawing
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 280;
      canvas.height = 280;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 15;
        ctx.lineCap = "round";
        ctx.strokeStyle = "white";
        ctxRef.current = ctx;
      }
    }
  }, []);

  // Load TensorFlow.js and MNIST model
  useEffect(() => {
    let isMounted = true;
    
    const loadTensorflow = async () => {
      try {
        // Load TensorFlow.js library
        await loadLibrary('tensorflow');
        if (!isMounted) return;
        
        const tf = (window as any).tf;
        setTensorflowReady(true);
        
        // Load pre-trained MNIST model
        try {
          // In real application, you would load from a real URL
          // For this demo, we'll create a simple model
          const model = tf.sequential();
          
          // Add layers
          model.add(tf.layers.conv2d({
            inputShape: [28, 28, 1],
            kernelSize: 3,
            filters: 16,
            activation: 'relu'
          }));
          model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
          model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
          model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
          model.add(tf.layers.flatten({}));
          model.add(tf.layers.dense({units: 64, activation: 'relu'}));
          model.add(tf.layers.dense({units: 10, activation: 'softmax'}));
          
          // Compile model
          model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
          });
          
          setModel(model);
          setModelLoaded(true);
        } catch (modelError) {
          console.error("Failed to load MNIST model:", modelError);
        }
      } catch (error) {
        console.error("Failed to load TensorFlow.js:", error);
      }
    };
    
    loadTensorflow();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctxRef.current || !canvasRef.current) return;
    const ctx = ctxRef.current;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  
  const endDrawing = () => {
    if (!ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  };
  
  // Clear canvas
  const clearCanvas = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
  };
  
  // Make prediction
  const predictDigit = async () => {
    if (!tensorflowReady || !modelLoaded || !model || !canvasRef.current) return;
    
    setPredicting(true);
    
    try {
      const tf = (window as any).tf;
      const canvas = canvasRef.current;
      
      // Prepare image data
      const imageData = ctxRef.current?.getImageData(0, 0, canvas.width, canvas.height);
      
      if (!imageData) {
        throw new Error("Failed to get image data from canvas");
      }
      
      // In a real app, you would preprocess the image properly
      // This is a simplified version for the demo
      const tensor = tf.browser.fromPixels(imageData, 1)
        .resizeBilinear([28, 28])
        .toFloat()
        .div(255.0)
        .expandDims(0);
      
      // Get prediction
      const result = await model.predict(tensor).data();
      
      // Find the digit with highest confidence
      let maxIndex = 0;
      let maxConfidence = result[0];
      
      for (let i = 1; i < result.length; i++) {
        if (result[i] > maxConfidence) {
          maxIndex = i;
          maxConfidence = result[i];
        }
      }
      
      setPrediction({
        digit: maxIndex,
        confidence: maxConfidence
      });
    } catch (error) {
      console.error("Error making prediction:", error);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Digit Recognition with TensorFlow.js</h2>
      <p className="text-gray-600">
        This example dynamically loads TensorFlow.js to perform handwritten digit recognition.
        Draw a digit (0-9) in the box below and the model will try to recognize it.
      </p>
      
      {tensorflowReady ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border border-gray-300 rounded-md overflow-hidden inline-block">
              <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
                style={{ touchAction: 'none' }}
              />
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={clearCanvas}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Clear
              </button>
              
              <button 
                onClick={predictDigit}
                disabled={!modelLoaded || predicting}
                className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md ${(!modelLoaded || predicting) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {predicting ? 'Predicting...' : 'Recognize Digit'}
              </button>
            </div>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3">Prediction Result</h3>
            
            {modelLoaded ? (
              prediction ? (
                <div className="text-center py-4">
                  <div className="text-7xl font-bold mb-2">{prediction.digit}</div>
                  <div className="text-gray-600">
                    Confidence: {(prediction.confidence * 100).toFixed(2)}%
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Draw a digit and click "Recognize Digit"
                </div>
              )
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <span>Loading MNIST model...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-300px bg-gray-100 border rounded-md">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span>Loading TensorFlow.js...</span>
        </div>
      )}
      
      <div className="p-3 bg-gray-100 rounded-md text-sm">
        <p className="font-semibold">Libraries Loaded:</p>
        <ul className="list-disc ml-5 mt-1">
          <li>tensorflow.js (~800KB)</li>
        </ul>
        <p className="mt-2 text-xs text-gray-600">
          Note: In a real application, you would also load a pre-trained model (~1-5MB).
          For this demo, we're using a simplified model created on the fly.
        </p>
      </div>
    </div>
  );
};

export default DynamicLibraryExample; 