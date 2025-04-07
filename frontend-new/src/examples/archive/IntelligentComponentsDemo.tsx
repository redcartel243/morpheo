/*
 * ARCHIVED COMPONENT - DO NOT USE IN PRODUCTION
 * 
 * This component demonstrates an older approach to intelligent component connections
 * that has been replaced with Morpheo's current architecture.
 * 
 * It is kept for reference purposes only.
 * 
 * For current patterns, refer to the documentation or current examples.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppDispatch, useAppSelector, AppProvider } from '../components/ui/state/Store';
import Card from '../components/ui/components/layout/Card';
import Grid from '../components/ui/components/layout/Grid';
import Text from '../components/ui/components/basic/Text';
import { IntelligentButton, IntelligentTextInput } from '../components/ui/intelligent/components';
import { connectionManager } from '../components/ui/intelligent/ConnectionManager';
import { ComponentEventType } from '../components/ui/intelligent/ComponentTypes';
import { withIntelligentComponentProvider } from '../components/ui/intelligent/IntelligentComponentProvider';
import { SUBSCRIBE } from '../components/ui/state/actionTypes';
import { componentRegistry } from '../components/ui/intelligent/ComponentRegistry';

/**
 * Demo of intelligent components working together
 */
export const IntelligentComponentsDemo: React.FC = () => {
  const dispatch = useAppDispatch();
  const [logs, setLogs] = useState<string[]>([]);
  
  // Create a ref at the component level
  const lastProcessedEventRef = useRef<number>(0);
  
  // Use refs to maintain stable component IDs across renders
  const nameInputId = useRef(uuidv4()).current;
  const messageInputId = useRef(uuidv4()).current;
  const submitButtonId = useRef(uuidv4()).current;
  const clearButtonId = useRef(uuidv4()).current;
  
  // Add a log entry using useCallback to ensure it doesn't change on re-renders
  const addLog = useCallback((message: string) => {
    setLogs(prevLogs => {
      const newLogs = [...prevLogs.slice(-9), message];
      return newLogs;
    });
  }, []);
  
  // Get component instance states
  const nameInstance = useAppSelector(state => 
    state.components?.instances?.[nameInputId]
  );
  
  const messageInstance = useAppSelector(state => 
    state.components?.instances?.[messageInputId]
  );
  
  // Debug output for component instances
  useEffect(() => {
    console.log('Component state check:', {
      nameInput: nameInstance ? 'registered' : 'not registered',
      messageInput: messageInstance ? 'registered' : 'not registered',
      nameInputState: nameInstance?.state,
      messageInputState: messageInstance?.state
    });
  }, [nameInstance, messageInstance]);
  
  // Set up connections between components
  useEffect(() => {
    try {
      // Create components in registry if they don't exist
      const hasComponent = (id: string) => {
        const connections = connectionManager.getConnectionsForComponent(id);
        return connections.length > 0;
      };
      
      // Setup: Message input enables/disables submit button based on content
      try {
        connectionManager.connect(
          messageInputId,
          'value',
          submitButtonId,
          'disabled',
          (value) => !value || value.trim() === ''
        );
      } catch (error) {
        console.error('Error creating connection:', error);
      }
      
      // Setup: Clear button resets both inputs
      try {
        connectionManager.connect(
          clearButtonId,
          'click',
          nameInputId,
          'value',
          () => ''
        );
      } catch (error) {
        console.error('Error creating connection:', error);
      }
      
      try {
        connectionManager.connect(
          clearButtonId,
          'click',
          messageInputId,
          'value',
          () => ''
        );
      } catch (error) {
        console.error('Error creating connection:', error);
      }
      
      return () => {
        // Cleanup connections
        connectionManager.getConnectionsForComponent(nameInputId)
          .forEach(conn => connectionManager.removeConnection(conn.id));
        
        connectionManager.getConnectionsForComponent(messageInputId)
          .forEach(conn => connectionManager.removeConnection(conn.id));
        
        connectionManager.getConnectionsForComponent(submitButtonId)
          .forEach(conn => connectionManager.removeConnection(conn.id));
        
        connectionManager.getConnectionsForComponent(clearButtonId)
          .forEach(conn => connectionManager.removeConnection(conn.id));
      };
    } catch (error) {
      console.error('Error setting up connections:', error);
      return () => {};
    }
  }, [nameInputId, messageInputId, submitButtonId, clearButtonId]);
  
  // Direct event handlers to ensure we catch events even if middleware fails
  const handleSubmitClick = useCallback(() => {
    // Get the latest state of the components
    const nameComponent = componentRegistry.getInstance(nameInputId);
    const messageComponent = componentRegistry.getInstance(messageInputId);
    
    // Get values from these components
    const name = nameComponent?.state?.value || 'Anonymous';
    const message = messageComponent?.state?.value || '';
    
    if (message) {
      addLog(`${name} says: ${message}`);
    }
  }, [nameInputId, messageInputId, addLog]);
  
  const handleClearClick = useCallback(() => {
    // This is handled by connections now
  }, []);
  
  // Listen for form submit via button click through the middleware
  useEffect(() => {
    // Define the event listener function
    const eventListener = (event: any) => {
      // Check for Submit button click
      if (
        event.type === 'components/COMPONENT_EVENT' && 
        event.payload.componentId === submitButtonId &&
        event.payload.type === ComponentEventType.CLICK
      ) {
        handleSubmitClick();
      }
      
      // Check for Clear button click
      if (
        event.type === 'components/COMPONENT_EVENT' && 
        event.payload.componentId === clearButtonId &&
        event.payload.type === ComponentEventType.CLICK
      ) {
        handleClearClick();
      }
    };
    
    try {
      const result: any = dispatch({
        type: SUBSCRIBE,
        payload: eventListener
      });
      
      if (typeof result === 'function') {
        return () => {
          result();
        };
      } else {
        return () => {};
      }
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
      return () => {};
    }
  }, [dispatch, submitButtonId, clearButtonId, handleSubmitClick, handleClearClick]);
  
  return (
    <Card>
      <Text variant="h3">Intelligent Component Demo</Text>
      <Text variant="body1">
        These components are self-contained and communicate through defined connection points.
        The submit button is automatically disabled when the message field is empty.
        The clear button resets both input fields.
      </Text>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Text variant="h5">Interactive Form</Text>
          
          <IntelligentTextInput
            componentId={nameInputId}
            label="Your Name"
            placeholder="Enter your name"
            fullWidth
          />
          
          <IntelligentTextInput
            componentId={messageInputId}
            label="Message"
            placeholder="Type something to enable the submit button"
            fullWidth
          />
          
          <div>
            <IntelligentButton
              componentId={submitButtonId}
              label="Submit"
              variant="primary"
              onClick={handleSubmitClick}
            />
            
            <IntelligentButton
              componentId={clearButtonId}
              label="Clear"
              variant="outline"
              onClick={handleClearClick}
            />
          </div>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Text variant="h5">Activity Log</Text>
          
          <div style={{ minHeight: '200px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' }}>
            {logs.length === 0 ? (
              <Text variant="body2">
                No activity yet. Submit a message to see it appear here.
              </Text>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f8f9fa' }}>
                  <Text variant="body2">{log}</Text>
                </div>
              ))
            )}
          </div>
        </Grid>
      </Grid>
      
      <Text variant="h5">
        How It Works
      </Text>
      
      <Text variant="body2">
        <b>Connection 1:</b> Message Input → Submit Button<br />
        The message input's "value" connection point is connected to the submit button's "enabled" connection.
        A transform function converts the message text to a boolean that enables the button only when there's text.
      </Text>
      
      <Text variant="body2">
        <b>Connection 2 & 3:</b> Clear Button → Name & Message Inputs<br />
        The clear button's "click" output is connected to both input components' "value" connection points.
        When clicked, it sets both input values to empty strings.
      </Text>
      
      <Text variant="body2">
        <b>Event Handling:</b> The app listens for click events from the submit button. When detected,
        it reads the current values from both inputs and displays the message in the log.
      </Text>
    </Card>
  );
};

// Wrap with providers
export const IntelligentComponentsDemoWithProvider: React.FC = () => {
  const WrappedComponent = withIntelligentComponentProvider(IntelligentComponentsDemo);
  return (
    <AppProvider>
      <WrappedComponent />
    </AppProvider>
  );
};

export default withIntelligentComponentProvider(IntelligentComponentsDemo); 