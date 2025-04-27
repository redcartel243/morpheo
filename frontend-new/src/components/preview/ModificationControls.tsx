import React, { useState } from 'react';
import { 
  Box, 
  Textarea, 
  Button, 
  VStack, 
  Text,
} from '@chakra-ui/react';

interface ModificationControlsProps {
  onSubmitModification: (prompt: string) => void;
}

const ModificationControls: React.FC<ModificationControlsProps> = ({ onSubmitModification }) => {
  const [modificationPrompt, setModificationPrompt] = useState('');

  const handleSubmit = () => {
    if (modificationPrompt.trim()) {
      onSubmitModification(modificationPrompt);
      setModificationPrompt(''); // Clear prompt after submission
    }
  };

  return (
    <Box 
      mt={6} 
      p={4} 
      borderWidth="1px" 
      borderRadius="md" 
      borderColor="border"
      bg="bg"
      color="fg"
    >
      <VStack gap={4} align="stretch">
        <Text fontWeight="semibold">Refine Component:</Text>
        <Textarea
          value={modificationPrompt}
          onChange={(e) => setModificationPrompt(e.target.value)}
          placeholder="Enter instructions to modify the component above (e.g., 'Change the button color to blue', 'Add a title', 'Make the input required')"
          rows={4}
          _focusVisible={{ 
            zIndex: 1, 
            borderColor: 'blue.500', 
            boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
          }}
        />
        <Button 
          colorPalette="blue"
          onClick={handleSubmit}
          disabled={!modificationPrompt.trim()}
        >
          Apply Modifications
        </Button>
      </VStack>
    </Box>
  );
};

export default ModificationControls; 