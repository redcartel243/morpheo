import React, { useState } from 'react';
import { Box, Button, VStack, Input, HStack, IconButton } from '@chakra-ui/react';

// No imports needed - React and Chakra UI components are assumed to be in scope
// Expects a prop like `onSubmitModification: (modificationPrompt: string) => void`

const ModificationControls = ({ onSubmitModification }) => { // Destructure the prop
  const [isModifying, setIsModifying] = useState(false);
  const [modificationPrompt, setModificationPrompt] = useState('');

  const handleModifyClick = () => {
    setIsModifying(true);
  };

  const handleCancelClick = () => {
    setModificationPrompt(''); // Clear prompt on cancel
    setIsModifying(false);
  };

  const handleSubmitClick = () => {
    // Placeholder: In a real implementation, call the onSubmitModification prop
    console.log('Submitting modification:', modificationPrompt);
    // Example: onSubmitModification(modificationPrompt);
    setIsModifying(false); // Hide input after submit
    setModificationPrompt(''); // Clear prompt after submit
  };

  const handleInputChange = (event) => {
    setModificationPrompt(event.target.value);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSubmitClick();
    }
  };

  return (
    <Box p={2} borderWidth={1} borderRadius="md" mt={4}>
      {!isModifying ? (
        <Button onClick={handleModifyClick} size="sm">
          Modify Component
        </Button>
      ) : (
        <VStack align="stretch" spacing={2}>
          <Input
            placeholder="Describe your change..."
            value={modificationPrompt}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown} // Optional: Allow Enter to submit
            size="sm"
          />
          <HStack justify="flex-end" spacing={2}>
            <IconButton
              aria-label="Cancel modification"
              // icon={<CloseIcon />} // Requires icon library - using text instead
              size="sm"
              variant="ghost"
              colorPalette="red"
              onClick={handleCancelClick}
            >
              X {/* Placeholder for Cancel Icon */}
            </IconButton>
            <Button
              colorPalette="blue"
              size="sm"
              onClick={handleSubmitClick}
              disabled={!modificationPrompt.trim()}
            >
              Submit Change
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  );
};

export default ModificationControls; 