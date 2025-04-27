import React from 'react';
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
  Dialog,
  Textarea,
  useClipboard,
  Box,
  HStack,
} from '@chakra-ui/react';
import ModificationControls from './ModificationControls';

const UIPreview: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { open, onOpen, onClose } = useDisclosure();

  const loading = useSelector((state: RootState) => state.ui.loading || state.ui.generatingUI);
  const componentCode = useSelector((state: RootState) => state.ui.componentCode);

  const { onCopy, hasCopied } = useClipboard(componentCode || '');

  const handleBackToGenerator = () => {
    navigate('/generate');
  };

  const handleCopyCode = () => {
    onCopy();
    window.alert("Code copied to clipboard!");
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
        <HStack justify="space-between" align="start" gap={4}>
          <Box>
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
              variant="outline"
              onClick={onOpen}
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
          Rendered Component
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

      <Dialog.Root open={open} onOpenChange={(detail: { open: boolean }) => !detail.open && onClose()} scrollBehavior="inside">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content size="xl">
            <Dialog.Header>Generated Component Code</Dialog.Header>
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
    </div>
  );
};

export default UIPreview; 