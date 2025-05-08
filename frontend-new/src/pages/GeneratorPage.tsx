import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { generateFullCode, modifyGeneratedCode, clearGeneratedCode, clearError, saveGeneration, clearLoadedGenerationFlags, undoModification, redoModification, fetchSuggestions, generateCodeWithFiles, modifyCodeWithFiles } from '../store/slices/uiSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { auth } from '../config/firebase';
import InlinePreview from '../components/preview/InlinePreview';
import toast from 'react-hot-toast';

import {
  Box,
  Flex,
  Textarea, 
  Button,   
  Spinner, 
  Alert,
  AlertTitle,
  AlertDescription,
  AlertIndicator, 
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
} from '@chakra-ui/react';

import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiSmartphone, FiSave, FiCode, FiRewind, FiFastForward, FiGift, FiTrash2, FiMove } from 'react-icons/fi'; 

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
    suggestionsError
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
    <Flex h="calc(100vh - 4rem)" bg={bgColor} p={4} gap={4} alignItems="flex-start">
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
                    <IconButton 
                       aria-label="Desktop view" 
                       variant={previewMode === 'desktop' ? 'solid' : 'outline'}
                       colorScheme={previewMode === 'desktop' ? buttonColorScheme : 'gray'}
                       onClick={() => setPreviewMode('desktop')}                       
                      >
                        <FiMonitor /> {/* Icon as child */} 
                      </IconButton>
                     <IconButton 
                        aria-label="Mobile view" 
                        variant={previewMode === 'mobile' ? 'solid' : 'outline'}
                        colorScheme={previewMode === 'mobile' ? buttonColorScheme : 'gray'}
                        onClick={() => setPreviewMode('mobile')}                        
                      >
                         <FiSmartphone /> {/* Icon as child */} 
                      </IconButton>
                    <IconButton
                        aria-label="Freeform resize view"
                        variant={previewMode === 'freeform' ? 'solid' : 'outline'}
                        colorScheme={previewMode === 'freeform' ? buttonColorScheme : 'gray'}
                        onClick={() => setPreviewMode('freeform')}
                    >
                        <FiMove />
                    </IconButton>
                </ButtonGroup>
              </Flex>
              <Box
                flex="1"
                display="flex"
                width="100%"
                position="relative"
                justifyContent={'center'}
                alignItems={previewMode === 'desktop' ? 'flex-start' : 'center'}
                p={{ base: 3, md: 6 }}
                bg={mode === 'dark' ? 'gray.900' : 'gray.50'}
                overflow="auto"
              >
                 <Box
                   as="div"
                   flexShrink={0}
                   width={previewMode === 'desktop' ? '100%' : previewMode === 'mobile' ? '375px' : '100%'}
                   maxWidth={previewMode === 'desktop' ? '1400px' : previewMode === 'mobile' ? '375px' : '100%'}
                   height={previewMode === 'mobile' ? '760px' : previewMode === 'freeform' ? '100%' : undefined}
                   minHeight={previewMode === 'mobile' ? '760px' : undefined}
                   maxHeight={previewMode === 'mobile' ? '760px' : undefined}
                   m={previewMode === 'mobile' ? 'auto' : undefined}
                   bg={previewMode === 'freeform' ? 'transparent' : mode === 'dark' ? 'gray.700' : 'gray.800'}
                   py={previewMode === 'desktop' ? '20px' : previewMode === 'mobile' ? '12px' : 0}
                   px={previewMode === 'desktop' ? '20px' : previewMode === 'mobile' ? '12px' : 0}
                   boxShadow={previewMode === 'freeform' ? 'none' : mode === 'dark' ? '0 20px 25px -5px rgba(0,0,0, 0.4), 0 10px 10px -5px rgba(0,0,0, 0.2)' : '0 20px 25px -5px rgba(0,0,0, 0.1), 0 10px 10px -5px rgba(0,0,0, 0.04)'}
                   borderWidth={previewMode === 'freeform' ? 0 : '1px'}
                   borderColor={previewMode === 'freeform' ? 'transparent' : mode === 'dark' ? 'gray.600' : 'gray.700'}
                   borderRadius={previewMode === 'desktop' ? 'xl' : previewMode === 'mobile' ? '3xl' : 0}
                   position="relative"
                 >
                   <Box
                    width="100%"
                    height={previewMode === 'mobile' ? '100%' : undefined}
                    minHeight={previewMode === 'desktop' ? '300px' : undefined}
                    bg={previewMode === 'desktop' ? (mode === 'dark' ? '#131720' : '#ffffff') : previewMode === 'mobile' ? (mode === 'dark' ? '#131720' : '#ffffff') : 'transparent'}
                    borderRadius={previewMode === 'desktop' ? 'lg' : previewMode === 'mobile' ? '2xl' : 0}
                    overflow="hidden"
                   >
                     <InlinePreview htmlContent={generatedHtmlContent || ''} previewMode={previewMode} />
                   </Box>
                 </Box>
               </Box>
            </Flex>

            {generatedHtmlContent && streamCompletedSuccessfully && (
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

    </Flex>
  );
};

export default GeneratorPage; 