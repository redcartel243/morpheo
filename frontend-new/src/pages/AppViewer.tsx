import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import {
  Box, Button, Checkbox, Heading, HStack, Input, InputGroup, Link, List, ListItem, Text, VStack, IconButton,
} from '@chakra-ui/react';

import * as Ark from '@ark-ui/react';

import { ErrorBoundary } from 'react-error-boundary'; 

// The scope for react-live, including React, hooks, and Chakra components
const liveScope = {
  React,
  useState,
  useEffect,
  useCallback,
  useRef,
  // Ark UI Components first - TEMPORARILY REMOVED
  // ...Ark,
  // Error Boundary components
  ErrorBoundary: ErrorBoundary,
  // FallbackComponent: FallbackComponent, // Include if defined and used
  // Chakra UI Components (defined last to take precedence)
  Box: Box,
  Button: Button,
  Checkbox: Checkbox, // Now this is the Chakra Checkbox
  Heading: Heading,
  HStack: HStack,
  Input: Input,
  InputGroup: InputGroup,
  Link: Link,
  List: List,
  ListItem: ListItem,
  Text: Text,
  VStack: VStack,
  IconButton: IconButton,
}; 