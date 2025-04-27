import React, { /* useEffect, useRef, useState */ } from 'react';
import {
  // V3 Imports - Add more as needed based on AI generation & errors
  // Layout
  Box, Center, Flex, Grid, GridItem, Spacer, Stack, HStack, VStack, Wrap, WrapItem,
  Container, SimpleGrid,
  // Forms (using Field component where applicable)
  Button, IconButton, Checkbox, CheckboxGroup, Editable, Field, Input, InputGroup, InputAddon, InputElement,
  NumberInput, PinInput, RadioGroup, Select, Slider, SliderTrack, SliderThumb, SliderMarker,
  Switch, Textarea,
  // Data Display
  Badge, Code, Kbd, List, ListItem, Stat, StatLabel, StatHelpText, StatGroup, Table, Tag, TagLabel,
  // Feedback
  Alert, Progress, Skeleton, SkeletonCircle, SkeletonText, Spinner,
  // Typography
  Text, Heading,
  // Overlay
  Dialog, Drawer, Menu, Popover, Tooltip,
  // Disclosure
  Accordion, Collapsible, Tabs, useDisclosure,
  // Media & Icons
  Avatar, AvatarGroup, Icon, Image,
  // Other
  AspectRatio, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator,
  Link, Separator, AbsoluteCenter,
  CloseButton, Portal, VisuallyHidden,
  // Hooks (Only Chakra-specific ones)
  useCallbackRef, useControllableState, useMediaQuery, // Keep useDisclosure listed above
} from '@chakra-ui/react';
import { LiveProvider, LiveError, LivePreview } from 'react-live'; // Import react-live
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store';

// Global DOM manipulation registry
declare global {
  interface Window {
    $morpheo?: Record<string, any>;
    $m?: (selector: string) => any;
    _methodExecutionTimestamps?: Record<string, number>;
    _isProcessingEvent?: boolean;
  }
}

/**
 * AppViewer component for viewing and interacting with Morpheo applications.
 */
interface AppViewerProps {
  appId?: string; // Keep if still relevant for triggering fetches etc.
}

// Define the scope for react-live - V3 COMPONENTS
const liveScope = {
  React: React,                         // Provide React
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback, // Keep for potential handlers
  useRef: React.useRef,         // Keep for potential refs
  // Keep Box as it's fundamental
  Box: Box,
  // Add back Container
  Container: Container,
  // Add back Flex
  Flex: Flex,
  // Media & Icons
  Avatar: Avatar, // Restore Avatar
  // Add back Heading
  Heading: Heading,
  // Add back HStack
  HStack: HStack,
  // === Restore other components ===
  // Layout
  Center: Center, Grid: Grid, GridItem: GridItem, Spacer: Spacer, Stack: Stack, VStack: VStack, Wrap: Wrap, WrapItem: WrapItem,
  SimpleGrid: SimpleGrid, // Restore SimpleGrid
  // Forms
  Button: Button, IconButton: IconButton, Checkbox: Checkbox, CheckboxGroup: CheckboxGroup, Editable: Editable, Field: Field, Input: Input, InputGroup: InputGroup, InputAddon: InputAddon, InputElement: InputElement,
  NumberInput: NumberInput, PinInput: PinInput, RadioGroup: RadioGroup, Select: Select, Slider: Slider, SliderTrack: SliderTrack, SliderThumb: SliderThumb, SliderMarker: SliderMarker,
  Switch: Switch, Textarea: Textarea,
  // Data Display
  Badge: Badge, Code: Code, Kbd: Kbd, List: List, ListItem: ListItem, Stat: Stat, StatLabel: StatLabel, StatHelpText: StatHelpText, StatGroup: StatGroup, Table: Table, Tag: Tag, TagLabel: TagLabel,
  // Feedback
  Alert: Alert, Progress: Progress, Skeleton: Skeleton, SkeletonCircle: SkeletonCircle, SkeletonText: SkeletonText, Spinner: Spinner,
  // Typography
  Text: Text, // Restore Text
  // Overlay
  Dialog: Dialog, Drawer: Drawer, Menu: Menu, Popover: Popover, Tooltip: Tooltip,
  // Disclosure
  Accordion: Accordion, Collapsible: Collapsible, Tabs: Tabs, useDisclosure: useDisclosure,
  // Media & Icons (Avatar already restored)
  AvatarGroup: AvatarGroup, Icon: Icon, Image: Image,
  // Other
  AspectRatio: AspectRatio, Breadcrumb: Breadcrumb, BreadcrumbItem: BreadcrumbItem, BreadcrumbLink: BreadcrumbLink, BreadcrumbSeparator: BreadcrumbSeparator,
  Separator: Separator, AbsoluteCenter: AbsoluteCenter,
  CloseButton: CloseButton, Portal: Portal, VisuallyHidden: VisuallyHidden,
  // Hooks
  useCallbackRef: useCallbackRef, useControllableState: useControllableState, useMediaQuery: useMediaQuery,
  // === End Restored Components ===
  // Any custom components or utility functions the AI should access
};

const AppViewer: React.FC<AppViewerProps> = ({ appId }) => {
    // const toast = useToast(); // Instantiate toast here if needed for scope

    // Get state from Redux store using inline selectors
    const componentCode = useAppSelector((state: RootState) => state.ui.componentCode);
    const isLoading = useAppSelector((state: RootState) => state.ui.loading || state.ui.generatingUI ); // Combine loading states
    const error = useAppSelector((state: RootState) => state.ui.error);
    // const iframeRef = useRef<HTMLIFrameElement>(null); // REMOVED iframe ref

    // REMOVED useEffect for postMessage

    if (isLoading) {
        return (
            <Center height="100%">
                <Spinner size="xl" />
            </Center>
        );
    }

    // Handle errors from Redux state
    if (error) { // Only showing Redux errors
        return (
            <Center height="100%" p={4}>
                <Alert.Root status="error">
                    <Box fontWeight="bold">Error loading application!</Box>
                    <Box>{typeof error === 'string' ? error : JSON.stringify(error)}</Box>
                </Alert.Root>
            </Center>
        );
    }

    // If no code and no error/loading state
    if (!componentCode) {
         return (
            <Center height="100%">
                <Box>No application code generated yet.</Box>
            </Center>
        );
    }

    // Wrap the code into a functional component for react-live
    const wrappedCode = componentCode ? `() => { ${componentCode} }` : '<></>'; // Default to fragment if no code

    // Use React Live for rendering
  return (
        <LiveProvider code={wrappedCode} scope={liveScope} noInline={false}>
          <Box p={4} height="100%" display="flex" flexDirection="column" borderWidth="1px" borderRadius="md" overflow="hidden">
            {/* Optional: LiveEditor for debugging */}
            {/* <Box as={LiveEditor} p={2} bg="gray.800" color="gray.100" fontFamily="monospace" fontSize="sm" /> */}
            <Box flex="1" p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="auto" position="relative">
              <LivePreview /> {/* Render the component here */}
            </Box>
            <Box as={LiveError} bg="red.100" color="red.700" p={3} mt={2} borderRadius="md" fontFamily="monospace" fontSize="sm" whiteSpace="pre-wrap" /> {/* Show errors */}
          </Box>
        </LiveProvider>
  );
};

export default AppViewer; 