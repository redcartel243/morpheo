import React, { useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGenerations, deleteGeneration, fetchGenerationDetail } from '../store/slices/generationsSlice';
import { RootState } from '../store';
import {
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
  Alert,
  Button,
  ButtonGroup,
  Table,
  Link,
} from '@chakra-ui/react';
import { FiEye, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const SavedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: generations, loading, error } = useAppSelector((state: RootState) => state.generations);
  const { mode } = useAppSelector((state: RootState) => state.theme);

  useEffect(() => {
    // Fetch generations when the component mounts
    dispatch(fetchGenerations());
  }, [dispatch]);

  const handleLoad = (id: string) => {
    console.log("Dispatching fetchGenerationDetail for ID:", id);
    toast.promise(
      dispatch(fetchGenerationDetail(id)).unwrap(),
      {
        loading: 'Loading generation...',
        success: (loadedData) => {
          navigate('/');
          return 'Generation loaded successfully!';
        },
        error: (err) => `Load failed: ${err.message || 'Unknown error'}`,
      }
    );
  };

  const handleDelete = (id: string) => {
    // Simple confirmation dialog
    if (window.confirm('Are you sure you want to delete this generation? This cannot be undone.')) {
      console.log("Dispatching deleteGeneration for ID:", id);
      toast.promise(
        dispatch(deleteGeneration(id)).unwrap(),
        {
          loading: 'Deleting generation...',
          success: 'Generation deleted successfully!',
          error: (err) => `Delete failed: ${err.message || 'Unknown error'}`,
        }
      );
    }
  };

  // Theme colors
  const bgColor = mode === 'dark' ? 'gray.900' : 'gray.50';
  const textColor = mode === 'dark' ? 'gray.100' : 'gray.800';
  const tableBg = mode === 'dark' ? 'gray.800' : 'white';
  const tableBorder = mode === 'dark' ? 'gray.700' : 'gray.200';

  return (
    <Flex 
      direction="column" 
      minH="calc(100vh - 4rem)"
      bg={bgColor}
      p={6}
      color={textColor}
    >
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Saved Generations</Heading>
        <RouterLink to="/">
          <Button colorScheme="purple" size="sm">
            <FiPlusCircle style={{ marginRight: '0.5rem' }} />
            New Generation
          </Button>
        </RouterLink>
      </Flex>

      {loading && (
        <Flex justify="center" align="center" flexGrow={1}>
          <Spinner size="xl" />
        </Flex>
      )}

      {error && (
        <Alert.Root status='error' variant="subtle" borderRadius="md">
          <Alert.Indicator />
          <Box flex='1'>
            <Alert.Title>Error Loading Generations!</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Box>
        </Alert.Root>
      )}

      {!loading && !error && (
        <Box bg={tableBg} borderRadius="lg" borderWidth="1px" borderColor={tableBorder} overflowX="auto">
          <Table.Root size="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Prompt Preview</Table.ColumnHeader>
                <Table.ColumnHeader>Created At</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {generations.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4} textAlign="center">No saved generations found.</Table.Cell>
                </Table.Row>
              ) : (
                generations.map((gen) => (
                  <Table.Row key={gen.id}>
                    <Table.Cell>{gen.name}</Table.Cell>
                    <Table.Cell maxW="300px" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" title={gen.prompt_preview}>{gen.prompt_preview}</Table.Cell>
                    <Table.Cell>{gen.createdAt.toLocaleString()}</Table.Cell>
                    <Table.Cell>
                      <ButtonGroup variant="outline" size="sm" gap="3">
                        <Button colorScheme="blue" onClick={() => handleLoad(gen.id)}>
                          <FiEye style={{ marginRight: '0.5rem' }} />
                          Load
                        </Button>
                        <Button 
                          colorScheme="red" 
                          onClick={() => handleDelete(gen.id)}
                        >
                          <FiTrash2 style={{ marginRight: '0.5rem' }} />
                          Delete
                        </Button>
                      </ButtonGroup>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Flex>
  );
};

export default SavedPage; 