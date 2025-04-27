import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import { modifyUI } from '../../store/slices/uiSlice';
import AppViewer from '../AppViewer';
import {
  Spinner,
  Text,
  Center,
  Button,
  useDisclosure,
  Textarea,
  useClipboard,
  Box,
  HStack,
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
} from '@chakra-ui/react';
import axios from 'axios';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import { IframeProvider } from '../ui/IframeProvider';
import * as ChakraUI from '@chakra-ui/react';
import ModificationControls from './ModificationControls';

const UIPreview: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { open: isCodeModalOpen, onOpen: onCodeModalOpen, onClose: onCodeModalClose } = useDisclosure();
  const { open: isFullRenderModalOpen, onOpen: onFullRenderModalOpen, onClose: onFullRenderModalClose } = useDisclosure();

  const [fullComponentCode, setFullComponentCode] = useState<string | null>(null);
  const [isFetchingFullCode, setIsFetchingFullCode] = useState(false);

  const loading = useSelector((state: RootState) => state.ui.loading || state.ui.generatingUI);
  const componentCode = useSelector((state: RootState) => state.ui.componentCode);
  const lastPrompt = useSelector((state: RootState) => state.ui.lastPrompt);

  const { onCopy, hasCopied } = useClipboard(componentCode || '');

  const handleBackToGenerator = () => {
    navigate('/generate');
  };

  const handleCopyCode = () => {
    onCopy();
    window.alert("Code copied to clipboard!");
  };

  const handleFullRenderClick = async () => {
    if (!lastPrompt) {
      window.alert("No prompt available to generate full code. Please generate a component first.");
      return;
    }

    setIsFetchingFullCode(true);
    setFullComponentCode(null);

    try {
      let headers = {};
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
      let accessToken = null;

      try {
        const tokenResponse = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/token`,
          new URLSearchParams({
            'username': testUsername,
            'password': testPassword
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        accessToken = tokenResponse.data.access_token;
        headers = { 'Authorization': `Bearer ${accessToken}` };
        console.log('Auth token obtained for full code generation');
      } catch (tokenError: any) {
        console.error('Failed to obtain auth token for full code generation:', tokenError);
        throw new Error('Authentication failed: ' + (tokenError.response?.data?.detail || tokenError.message));
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generate-full-component`,
        { prompt: lastPrompt },
        { headers }
      );

      if (response.data && response.data.component_code) {
        let rawCode = response.data.component_code;
        let finalCode = rawCode;
        let componentName = 'GeneratedComponent'; // Default name

        // Attempt to extract the default export name
        const exportMatch = rawCode.match(/export\s+default\s+(\w+);/);
        if (exportMatch && exportMatch[1]) {
          componentName = exportMatch[1];
          console.log(`Extracted component name: ${componentName}`);
          // Append the render call required by react-live noInline mode
          finalCode = `${rawCode}\n\nrender(<${componentName} />);`;
        } else {
          console.warn('Could not extract default export name. Appending render with default name.');
          // Append render call with default name if extraction fails
          finalCode = `${rawCode}\n\nrender(<${componentName} />);`;
        }

        console.log('Final code for LiveProvider:', finalCode);
        setFullComponentCode(finalCode); // Set the code WITH the render call
        onFullRenderModalOpen(); // Open the modal
      } else {
        throw new Error(response.data?.error || 'Failed to generate full component code');
      }
    } catch (error: any) {
      console.error("Error fetching full component code:", error);
      window.alert(`Error Generating Full Code: ${error.message || "An unknown error occurred."}`);
    } finally {
      setIsFetchingFullCode(false);
    }
  };

  const iframeScope = {
    React,
    ...ChakraUI,
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useRef: React.useRef,
    useSimpleState: (initialValue: any) => React.useState(initialValue),
    IconPlaceholder: (props: any) => <Box as="span" {...props}>Icon</Box>,
  };

  if (loading && !componentCode) {
    return (
      <Center h="calc(100vh - 160px)">
        <Spinner size="xl" mr={4} />
        <Text>Loading UI generation...</Text>
      </Center>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Box mb={8}>
        <HStack justify="space-between" align="start" gap={4} flexWrap="wrap">
          <Box flexGrow={1}>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Generated UI Preview
            </h1>
            {loading && (
              <HStack mt={2} color="gray.500">
                <Spinner size="sm" />
                <Text fontSize="sm">Applying modifications...</Text>
              </HStack>
            )}
          </Box>
          <HStack gap={4} mt={{ base: 4, md: 0 }}>
            <Button
              onClick={handleFullRenderClick}
              loading={isFetchingFullCode}
              loadingText="Generating"
              disabled={!lastPrompt || isFetchingFullCode}
              variant="solid"
              colorPalette="purple"
            >
              Full Render Preview
            </Button>
            <Button
              variant="outline"
              onClick={onCodeModalOpen}
              disabled={!componentCode}
            >
              View/Copy Code
            </Button>
            <Button
              onClick={handleBackToGenerator}
            >
              <HStack gap={1}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Back to Generator</span>
              </HStack>
            </Button>
          </HStack>
        </HStack>
      </Box>

      <Box className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Live Preview (May have limitations)
        </h2>
        <Box className="border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
          <AppViewer />
        </Box>
        <ModificationControls
          onSubmitModification={(prompt) => {
            if (componentCode) {
              dispatch(modifyUI({ modificationPrompt: prompt, currentCode: componentCode }) as any);
            } else {
              window.alert("Cannot Modify Code: No component code is currently available.");
            }
          }}
        />
      </Box>

      <Dialog.Root open={isCodeModalOpen} onOpenChange={(detail: { open: boolean }) => !detail.open && onCodeModalClose()} scrollBehavior="inside">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content size="2xl">
            <Dialog.Header>Generated Component Code (for react-live)</Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <Button variant="ghost" size="sm" position="absolute" top="2" right="2">X</Button>
            </Dialog.CloseTrigger>
            <Dialog.Body pb={6}>
              <Textarea
                value={componentCode || '// No code generated yet'}
                readOnly
                fontFamily="monospace"
                height="60vh"
                borderColor="border"
                bg="bg"
                _dark={{ bg: "gray.900" }}
                color="fg"
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Button colorPalette="blue" mr={3} onClick={handleCopyCode}>
                {hasCopied ? 'Copied!' : 'Copy Code'}
              </Button>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost">Close</Button>
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root open={isFullRenderModalOpen} onOpenChange={(detail: { open: boolean }) => !detail.open && onFullRenderModalClose()} size="xl" scrollBehavior="inside">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content minHeight="80vh" display="flex" flexDirection="column">
            <Dialog.Header>Full Render Preview</Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <Button variant="ghost" size="sm" position="absolute" top="2" right="2">X</Button>
            </Dialog.CloseTrigger>
            <Dialog.Body p={0} flex={1} display="flex">
              {fullComponentCode ? (
                <Box flex={1} overflow="hidden">
                  <IframeProvider>
                    <LiveProvider code={fullComponentCode} scope={iframeScope} noInline={true}>
                      <Box p={4}>
                        <LivePreview />
                        <LiveError style={{ color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap' }} />
                      </Box>
                    </LiveProvider>
                  </IframeProvider>
                </Box>
              ) : (
                <Center h="100%">
                  <Text>Loading full component code...</Text>
                </Center>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant='ghost'>
                  Close Preview
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </div>
  );
};

export default UIPreview; 