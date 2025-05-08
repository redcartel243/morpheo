import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchSavedGenerations, deleteGeneration, loadGeneration, GenerationDetail } from '../store/slices/uiSlice';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Button, List, ListItem, Spinner, useToast, Flex, Tag, IconButton, VStack, HStack } from '@chakra-ui/react';
import { DeleteIcon, ViewIcon } from '@chakra-ui/icons';

// ... existing code ... 