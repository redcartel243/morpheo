import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Input,
  Switch,
  Textarea,
} from '@chakra-ui/react';

interface PropertySchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'select' | 'json_object_editor';
  options?: string[];
  liveUpdateSnippet?: string;
  htmlAttribute?: string;
  [key: string]: any;
}

interface ManualEditPanelProps {
  propertySchemaList: PropertySchema[];
  selectedValues: Record<string, any>;
  onChange: (property: PropertySchema, value: any) => void;
  onCommit?: (property: PropertySchema, value: any) => void;
  isProcessing?: boolean;
}

const ManualEditPanel: React.FC<ManualEditPanelProps> = ({
  propertySchemaList,
  selectedValues,
  onChange,
  onCommit,
  isProcessing,
}) => {
  // --- DEBUG: Log received props ---
  console.log('[ManualEditPanel Render] Props received:', {
    propertySchemaList,
    selectedValues,
    isProcessing,
  });
  // --- END DEBUG ---

  return (
    <Box
      w={{ base: '100%', md: '320px' }}
      minW="240px"
      maxW="360px"
      h="100%"
      bg="white"
      borderRightWidth="1px"
      borderColor="gray.200"
      p={4}
      overflowY="auto"
      boxShadow="md"
      zIndex={2}
      position="relative"
    >
      <Heading size="sm" mb={4} color="gray.700">
        Edit Properties
      </Heading>
      <VStack align="stretch" gap={4}>
        {propertySchemaList.map((prop) => {
          const value = selectedValues[prop.name];
          const handleChange = (val: any) => onChange(prop, val);
          const handleCommit = (val: any) => onCommit && onCommit(prop, val);

          return (
            <Box key={prop.name} opacity={isProcessing ? 0.6 : 1} pointerEvents={isProcessing ? 'none' : 'auto'}>
              <Text fontWeight="semibold" color="gray.700" mb={1}>{prop.label}</Text>
              {prop.type === 'string' && (
                <Input
                  value={value ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleCommit && handleCommit(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleCommit && handleCommit((e.target as HTMLInputElement).value);
                  }}
                  size="sm"
                />
              )}
              {prop.type === 'number' && (
                <input
                  type="number"
                  value={value ?? ''}
                  min={prop.min}
                  max={prop.max}
                  step={prop.step || 1}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(Number(e.target.value))}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleCommit && handleCommit(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '1rem' }}
                  disabled={isProcessing}
                />
              )}
              {prop.type === 'color' && (
                <Input
                  type="color"
                  value={value ?? '#000000'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleCommit && handleCommit(e.target.value)}
                  size="sm"
                  w="48px"
                  p={0}
                  border="none"
                  bg="none"
                />
              )}
              {prop.type === 'boolean' && (
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleChange(e.target.checked);
                    handleCommit && handleCommit(e.target.checked);
                  }}
                  style={{ width: '1.2em', height: '1.2em', accentColor: '#805ad5', marginRight: 8 }}
                  disabled={isProcessing}
                />
              )}
              {prop.type === 'select' && prop.options && (
                <select
                  value={value ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    handleChange(e.target.value);
                    handleCommit && handleCommit(e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '1rem', height: '2.2em' }}
                  disabled={isProcessing}
                >
                  {prop.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {prop.type === 'json_object_editor' && (
                <Textarea
                  value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e.target.value)}
                  onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => handleCommit && handleCommit(e.target.value)}
                  size="sm"
                  minH="60px"
                  fontFamily="mono"
                />
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};

export default ManualEditPanel; 