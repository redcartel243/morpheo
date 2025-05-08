import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// REMOVED: useNavigate import
// import { useNavigate } from 'react-router-dom'; 
import { AppState } from '../../store/store';
// Import actions and thunks, including the new generateCodeWithFiles thunk
import { 
  // generateFullCode, // Keep if still used elsewhere, otherwise remove
  modifyGeneratedCode, 
  clearError, 
  setLastPrompt, 
  setFullGeneratedHtml, // Keep this if setLoadedGeneration uses it, or for other direct sets
  generateCodeWithFiles // Import the new thunk
} from '../../store/slices/uiSlice'; 
// Removed imports for Card, Grid, Text
// Import Firebase auth
import { auth } from '../../config/firebase'; 

// Define Props interface
interface UIGeneratorProps {
  isProcessing: boolean; // Whether generation or modification is active
}

// Update component signature to accept props
export const UIGenerator: React.FC<UIGeneratorProps> = ({ isProcessing }) => {
  const dispatch = useDispatch();
  // REMOVED: navigate constant
  // const navigate = useNavigate(); 
  const [promptText, setPromptText] = useState('');
  const [modificationText, setModificationText] = useState(''); // State for modification prompt
  const [error, setError] = useState<string | null>(null);
  
  // Select state needed for modification
  const { generatedHtmlContent, lastPrompt, modificationError } = useSelector(
    (state: AppState) => state.ui
  );
  
  // Use the passed-in isProcessing prop instead of generatingCode selector
  // const generatingCode = useSelector(
  //   (state: AppState) => state.ui.generatingFullCode
  // );
  
  // --- State for Media Analysis --- 
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // --- End State for Media Analysis ---
  
  // --- NEW State for Initial Prompt File Uploads ---
  const [selectedPromptFiles, setSelectedPromptFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // KEEP THIS ONE

  // Selector for Redux error state (if you want to use it instead of local state)
  const reduxError = useSelector((state: AppState) => state.ui.error || state.ui.modificationError);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) {
      setError('Please enter a description of the UI you want to create');
      return;
    }
    // Clear local error and potentially Redux error before dispatching
    setError(null);
    dispatch(clearError()); 
    // No need to dispatch setLastPrompt here, the thunk does it in pending case

    try {
      console.log('Dispatching generateCodeWithFiles thunk...');
      // Dispatch the new thunk with prompt and files
      const result = await dispatch(generateCodeWithFiles({ 
          prompt: promptText, 
          files: selectedPromptFiles 
        }) as any); // Use 'as any' or ensure correct thunk typing

      // Check if the thunk was rejected
      if (generateCodeWithFiles.rejected.match(result)) {
        console.error('generateCodeWithFiles thunk rejected:', result.payload);
        // Error state is now handled by the rejected reducer, 
        // so no need to call setError locally unless desired for specific UI reasons.
        // setError(result.payload as string || 'Failed to generate UI with files.');
      } else {
        // Thunk fulfilled successfully
        console.log('generateCodeWithFiles thunk fulfilled.');
        // Clear the form inputs on successful dispatch initiation 
        // (Actual success state is handled by the fulfilled reducer)
        setPromptText(''); 
        setSelectedPromptFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

    } catch (err) {
      // Catch potential errors during the dispatch process itself (less common)
      console.error('Error dispatching generateCodeWithFiles thunk:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
    // Note: Loading state (isProcessing) should now be primarily driven by the 
    // state.ui.generatingFullCode boolean updated by the thunk's pending/fulfilled/rejected reducers.
    // The component should select generatingFullCode and use that for disabling inputs/showing loading indicators.
  };

  // Modification Handler
  const handleModifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modificationText.trim()) {
      setError('Please enter modification instructions.');
      return;
    }
    if (!generatedHtmlContent) {
        setError('No existing code to modify.');
        return;
    }
    setError(null);
    dispatch(clearError()); // Clear previous errors

    try {
      console.log('Dispatching modifyGeneratedCode thunk');
      const result = await dispatch(modifyGeneratedCode({ 
        modificationPrompt: modificationText, 
        currentHtml: generatedHtmlContent 
      }) as any);

      if (modifyGeneratedCode.rejected.match(result)) {
        console.error('Error modifying code:', result.payload || result.error.message);
        setError(typeof result.payload === 'string' ? result.payload : (result.error.message || 'Failed to modify UI'));
      } else {
        console.log('modifyGeneratedCode successful. Preview updated.');
        setModificationText(''); // Clear modification prompt
      }
    } catch (err) {
      console.error('Failed to dispatch modifyGeneratedCode:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while modifying the UI');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        setError('Failed to read file content as text.');
        return;
      }

      try {
        console.log('Read code from file:', content.substring(0, 100) + '...');
        console.warn("File import logic for React code is deprecated. File content not loaded into state.");
        setError("Importing React code via file is currently disabled.");
      } catch (dispatchError: any) {
        console.error('Error setting component code or navigating:', dispatchError);
        setError(dispatchError.message || 'An error occurred loading the code.');
      }
    };

    reader.onerror = () => {
      setError('Error reading file.');
    };

    reader.readAsText(file);
    event.target.value = ''; 
  };

  // --- Handlers for Media Analysis --- 
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisError(null); // Clear previous errors
      setAnalysisResult(null); // Clear previous results
      console.log('Selected file:', file.name, file.type, file.size);
    }
  };

  const handleAnalysisSubmit = async (endpoint: '/api/analyze-image' | '/api/analyze-video' | '/api/analyze-audio') => {
    if (!selectedFile) {
      setAnalysisError('Please select a file to analyze.');
      return;
    }
    if (!analysisPrompt.trim()) {
      setAnalysisError('Please enter an analysis prompt.');
      return;
    }
    
    setAnalysisError(null);
    setAnalysisResult(null);
    setIsAnalyzing(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const token = await currentUser.getIdToken();
      if (!token) {
        throw new Error('Failed to retrieve Firebase ID token.');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('prompt', analysisPrompt);
      
      console.log(`Sending request to ${endpoint} with prompt: ${analysisPrompt} and file: ${selectedFile.name}`);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${endpoint}`,
        {
          method: 'POST',
          headers: {
            // 'Content-Type': 'multipart/form-data' is set automatically by fetch for FormData
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
      }

      console.log(`Received analysis result from ${endpoint}:`, result);
      setAnalysisResult(result.analysis || 'No analysis content returned.');

    } catch (err: any) {
      console.error(`Error analyzing file via ${endpoint}:`, err);
      setAnalysisError(err.message || 'An unknown error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  // --- End Handlers for Media Analysis ---
  
  return (
    <div className="space-y-8">
      {/* --- Generation Form --- */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-6">
          <h2 className="card-title mb-4">
            Generate UI
          </h2>
          <form onSubmit={handleGenerateSubmit} className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium mb-1">
                Describe the UI you want to create:
              </label>
              <textarea
                id="prompt"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={5}
                className="textarea textarea-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., A dashboard for tracking daily expenses..."
                disabled={isProcessing} 
              />
            </div>
            <div>
              <p className="text-xs text-base-content/70">
                <strong>Pro tip:</strong> For visuals like backgrounds...
              </p>
            </div>
            
            {/* --- Inserting File Input UI Here --- */}
            <div className="mb-4">
              <label htmlFor="promptFiles" className="block text-sm font-medium mb-1">
                Attach Files (Optional - e.g., data.json, content.md, logo.png):
              </label>
              <input 
                type="file"
                id="promptFiles"
                ref={fileInputRef} 
                multiple 
                onChange={(e) => setSelectedPromptFiles(e.target.files)}
                className="file-input file-input-bordered file-input-primary w-full max-w-full mb-2"
                disabled={isProcessing} // Use the isProcessing prop
                // Optional: Specify accepted types
                // accept=".json,.csv,.md,.txt,image/*,video/*,audio/*" 
              />
              {/* Display selected files */}
              {selectedPromptFiles && selectedPromptFiles.length > 0 && (
                <div className="text-xs mt-1 p-2 bg-base-200 rounded space-y-1">
                  <p className="font-semibold">Selected files:</p>
                  {Array.from(selectedPromptFiles).map((file, index) => (
                    <div key={index} className="flex justify-between items-center text-base-content/80">
                      <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      {/* Implement remove file functionality if needed */}
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      setSelectedPromptFiles(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }} 
                    className="btn btn-xs btn-ghost text-error hover:bg-error/10 mt-1"
                  >
                    Clear Files
                  </button>
                </div>
              )}
            </div>
            {/* --- End File Input UI --- */}
            
            <button
              type="submit"
              disabled={isProcessing || !promptText.trim()}
              className="btn btn-primary w-full"
            >
              {isProcessing ? (
                <><span className="loading loading-spinner mr-2"></span> Processing...</> 
              ) : (
                'Generate Preview'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* --- Modification Form (conditional) --- */}
      {generatedHtmlContent && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-6">
            <h2 className="card-title mb-4">
              Modify UI
            </h2>
            <form onSubmit={handleModifySubmit} className="space-y-4">
              <div>
                <label htmlFor="modificationPrompt" className="block text-sm font-medium mb-1">
                  Describe the changes you want:
                </label>
                <textarea
                  id="modificationPrompt"
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  rows={3}
                  className="textarea textarea-bordered w-full focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g., Change the background color to blue, add a title to the table"
                  disabled={isProcessing} 
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !modificationText.trim()} 
                className="btn btn-secondary w-full"
              >
                {isProcessing ? (
                  <><span className="loading loading-spinner mr-2"></span> Processing...</> 
                ) : (
                  'Apply Modifications'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Temporary Media Analysis Testing Area --- */}
      <div className="card bg-base-200 shadow-xl mt-8">
        <div className="card-body p-6">
          <h2 className="card-title mb-4">TEMP: Media Analysis Testing</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="analysisFile" className="block text-sm font-medium mb-1">
                Select Media File (Image/Video/Audio):
              </label>
              <input 
                type="file"
                id="analysisFile"
                onChange={handleFileSelect}
                className="file-input file-input-bordered w-full"
                accept="image/*,video/*,audio/*" // Accept common media types
                disabled={isAnalyzing}
              />
              {selectedFile && <p className="text-xs mt-1">Selected: {selectedFile.name} ({selectedFile.type})</p>}
            </div>
            <div>
              <label htmlFor="analysisPrompt" className="block text-sm font-medium mb-1">
                Analysis Prompt:
              </label>
              <textarea
                id="analysisPrompt"
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                rows={2}
                className="textarea textarea-bordered w-full focus:outline-none focus:ring-2 focus:ring-info disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., Describe this image, summarize this video, transcribe this audio..."
                disabled={isAnalyzing}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button 
                onClick={() => handleAnalysisSubmit('/api/analyze-image')}
                disabled={isAnalyzing || !selectedFile || !analysisPrompt.trim()}
                className="btn btn-info w-full"
              >
                {isAnalyzing ? <span className="loading loading-spinner"></span> : 'Analyze Image'}
              </button>
               <button 
                onClick={() => handleAnalysisSubmit('/api/analyze-video')}
                disabled={isAnalyzing || !selectedFile || !analysisPrompt.trim()}
                className="btn btn-info w-full"
              >
                {isAnalyzing ? <span className="loading loading-spinner"></span> : 'Analyze Video'}
              </button>
               <button 
                onClick={() => handleAnalysisSubmit('/api/analyze-audio')}
                disabled={isAnalyzing || !selectedFile || !analysisPrompt.trim()}
                className="btn btn-info w-full"
              >
                {isAnalyzing ? <span className="loading loading-spinner"></span> : 'Analyze Audio'}
              </button>
            </div>
          </div>
          {analysisResult && (
            <div className="mt-4 p-4 bg-base-100 rounded-md">
              <h3 className="font-semibold mb-2">Analysis Result:</h3>
              <pre className="whitespace-pre-wrap text-sm">{analysisResult}</pre>
            </div>
          )}
          {analysisError && (
            <div role="alert" className="alert alert-warning mt-4 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span><strong>Analysis Error:</strong> {analysisError}</span>
            </div>
          )}
        </div>
      </div>
      {/* --- End Temporary Area --- */}

      {/* Error Display Area */}
      {(error || modificationError) && (
        <div role="alert" className="alert alert-error shadow-md">
           <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Error:</strong> {error || modificationError}</span>
        </div>
      )}

      {/* Deprecated Import/Guided Mode Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          type="button"
          onClick={handleImportClick}
          disabled={true}
          className="btn btn-outline btn-accent w-full sm:w-auto" 
        >
          Import JSON (Disabled)
        </button>
        <button
          type="button"
          onClick={() => { console.warn('Guided mode navigation removed.'); }}
          disabled={true}
          className="btn btn-outline w-full sm:w-auto"
        >
          Guided Mode (Disabled)
        </button>
      </div>

      {/* Hidden file input */}
      <input 
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="submit"
          disabled={isProcessing || !promptText.trim()}
          className="btn btn-primary w-full sm:w-auto"
        >
          {isProcessing ? (
            <><span className="loading loading-spinner mr-2"></span> Processing...</> 
          ) : (
            'Generate Preview'
          )}
        </button>
        <button
          type="submit"
          disabled={isProcessing || !modificationText.trim()}
          className="btn btn-secondary w-full sm:w-auto"
        >
          {isProcessing ? (
            <><span className="loading loading-spinner mr-2"></span> Processing...</> 
          ) : (
            'Apply Modifications'
          )}
        </button>
      </div>
    </div>
  );
}; 