import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RootState } from '../store';
import { clearGeneratedCode, clearError, saveGeneration, clearLoadedGenerationFlags, undoModification, redoModification, fetchSuggestions, generateCodeWithFiles, modifyCodeWithFiles, setLiveUpdateCommand, clearLiveUpdateCommand, PropertySchema } from '../store/slices/uiSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { auth } from '../config/firebase';
import InlinePreview from '../components/preview/InlinePreview';
import toast from 'react-hot-toast';
import ManualEditPanel from '../components/ui/components/basic/ManualEditPanel';

import {
  Box,
  Flex,
  Textarea, 
  Button,   
  Spinner, 
  Alert,
  CloseButton,
  VStack, 
  Heading,
  Text, 
  ButtonGroup, 
  IconButton, 
  useDisclosure,
  Dialog, 
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogCloseTrigger, 
  Icon,
  useBreakpointValue,
} from '@chakra-ui/react';

import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiSmartphone, FiSave, FiCode, FiRewind, FiFastForward, FiGift, FiTrash2, FiMove, FiMaximize, FiMinimize, FiEdit } from 'react-icons/fi'; 

interface ExamplePrompt {
  name: string;
  prompt: string;
}
const examplePrompts: ExamplePrompt[] = [ 
  {
    name: "Simple Calculator",
    prompt: "Create a simple calculator app",
  },
  {
    name: "To-Do List",
    prompt: "Create a to-do list app",
  },
  {
    name: "Weather App",
    prompt: "Create a weather app",
  },
];

// Instrument HTML with data-morpheo-id attributes for manual edit mode
function instrumentHtmlWithMorpheoIds(html: string): string {
  let idCounter = 0;
  // Add data-morpheo-id to all major tags
  return html.replace(/<(section|form|header|footer|main|div|button|input|textarea|table|tr|td|th|ul|li|a|img)(\s|>)/gi, (match, tag, after) => {
    idCounter++;
    return `<${tag} data-morpheo-id="morpheo-${tag}-${idCounter}"${after}`;
  });
}

// Define the structure for component property data
interface ComponentPropertyData {
  schema: PropertySchema[];
  values: Record<string, any>;
}

const GeneratorPage: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [modificationPrompt, setModificationPrompt] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'freeform'>('desktop');
  const dispatch = useAppDispatch();
  
  const [selectedPromptFiles, setSelectedPromptFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [selectedModifyFiles, setSelectedModifyFiles] = useState<FileList | null>(null);
  const modifyFileInputRef = useRef<HTMLInputElement>(null);

  const {
    generatedHtmlContent,
    generatingFullCode,
    modifyingCode,
    error,
    modificationError,
    streamCompletedSuccessfully,
    lastPrompt, 
    loadedGenerationHtml, 
    loadedGenerationPrompt, 
    htmlHistory,
    historyIndex,
    suggestions,
    loadingSuggestions,
    suggestionsError,
    liveUpdateCommandForPreview,
  } = useAppSelector((state: RootState) => state.ui);

  const { mode } = useAppSelector((state: RootState) => state.theme);
  const bgColor = mode === 'dark' ? 'gray.900' : 'gray.100';
  const promptBg = mode === 'dark' ? 'gray.800' : 'white';
  const previewBg = mode === 'dark' ? 'gray.900' : 'gray.800'; 
  const modifyBg = mode === 'dark' ? 'gray.800' : 'gray.50';
  const textColor = mode === 'dark' ? 'gray.100' : 'gray.800';
  const placeholderColor = mode === 'dark' ? 'gray.500' : 'gray.500';
  const borderColor = mode === 'dark' ? 'gray.700' : 'gray.200';
  const focusBorderColor = mode === 'dark' ? 'purple.300' : 'purple.500';
  const buttonColorScheme = 'purple';

  const { open: isCodeModalOpen, onOpen: onCodeModalOpen, onClose: onCodeModalClose } = useDisclosure();

  // --- Mock selection state for demonstration ---
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Wrap componentProperties definition in useMemo and provide explicit type
  const componentProperties = useMemo<Record<string, ComponentPropertyData>>(() => ({
    sphere: {
      schema: [
        { name: 'color', label: 'Sphere Color', type: 'color', liveUpdateSnippet: "(val) => { if(window.sphere) window.sphere.material.color.set(val); }" },
        { name: 'radius', label: 'Sphere Radius', type: 'number', min: 0.1, max: 10, step: 0.1, liveUpdateSnippet: "(val) => { if(window.sphere) { window.sphere.geometry.dispose(); window.sphere.geometry = new THREE.SphereGeometry(val, 32, 32); } }" },
        { name: 'metalness', label: 'Metalness', type: 'number', min: 0, max: 1, step: 0.01, liveUpdateSnippet: "(val) => { if(window.sphere) window.sphere.material.metalness = val; }" },
        { name: 'roughness', label: 'Roughness', type: 'number', min: 0, max: 1, step: 0.01, liveUpdateSnippet: "(val) => { if(window.sphere) window.sphere.material.roughness = val; }" },
      ],
      values: { color: '#29abe2', radius: 2, metalness: 0.3, roughness: 0.5 },
    },
    // Add more components as needed
  }), []); // Empty dependency array means it's created only once

  // State for current editable values
  const [propertySchema, setPropertySchema] = useState<PropertySchema[]>([]);
  const [propertyValues, setPropertyValues] = useState<Record<string, any>>({});
  // Local HTML content for preview regeneration
  const [localHtmlContent, setLocalHtmlContent] = useState<string>("");

  // Manual edit mode state
  const [manualEditMode, setManualEditMode] = useState(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);

  // Use breakpoint hook for mobile detection
  const isMobile = useBreakpointValue({ base: true, md: false });

  // --- DEBUG: Log state during render ---
  console.log('[GeneratorPage Render] State Values:', {
    selectedComponent,
    manualEditMode,
    isPreviewFullScreen,
    isMobile,
    propertySchema,
    propertyValues,
  });
  // --- END DEBUG ---

  // When a component is selected, set schema/values from local map
  useEffect(() => {
    if (selectedComponent && componentProperties[selectedComponent]) {
      // Access is now type-safe due to the Record<string, ComponentPropertyData> type
      const props = componentProperties[selectedComponent];
      setPropertySchema(props.schema);
      setPropertyValues(props.values);
    }
  }, [selectedComponent, componentProperties]); // Correct dependency array

  // Handler for live update (onChange)
  const handlePropertyChange = (property: PropertySchema, value: any) => {
    setPropertyValues(prev => ({ ...prev, [property.name]: value }));
    dispatch(setLiveUpdateCommand({
      targetId: selectedComponent || '',
      propertySchema: property,
      newValue: value,
    }));
    setTimeout(() => dispatch(clearLiveUpdateCommand()), 100);
  };

  // Handler for commit (onBlur/Enter): update local state and regenerate preview
  const handleCommitProperty = (property: PropertySchema, value: any) => {
    setPropertyValues(prev => {
      const updated = { ...prev, [property.name]: value };
      // Regenerate HTML/JS for preview (simulate for demo)
      if (selectedComponent === 'sphere') {
        // For demo, just update the color/radius/metalness/roughness in a template string
        const html = `
<div id="sphere-container"><canvas id="sphere-canvas"></canvas></div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
let scene, camera, renderer, sphere;
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('sphere-canvas'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  const geometry = new THREE.SphereGeometry(${updated.radius}, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: '${updated.color}',
    roughness: ${updated.roughness},
    metalness: ${updated.metalness},
  });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  const pointLight = new THREE.PointLight(0xffffff, 0.5);
  pointLight.position.set(-5, -5, -5);
  scene.add(pointLight);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  });
  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.005;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
init();
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'morpheoResizeRequest' }, '*');
    }
  }, 100);
});
</script>
`;
        setLocalHtmlContent(html);
      }
      return updated;
    });
  };

  // --- Selection logic: listen for MORPHEO_COMPONENT_SELECT from iframe ---
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleComponentSelect = (event: MessageEvent) => {
      console.log('[GeneratorPage] Received message:', event.data);
      // Ensure the message is from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        // console.warn("[GeneratorPage] Message from unexpected source ignored.", event.source);
        return;
      }

      const { type, morpheoId, morpheoType, schema, values } = event.data || {};
      
      // Line ~489: Clarified mixed operators with parentheses
      if ((type === 'MORPHEO_COMPONENT_SELECT' && morpheoId && manualEditMode) || (type === 'MORPHEO_PROPERTIES' && morpheoId)) {
        console.log(`[GeneratorPage] Processing ${type} for morpheoId: ${morpheoId}`);
        if (type === 'MORPHEO_COMPONENT_SELECT') {
          setSelectedComponent(morpheoId);
          // Optionally, you might want to dispatch extractComponentProperties here if that's the intended flow
          // For example: dispatch(extractComponentProperties(morpheoId));
          // However, ensure 'extractComponentProperties' is re-added to imports if used.
          // Current logic relies on local componentProperties map based on selectedComponent change.
          console.log('[GeneratorPage] Selected component ID for manual edit:', morpheoId, 'Type:', morpheoType);
        } else if (type === 'MORPHEO_PROPERTIES') {
          // This case assumes properties are sent from iframe after extraction
          // Update your local state for schema and values if needed, or dispatch to Redux
          console.log('[GeneratorPage] Received properties from iframe for:', morpheoId, { schema, values });
          // Example: setPropertySchema(schema);
          // Example: setPropertyValues(values);
          // If these properties are directly used to update the ManualEditPanel, ensure it re-renders.
        }
      } else {
        // console.log('[GeneratorPage] Ignored message type or condition not met:', type, 'manualEditMode:', manualEditMode);
      }
    };

    window.addEventListener('message', handleComponentSelect);
    // const iframe = iframeRef.current; // Removed unused variable assignment

    return () => {
      window.removeEventListener('message', handleComponentSelect);
      // Optional: If iframe is sending MORPHEO_COMPONENT_SELECT messages to parent for other purposes,
      // you might need a more specific listener removal or flag.
    };
    // Dependencies: manualEditMode is important here. iframeRef.current itself shouldn't be a dep typically,
    // but the message handler logic relies on it. If iframeRef changes and the old listener isn't removed,
    // you could have multiple listeners.
  }, [manualEditMode, iframeRef]);

  // Instrument HTML only if manual edit mode is active
  let previewHtml = localHtmlContent || generatedHtmlContent || '';
  if (manualEditMode && !isMobile && previewHtml) { // Don't instrument on mobile
    previewHtml = instrumentHtmlWithMorpheoIds(previewHtml);
  }

  // Force mobile preview on mobile devices
  const currentPreviewMode = isMobile ? 'mobile' : previewMode;

  // Helper to force re-render of InlinePreview when key props change
  const previewKey = `${manualEditMode}-${previewHtml.length}-${currentPreviewMode}-${isPreviewFullScreen}`;

  useEffect(() => {
    if (loadedGenerationHtml && loadedGenerationPrompt) {
      setPrompt(loadedGenerationPrompt); 
      dispatch(clearLoadedGenerationFlags());
    }
    dispatch(clearError()); 
  }, [dispatch, loadedGenerationHtml, loadedGenerationPrompt]);

  useEffect(() => {
    if (suggestions.length > 0) { console.log('[GeneratorPage] Suggestions received:', suggestions); }
    if (suggestionsError) { console.error('[GeneratorPage] Suggestions error:', suggestionsError); }
  }, [suggestions, suggestionsError]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for the UI.');
      return;
    }
    dispatch(clearError()); 
    try {
      const result = await dispatch(generateCodeWithFiles({ 
          prompt: prompt, 
          files: selectedPromptFiles 
        }) as any); 
      if (generateCodeWithFiles.rejected.match(result)) {
        toast.error(typeof result.payload === 'string' ? result.payload : 'Generation failed.');
      } else {
        setSelectedPromptFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleModify = () => {
    if (modificationPrompt.trim() && generatedHtmlContent) {
      dispatch(modifyCodeWithFiles({ 
          modificationPrompt,
          currentHtml: generatedHtmlContent, 
          files: selectedModifyFiles 
        }))
        .unwrap()
        .then(() => {
            setModificationPrompt(''); 
            setSelectedModifyFiles(null);
            if (modifyFileInputRef.current) modifyFileInputRef.current.value = '';
            toast.success('Modification applied successfully!');
        })
        .catch((err) => {
             console.error("Modification dispatch failed:", err);
        });
    } else if (!generatedHtmlContent) {
      toast.error("No generated UI to modify.");
    } else if (!modificationPrompt.trim()) {
        toast.error("Please enter modification instructions.");
    }
  };

  const handleFetchSuggestions = () => {
    if (generatedHtmlContent) {
        dispatch(fetchSuggestions(generatedHtmlContent));
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setModificationPrompt(suggestion); 
  };

  const handleSaveGeneration = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { toast.error("You must be logged in to save generations."); return; }
    const promptToSave = prompt || lastPrompt;
    if (!generatedHtmlContent) { toast.error("Nothing to save yet."); return; }
    if (!promptToSave) { toast.error("Could not determine the prompt for saving."); return; }
    toast.promise(
        dispatch(saveGeneration({ prompt: promptToSave, htmlContent: generatedHtmlContent })).unwrap(),
        {
          loading: 'Saving generation...',
          success: 'Generation saved successfully!',
          error: (err) => `Save failed: ${err.message || 'Unknown error'}`
        }
      );
  };

  const handleCopyCode = () => {
    if (generatedHtmlContent) {
      navigator.clipboard.writeText(generatedHtmlContent)
        .then(() => { toast.success('Code copied to clipboard!'); })
        .catch(err => { toast.error('Failed to copy code.'); });
    }
  };

  const handleClearGeneration = () => {
    dispatch(clearGeneratedCode());
    setPrompt('');
    setModificationPrompt('');
    setSelectedPromptFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedModifyFiles(null);
    if (modifyFileInputRef.current) modifyFileInputRef.current.value = '';
    toast.success('Cleared current generation. Ready for a new one!');
  };

  const isProcessing = generatingFullCode || modifyingCode;
  const showPreviewArea = !!generatedHtmlContent || generatingFullCode;

  return (
    <Flex h="calc(100vh - 4rem)" bg={bgColor} p={4} gap={4} alignItems="flex-start" position="relative">
      {/* ManualEditPanel on the left if a component is selected and manual edit is active */}
      {manualEditMode && !isMobile && selectedComponent && (
        <ManualEditPanel
          propertySchemaList={propertySchema}
          selectedValues={propertyValues}
          onChange={handlePropertyChange}
          onCommit={handleCommitProperty}
          isProcessing={isProcessing}
        />
      )}
      {/* Main content (prompt, preview, etc.) */}
      <Box flex="1" h="100%" display={isPreviewFullScreen ? 'none' : 'block'}> {/* Hide this Box in full screen */}
        <AnimatePresence>
          {!showPreviewArea && (
            <motion.div key="prompt-section-generatorpage" initial={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
              style={{ width: '30%', minWidth: '300px', height: 'auto', maxHeight: 'calc(100vh - 5rem)', overflowY: 'auto', display: 'flex' }} >
              <VStack bg={promptBg} p={6} borderRadius="lg" boxShadow="md" gap={4} align="stretch" w="100%" borderColor={borderColor} borderWidth="1px">
                <Heading size="md" color={textColor}>Generate UI</Heading>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the UI you want to generate..." flexGrow={1}
                  borderColor={borderColor} _focusVisible={{ borderColor: focusBorderColor, boxShadow: `0 0 0 1px ${focusBorderColor}` }}
                  bg={mode === 'dark' ? 'gray.700' : 'white'} color={textColor} _placeholder={{ color: placeholderColor }} minH="150px" disabled={isProcessing} />
                <Box my={2}>
                  <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Attach Files (Optional):</Text>
                  <input type="file" id="generatorPromptFiles" ref={fileInputRef} multiple onChange={(e) => setSelectedPromptFiles(e.target.files)}
                    style={{ display: 'block', width: '100%', padding: '8px', border: `1px solid ${borderColor}`, borderRadius: 'md', color: textColor,
                      backgroundColor: mode === 'dark' ? 'gray.700' : 'white' }} disabled={isProcessing} />
                  {selectedPromptFiles && selectedPromptFiles.length > 0 && (
                    <Box mt={2} p={2} bg={mode === 'dark' ? 'gray.700' : 'gray.50'} borderRadius="md" fontSize="xs">
                      <Text fontWeight="semibold" mb={1}>Selected files:</Text>
                      {Array.from(selectedPromptFiles).map((file, index) => (
                        <Flex key={index} justify="space-between" align="center">
                          {/* Apply CSS truncation styles */}
                          <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxWidth="80%">{file.name} ({(file.size / 1024).toFixed(1)} KB)</Text>
                        </Flex>
                      ))}
                      <Button size="xs" variant="ghost" colorScheme="red" mt={1}
                        onClick={() => { setSelectedPromptFiles(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} >
                        Clear Files
                      </Button>
                    </Box>
                  )}
                </Box>
                <Box mt={2}>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color={textColor}>Or start with an example:</Text>
                  <ButtonGroup size="sm" gap={2} flexWrap="wrap">
                    {examplePrompts.map((example) => (
                      <Button key={example.name} variant="outline" colorScheme={buttonColorScheme} onClick={() => setPrompt(example.prompt)}
                        disabled={isProcessing} fontWeight="normal" mb={2}>
                        {example.name}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Box>
                <Button onClick={handleGenerate} colorScheme={buttonColorScheme} loading={generatingFullCode} disabled={!prompt.trim() || isProcessing} loadingText="Generating">
                  Generate
                </Button>
              </VStack>
            </motion.div>
          )}
        </AnimatePresence>

        {showPreviewArea && (
           <motion.div key="main-area-generatorpage" initial={{ opacity: 0, x: showPreviewArea ? 0 : 50 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.5, delay: !showPreviewArea && generatedHtmlContent ? 0 : 0.1 } }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }} >
              <Flex direction="column" flexGrow={1} bg={previewBg} borderRadius="lg" boxShadow="md" borderColor={borderColor} borderWidth="1px" position="relative" overflow="hidden">
                {(generatingFullCode && !streamCompletedSuccessfully) || modifyingCode && (
                   <Flex position="absolute" inset={0} bg="blackAlpha.600" zIndex={20} align="center" justify="center">
                     <Spinner size="xl" color="white" borderWidth="4px" /> 
                     <Text ml={4} color="white" fontSize="xl" fontWeight="semibold">
                  {generatingFullCode ? 'Generating Preview...' : 'Applying Modifications...'}
                     </Text>
                   </Flex>
                 )}
                <Flex justify="space-between" alignItems="center" p={2} bg={mode === 'dark' ? 'gray.800' : 'gray.100'} borderBottomWidth="1px" borderColor={borderColor} zIndex={10} width="100%" flexShrink={0}>
                  <Heading size="xs" color={textColor} mr={2}>Preview</Heading>
                  <ButtonGroup attached size="xs" flexShrink={0}>
                      {!isMobile && (
                        <>
                          <IconButton
                             aria-label="Desktop view" 
                             variant={currentPreviewMode === 'desktop' ? 'solid' : 'outline'}
                             colorScheme={currentPreviewMode === 'desktop' ? buttonColorScheme : 'gray'}
                             onClick={() => setPreviewMode('desktop')}                       
                            >
                              <FiMonitor /> {/* Icon as child */} 
                            </IconButton>
                        </>
                      )}
                       <IconButton 
                          aria-label="Mobile view" 
                          variant={currentPreviewMode === 'mobile' ? 'solid' : 'outline'}
                          colorScheme={currentPreviewMode === 'mobile' ? buttonColorScheme : 'gray'}
                          onClick={() => !isMobile && setPreviewMode('mobile')}
                          disabled={isMobile}
                        >
                           <FiSmartphone /> {/* Icon as child */} 
                        </IconButton>
                      {!isMobile && (
                        <>
                          <IconButton
                              aria-label="Freeform resize view"
                              variant={currentPreviewMode === 'freeform' ? 'solid' : 'outline'}
                              colorScheme={currentPreviewMode === 'freeform' ? buttonColorScheme : 'gray'}
                              onClick={() => setPreviewMode('freeform')}
                          >
                              <FiMove />
                          </IconButton>
                        </>
                      )}
                      {/* Move Manual Edit Button Here - Conditionally rendered */}
                      {!isMobile && (
                        <IconButton
                          aria-label={manualEditMode ? 'Exit Manual Edit' : 'Manual Edit'}
                          colorScheme={manualEditMode ? 'purple' : 'gray'}
                          variant={manualEditMode ? 'solid' : 'outline'}
                          onClick={() => {
                            setManualEditMode((prev) => !prev);
                            if (manualEditMode) setSelectedComponent(null); // Clear selection when exiting
                          }}
                        >
                          {manualEditMode ? <Icon as={FiMinimize} /> : <Icon as={FiEdit} />}
                        </IconButton>
                      )}
                  </ButtonGroup>
                  {/* Full Screen Button - Mobile Only */}
                  {isMobile && (
                    <IconButton
                      ml={2} // Add some margin
                      aria-label={isPreviewFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                      onClick={() => setIsPreviewFullScreen(prev => !prev)}
                      size="xs"
                      variant="outline"
                    >
                      {isPreviewFullScreen ? <Icon as={FiMinimize} /> : <Icon as={FiMaximize} />}
                    </IconButton>
                  )}
                </Flex>
                <Box
                  flex="1"
                  display="flex"
                  width="100%"
                  position="relative"
                  justifyContent={'center'}
                  alignItems={currentPreviewMode === 'desktop' ? 'flex-start' : 'center'}
                  p={{ base: 3, md: 6 }}
                  bg={mode === 'dark' ? 'gray.900' : 'gray.50'}
                  overflow="auto"
                >
                   <Box
                     as="div"
                     flexShrink={0}
                     width={currentPreviewMode === 'desktop' ? '100%' : currentPreviewMode === 'mobile' ? '375px' : '100%'}
                     maxWidth={currentPreviewMode === 'desktop' ? '1400px' : currentPreviewMode === 'mobile' ? '375px' : '100%'}
                     height={currentPreviewMode === 'mobile' ? '760px' : currentPreviewMode === 'freeform' ? '100%' : undefined}
                     minHeight={currentPreviewMode === 'mobile' ? '760px' : undefined}
                     maxHeight={currentPreviewMode === 'mobile' ? '760px' : undefined}
                     m={currentPreviewMode === 'mobile' ? 'auto' : undefined}
                     bg={currentPreviewMode === 'freeform' ? 'transparent' : mode === 'dark' ? 'gray.700' : 'gray.800'}
                     py={currentPreviewMode === 'desktop' ? '20px' : currentPreviewMode === 'mobile' ? '12px' : 0}
                     px={currentPreviewMode === 'desktop' ? '20px' : currentPreviewMode === 'mobile' ? '12px' : 0}
                     boxShadow={currentPreviewMode === 'freeform' ? 'none' : mode === 'dark' ? '0 20px 25px -5px rgba(0,0,0, 0.4), 0 10px 10px -5px rgba(0,0,0, 0.2)' : '0 20px 25px -5px rgba(0,0,0, 0.1), 0 10px 10px -5px rgba(0,0,0, 0.04)'}
                     borderWidth={currentPreviewMode === 'freeform' ? 0 : '1px'}
                     borderColor={currentPreviewMode === 'freeform' ? 'transparent' : mode === 'dark' ? 'gray.600' : 'gray.700'}
                     borderRadius={currentPreviewMode === 'desktop' ? 'xl' : currentPreviewMode === 'mobile' ? '3xl' : 0}
                     position="relative"
                   >
                     <Box
                      width="100%"
                      height={currentPreviewMode === 'mobile' ? '100%' : undefined}
                      minHeight={currentPreviewMode === 'desktop' ? '300px' : undefined}
                      bg={currentPreviewMode === 'desktop' ? (mode === 'dark' ? '#131720' : '#ffffff') : currentPreviewMode === 'mobile' ? (mode === 'dark' ? '#131720' : '#ffffff') : 'transparent'}
                      borderRadius={currentPreviewMode === 'desktop' ? 'lg' : currentPreviewMode === 'mobile' ? '2xl' : 0}
                      overflow="hidden"
                     >
                       <InlinePreview
                         key={previewKey}
                         htmlContent={previewHtml}
                         previewMode={currentPreviewMode}
                         liveUpdateCommand={liveUpdateCommandForPreview}
                         selectedComponent={manualEditMode && !isMobile ? selectedComponent : null}
                       />
                     </Box>
                   </Box>
                 </Box>
              </Flex>

              {generatedHtmlContent && streamCompletedSuccessfully && !isMobile && (
                 <VStack bg={modifyBg} p={4} borderRadius="lg" boxShadow="md" gap={3} align="stretch" flexShrink={0} borderColor={borderColor} borderWidth="1px">
                    <Heading size="sm" color={textColor}>Modify Code</Heading>
                    <Textarea value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} placeholder="Enter modification instructions... (Optional: attach files below)" flexGrow={1}
                      minH="70px" borderColor={borderColor} _focusVisible={{ borderColor: focusBorderColor, boxShadow: `0 0 0 1px ${focusBorderColor}` }}
                      bg={mode === 'dark' ? 'gray.700' : 'white'} color={textColor} _placeholder={{ color: placeholderColor }} disabled={isProcessing} />
                    <Box my={1}>
                      <input 
                          type="file" 
                          id="modificationFiles" 
                          ref={modifyFileInputRef} 
                          multiple 
                          onChange={(e) => setSelectedModifyFiles(e.target.files)} 
                          style={{ display: 'block', width: '100%', padding: '8px', border: `1px solid ${borderColor}`, borderRadius: 'md', color: textColor,
                              backgroundColor: mode === 'dark' ? 'gray.700' : 'white', fontSize: 'sm' }} 
                          disabled={isProcessing} 
                      />
                      {selectedModifyFiles && selectedModifyFiles.length > 0 && (
                        <Box mt={2} p={2} bg={mode === 'dark' ? 'gray.700' : 'gray.50'} borderRadius="md" fontSize="xs">
                          <Text fontWeight="semibold" mb={1}>Files for modification:</Text>
                          {Array.from(selectedModifyFiles).map((file, index) => (
                            <Flex key={index} justify="space-between" align="center">
                              <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxWidth="80%">{file.name} ({(file.size / 1024).toFixed(1)} KB)</Text>
                            </Flex>
                          ))}
                          <Button size="xs" variant="ghost" colorScheme="red" mt={1}
                            onClick={() => { setSelectedModifyFiles(null); if (modifyFileInputRef.current) modifyFileInputRef.current.value = ''; }} >
                            Clear Files
                          </Button>
                        </Box>
                      )}
                    </Box>
                    {modificationError && (
                      <Alert.Root status="error" variant="subtle" borderRadius="md">
                        <Alert.Indicator /> 
                        <Box flex="1">
                          <Alert.Title>Modification Error!</Alert.Title>
                          <Alert.Description display="block">{modificationError}</Alert.Description>
                        </Box>
                        <CloseButton position="absolute" right="8px" top="8px" onClick={() => dispatch(clearError())} />
                      </Alert.Root>
                    )}
                    <Flex justify="space-between" wrap="wrap" gap={2}>
                      <Button onClick={handleModify} colorScheme={buttonColorScheme} loading={modifyingCode} disabled={!modificationPrompt.trim() || !generatedHtmlContent || isProcessing}
                        loadingText="Modifying" size="sm">
                        Modify Code
                      </Button>
                      <Button onClick={handleFetchSuggestions} colorScheme="teal" loading={loadingSuggestions} disabled={!generatedHtmlContent || isProcessing || loadingSuggestions}
                        loadingText="Thinking..." size="sm">
                         <Icon as={FiGift} mr={2} />
                         Suggest Ideas
                      </Button>
                      <Box flexGrow={{ base: 1, md: 1 }} />
                      <ButtonGroup size="sm" variant="outline" gap={2} mt={{ base: 2, md: 0 }}>
                        <IconButton aria-label="Undo Modification" onClick={() => dispatch(undoModification())} colorScheme={buttonColorScheme} variant="outline"
                          title="Undo" disabled={historyIndex <= 0} >
                            <FiRewind /> {/* Icon as child */} 
                          </IconButton>
                        <IconButton aria-label="Redo Modification" onClick={() => dispatch(redoModification())} colorScheme={buttonColorScheme} variant="outline"
                          title="Redo" disabled={historyIndex >= htmlHistory.length - 1} >
                            <FiFastForward /> {/* Icon as child */} 
                          </IconButton>
                        <IconButton aria-label="View Generated Code" onClick={onCodeModalOpen} colorScheme={buttonColorScheme} variant="outline"
                          title="View Code" >
                            <FiCode /> {/* Icon as child */} 
                          </IconButton>
                         <Button onClick={handleSaveGeneration} colorScheme="green" disabled={!generatedHtmlContent || isProcessing} size="sm">
                          <Icon as={FiSave} mr={2} />
                          Save
                         </Button>
                        <IconButton
                          aria-label="Clear Generation"
                          onClick={handleClearGeneration}
                          colorScheme="red"
                          variant="outline"
                          title="Clear Generation & Start New"
                          disabled={isProcessing}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </ButtonGroup>
                    </Flex>

                    {(loadingSuggestions || suggestions.length > 0 || suggestionsError) && (
                      <Box mt={3} pt={3} borderTopWidth="1px" borderColor={borderColor}>
                          <Heading size="xs" mb={2} color={textColor}>Suggestions:</Heading>
                          {loadingSuggestions && <Spinner size="sm" color={buttonColorScheme + ".500"} />}
                          {suggestionsError && (
                              <Alert.Root status="error" variant="subtle" size="sm">
                                  <Alert.Indicator />
                                  <Alert.Description>{suggestionsError}</Alert.Description>
                              </Alert.Root>
                          )}
                          {!loadingSuggestions && suggestions.length > 0 && (
                              <VStack align="stretch" gap={1} maxH="100px" overflowY="auto">
                                  {suggestions.map((suggestion, index) => (
                                      <Button key={index} variant="ghost" size="xs" onClick={() => handleApplySuggestion(suggestion)} justifyContent="flex-start" 
                                          textAlign="left" fontWeight="normal" whiteSpace="normal" h="auto" py={1} px={2} colorScheme="gray" 
                                          _hover={{ bg: mode === 'dark' ? 'gray.700' : 'gray.100' }}>
                                          {suggestion}
                                      </Button>
                                  ))}
                              </VStack>
                          )}
                      </Box>
                    )}
                  </VStack>
              )}
           </motion.div>
        )}
      </Box>
      
       {(error || modificationError) && (
          <Alert.Root status='error' position="fixed" bottom="4" left="4" right="4" zIndex="tooltip" borderRadius="md" boxShadow="lg" maxW="container.md" mx="auto">
             <Alert.Indicator />
             <Box flex='1'>
               <Alert.Title mr={2}>Error!</Alert.Title>
               <Alert.Description>{error || modificationError}</Alert.Description>
             </Box>
             <CloseButton alignSelf='flex-start' position='relative' right={-1} top={-1} onClick={() => dispatch(clearError())} />
           </Alert.Root>
      )}

      <Dialog.Root open={isCodeModalOpen} onClose={onCodeModalClose} scrollBehavior="inside">
        <DialogBackdrop />
        <Dialog.Positioner>
          <DialogContent> 
            <DialogHeader>Generated Code</DialogHeader>
            <DialogCloseTrigger>
                <CloseButton position="absolute" right="8px" top="8px" />
            </DialogCloseTrigger>
            <DialogBody pb={6} overflowY="auto"> 
              <Box as="pre" p={4} bg={mode === 'dark' ? 'gray.900' : 'gray.50'} borderColor={mode === 'dark' ? 'gray.700' : 'gray.200'}
                borderWidth="1px" borderRadius="md" overflowX="auto" whiteSpace="pre-wrap" wordBreak="break-all" >
                <Box as="code" fontFamily="monospace" fontSize="sm"> 
                  {generatedHtmlContent || 'No code generated yet.'}
                </Box>
              </Box>
            </DialogBody>
            <DialogFooter>
              <Button colorScheme='blue' mr={3} onClick={handleCopyCode}>Copy Code</Button>
              <Button variant='ghost' onClick={onCodeModalClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Render preview container in full screen mode */} 
      {isPreviewFullScreen && (
        <Box
          position="fixed" // Take out of normal flow
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg={mode === 'dark' ? 'gray.900' : 'gray.50'} // Match preview background
          zIndex={100} // Ensure it's on top
          overflow="hidden" // Prevent scrolling of the container itself
        >
          <InlinePreview
            key={previewKey} // Key forces re-render
            htmlContent={previewHtml} // Use non-instrumented HTML in full screen
            previewMode={'mobile'} // Always mobile in full screen
            liveUpdateCommand={null} // Disable live update in full screen
            selectedComponent={null} // Disable selection in full screen
          />
          {/* Exit Full Screen Button */} 
          <IconButton
            position="absolute"
            top={4}
            right={4}
            aria-label="Exit Full Screen"
            onClick={() => setIsPreviewFullScreen(false)}
            size="sm"
            colorScheme="red"
            variant="solid"
            zIndex={110} // Ensure button is above iframe
          >
            <Icon as={FiMinimize} />
          </IconButton>
        </Box>
      )}

    </Flex>
  );
};

export default GeneratorPage; 