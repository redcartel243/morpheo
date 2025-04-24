import React, { useState, useRef, useEffect, useMemo, useCallback, createElement, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';

// --- Drastically Simplified Imports for Chakra v3 ---
import {
  // Layout
  Box, Flex, Grid, GridItem, Stack, HStack, VStack, Container, Center, Spacer,
  // Text
  Text, Heading,
  // Forms
  Button, IconButton, Input, Textarea,
  Checkbox as ChakraCheckbox,
  Select as ChakraSelect,
  InputGroup, InputAddon,
  // Media
  Image, Icon,
  // Feedback
  Spinner,
  // List
  List, ListItem,
  // Base Chakra component type (might not be needed if typing works)
  ChakraComponent
} from '@chakra-ui/react';
// --- END Simplified Imports ---

// Interface definitions
interface DynamicComponentProps {
  component: ComponentChild;
  appState: Record<string, any>;
  handleStateUpdateAction: (variableName: string, updateRule: any, event?: any) => void;
  updateAppState: (updates: Record<string, any>) => void;
  itemData?: Record<string, any>;
}

interface ComponentEvent {
  type: string;
  target: {
    value?: any;
    checked?: boolean;
    // other event target properties...
  };
  // other event properties...
}

export interface ComponentChild {
  id?: string;
  type?: string;
  props?: Record<string, any>;
  children?: (ComponentChild | string)[] | undefined;
  methods?: Record<string, any>; // Make sure methods is part of the interface
  region?: string;
  key?: string;
  itemTemplate?: ComponentChild | Record<string, any>;
}

// --- Drastically Simplified componentMap ---
const componentMap: Record<string, React.ComponentType<any> | ChakraComponent<any, any>> = {
  // Layout
  Box: Box, box: Box, div: Box,
  Flex: Flex, flex: Flex,
  Grid: Grid, grid: Grid,
  GridItem: GridItem, gridItem: GridItem, 'grid-item': GridItem,
  Stack: Stack, stack: Stack,
  HStack: HStack, hstack: HStack, 'h-stack': HStack,
  VStack: VStack, vstack: VStack, 'v-stack': VStack,
  Container: Container, container: Container,
  Center: Center, center: Center,
  Spacer: Spacer, spacer: Spacer,

  // Text & Typography
  Text: Text, text: Text, p: Text, span: Text, label: Text,
  Heading: Heading, heading: Heading,
  h1: (props) => <Heading as="h1" size="2xl" {...props} />,
  h2: (props) => <Heading as="h2" size="xl" {...props} />,
  h3: (props) => <Heading as="h3" size="lg" {...props} />,
  h4: (props) => <Heading as="h4" size="md" {...props} />,
  h5: (props) => <Heading as="h5" size="sm" {...props} />,
  h6: (props) => <Heading as="h6" size="xs" {...props} />,

  // Media
  Image: Image, image: Image, img: Image,
  Icon: Icon, icon: Icon,

  // Forms
  Button: Button, button: Button,
  IconButton: IconButton, iconButton: IconButton, 'icon-button': IconButton,
  Input: Input, input: Input, 'text-input': Input, // Map text-input here
  InputGroup: InputGroup, inputGroup: InputGroup, 'input-group': InputGroup,
  InputAddon: InputAddon, inputAddon: InputAddon, 'input-addon': InputAddon,
  Textarea: Textarea, textarea: Textarea,
  Checkbox: (props) => <ChakraCheckbox.Root {...props} ml={props.ml ?? 2}><ChakraCheckbox.Indicator /></ChakraCheckbox.Root>,
  checkbox: (props) => <ChakraCheckbox.Root {...props} ml={props.ml ?? 2}><ChakraCheckbox.Indicator /></ChakraCheckbox.Root>,
  Select: (props) => <ChakraSelect.Root {...props}><ChakraSelect.Trigger /><ChakraSelect.Content>{/* Options need rendering */}</ChakraSelect.Content></ChakraSelect.Root>,
  select: (props) => <ChakraSelect.Root {...props}><ChakraSelect.Trigger /><ChakraSelect.Content>{/* Options need rendering */}</ChakraSelect.Content></ChakraSelect.Root>,

  // Feedback
  Spinner: Spinner, spinner: Spinner, loader: Spinner,

  // List
  List: (props) => <List.Root {...props} />,
  list: (props) => <List.Root {...props} />,
  ul: (props) => <List.Root {...props} />,
  ListItem: (props) => <List.Item {...props} />,
  listItem: (props) => <List.Item {...props} />,
  li: (props) => <List.Item {...props} />,

  // REMOVED complex components: Card, List, Table, Modal, Drawer, Accordion, etc.
};
// --- END Simplified componentMap ---

// --- DynamicComponent Implementation ---
export const DynamicComponent: React.FC<DynamicComponentProps> = (props) => {
  const { component, appState, handleStateUpdateAction, updateAppState, itemData } = props;

  const safeComponent = useMemo(() => {
     if (!component || typeof component !== 'object') {
        console.error("Invalid component structure received:", component);
        return { type: 'Box', id: `fallback-${Date.now()}`, props: {}, children: [], methods: {} };
     }
     const rawProps = component.props || {};
     const rawChildren = Array.isArray(component.children) ? component.children : [];
    return {
       type: component.type || 'Box', // Default to Box if type is missing
       id: component.id || `component-${Math.random().toString(36).substr(2, 9)}`,
       props: rawProps,
       children: rawChildren,
       methods: component.methods || {}, // Ensure methods is an object
     };
  }, [component]);

  const ResolvedComponent = componentMap[safeComponent.type] || Box;
  if (!componentMap[safeComponent.type]) {
     console.warn(`[DynamicComponent] Component type "${safeComponent.type}" (ID: ${safeComponent.id}) not found in simplified componentMap. Falling back to Box.`);
  }

  const handleEvent = useCallback((eventType: string, event: ComponentEvent | any) => {
    // --- Add DEBUG log ---
    console.log(`[DynamicComponent handleEvent] Event triggered: type='${eventType}', componentId='${safeComponent.id}', eventObject:`, event);
    // --- END DEBUG log ---
    const handlerPropName = `on${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}`;
    const structuredMethodConfig = safeComponent.methods?.[eventType];

    if (structuredMethodConfig && Array.isArray(structuredMethodConfig)) {
      console.log(`[DynamicComponent] Executing structured method (direct array) for ${eventType} on ${safeComponent.id}`);
      executeComponentMethod(
        structuredMethodConfig,
        safeComponent.id,
        appState,
        updateAppState,
        event,
        itemData
      );
    } else {
       // Optionally handle legacy prop-based handlers if needed, or log absence
       const legacyHandlerConfig = safeComponent.props?.[handlerPropName];
       if (legacyHandlerConfig && typeof legacyHandlerConfig === 'object') {
            console.warn(`[DynamicComponent] Executing legacy handler for ${eventType} on ${safeComponent.id}`);
             // ... (simplified legacy handling - updateState only for demo)
             if (legacyHandlerConfig.updateState) {
                 Object.entries(legacyHandlerConfig.updateState).forEach(([varName, rule]) => {
                     handleStateUpdateAction(varName, rule, event);
                 });
              }
       } else {
            // console.log(`[DynamicComponent] No handler found for ${eventType} on ${safeComponent.id}`);
       }
    }
  }, [safeComponent, appState, handleStateUpdateAction, updateAppState, itemData]);

  const renderFallbackComponent = () => (
      <Box border="1px dashed red" p={4} id={safeComponent.id}>
        <Heading size="sm">Component Error!</Heading>
        <Text>Failed to render type "{safeComponent.type}" (ID: {safeComponent.id}). Check config or map.</Text>
      </Box>
  );

  // Memoize the rendered children separately
  const renderedChildrenElements = useMemo(() => {
    if (!safeComponent.children || !Array.isArray(safeComponent.children)) return null;
    // Use the renderChildren logic BUT return the array of elements/strings
    return safeComponent.children.map((child, index) => {
      if (typeof child === 'string') return child;
      if (typeof child === 'object' && child !== null && child.type) {
        // Pass itemData down to children
        return <DynamicComponent key={child.id || `${safeComponent.id}-child-${index}`} component={child} appState={appState} handleStateUpdateAction={handleStateUpdateAction} updateAppState={updateAppState} itemData={itemData} />;
      }
      console.warn(`[DynamicComponent] Skipping invalid child at index ${index} for ${safeComponent.id}:`, child);
      return null;
    }).filter(Boolean); // Filter out nulls
  }, [safeComponent.children, appState, handleStateUpdateAction, updateAppState, itemData]); // Dependencies for children rendering

  const componentProps = useMemo(() => {
      const rawProps = safeComponent.props || {};
      // Pass itemData if it exists
      const finalProps: Record<string, any> = { id: safeComponent.id, key: safeComponent.id }; 
      
      // --- Modified children rendering logic to pass itemData down ---
      if (renderedChildrenElements && (!Array.isArray(renderedChildrenElements) || renderedChildrenElements.length > 0)) {
        finalProps.children = renderedChildrenElements;
      }

      for (const key in rawProps) {
          const value = rawProps[key];
          if (key === 'id' || key === 'key') continue; // Skip reserved keys

          // --- Modified Prop Binding Logic ---
          let propResolved = false;
          // 1. Check for $itemState binding (only if itemData exists)
          if (itemData && typeof value === 'object' && value !== null && value.hasOwnProperty('$itemState')) {
            const itemStateKey = value.$itemState;
            if (itemData.hasOwnProperty(itemStateKey)) {
              finalProps[key] = itemData[itemStateKey];
              // --- ADD DEBUG LOG for $itemState ---
              console.log(`[DynamicComponent State Read - Item] Component ${safeComponent.id} reading item state '${itemStateKey}' for prop '${key}'. Value:`, itemData[itemStateKey]);
              // --- END DEBUG LOG ---
              propResolved = true;
            } else {
              console.warn(`[DynamicComponent State Read - Item] Component ${safeComponent.id} tried to read item state '${itemStateKey}' but key not found in itemData. Prop: '${key}'. ItemData:`, itemData);
              finalProps[key] = undefined; // Or null, or some default
              propResolved = true; // Still counts as resolved (to undefined)
            }
          }

          // 2. Check for $state binding (if not resolved by $itemState)
          if (!propResolved && typeof value === 'object' && value !== null && value.hasOwnProperty('$state')) {
              const stateVariableName = value.$state;
              finalProps[key] = appState[stateVariableName];
              // --- ADD DEBUG LOG for $state ---
              if (safeComponent.id === 'newItemInput' && key === 'value') {
                console.log(`[DynamicComponent State Read - Global] Component ${safeComponent.id} reading global state '${stateVariableName}' for prop '${key}'. Value:`, appState[stateVariableName]);
              }
              // --- END DEBUG LOG ---
              propResolved = true;
          }
          // --- End Modified Prop Binding Logic ---

          // Handle legacy event handlers (if not already resolved and no structured method exists)
          if (!propResolved && key.startsWith('on') && typeof value === 'object' && value !== null) {
              const eventType = key.substring(2).toLowerCase();
              if (!safeComponent.methods?.[eventType]) {
                 finalProps[key] = (event: any) => handleEvent(eventType, event);
                 propResolved = true;
              }
          } 
          
          // Pass other props directly if not resolved by state bindings or legacy events
          if (!propResolved) {
            finalProps[key] = value;
          }
      }

      // Integrate event handlers from structured `methods`
      if (safeComponent.methods && typeof safeComponent.methods === 'object') {
          for (const eventType in safeComponent.methods) {
              console.log(`[DynamicComponent Prop Map] Checking methods.${eventType} for ${safeComponent.id}`); // DEBUG
              const methodConfig = safeComponent.methods[eventType];
              if (methodConfig && Array.isArray(methodConfig) && methodConfig.length > 0) { 
                  const handlerPropName = `on${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}`;
                  // Pass itemData to handleEvent if it exists
                  finalProps[handlerPropName] = (event: any) => handleEvent(eventType, event); 
                  console.log(`[DynamicComponent Prop Map] Mapped methods.${eventType} to prop ${handlerPropName} for ${safeComponent.id}`); // DEBUG LOG
            } else {
                  console.warn(`[DynamicComponent Prop Map] Skipping invalid/empty method config for ${eventType} on ${safeComponent.id}:`, methodConfig); // DEBUG LOG
              }
          }
      }

       // --- Conditional Value/DefaultValue for Controlled Inputs ---
       const isInputType = ['Input', 'input', 'text-input', 'Textarea', 'textarea'].includes(safeComponent.type);
       const isToggleType = ['Checkbox', 'checkbox'].includes(safeComponent.type); // Add Switch later if needed
       const hasOnChangeMethod = safeComponent.methods?.change || safeComponent.methods?.onChange || finalProps.onChange;

       if (isInputType) {
           const value = finalProps.value; // Value from props
           if (hasOnChangeMethod) {
               // Controlled: Set `value`, remove `defaultValue`
               finalProps.value = value ?? ''; // Default to empty string if undefined/null
               delete finalProps.defaultValue;
            } else {
               // Uncontrolled: Set `defaultValue`, remove `value`
               if (value !== undefined) { // Only set defaultValue if value was provided
                  finalProps.defaultValue = value;
               }
               delete finalProps.value;
           }
       } else if (isToggleType) {
           const isChecked = finalProps.isChecked; // Value from props
           if (hasOnChangeMethod) {
               // Controlled: Set `isChecked`, remove `defaultChecked`
               finalProps.isChecked = isChecked ?? false; // Default to false
               delete finalProps.defaultChecked;
        } else {
                // Uncontrolled: Set `defaultChecked`, remove `isChecked`
               if (isChecked !== undefined) { // Only set defaultChecked if isChecked was provided
                   finalProps.defaultChecked = isChecked;
               }
               delete finalProps.isChecked;
           }
       }
       // --- End Controlled Input Handling ---

      return finalProps;
  }, [safeComponent, appState, handleEvent, renderedChildrenElements, itemData]); // Added itemData dependency

  try {
     // Check if it's a List component needing special handling
     const isList = ['List', 'list', 'ul', 'OrderedList', 'orderedList', 'ol', 'UnorderedList', 'unorderedList'].includes(safeComponent.type);

     if (isList && componentProps.itemTemplate && componentProps.items) {
       const itemsArray = componentProps.items; // Already resolved from state by componentProps memo
       const itemTemplateConfig = componentProps.itemTemplate;

       if (!Array.isArray(itemsArray)) {
         console.error(`[DynamicComponent List Error] 'items' prop for List ${safeComponent.id} is not an array. Received:`, itemsArray);
         return renderFallbackComponent();
       }
       if (typeof itemTemplateConfig !== 'object' || itemTemplateConfig === null) {
         console.error(`[DynamicComponent List Error] 'itemTemplate' prop for List ${safeComponent.id} is not a valid object. Received:`, itemTemplateConfig);
         return renderFallbackComponent();
       }

       console.log(`[DynamicComponent Render List] Rendering List ${safeComponent.id} with ${itemsArray.length} items using template.`);

       // Render children using the itemTemplate
       const renderedListItems = itemsArray.map((item, index) => (
         <DynamicComponent
           // Use item.id if available, otherwise index - ensure unique keys
           key={item.id || `${safeComponent.id}-item-${index}`} 
           component={itemTemplateConfig as ComponentChild} // Pass the template config
           appState={appState} // Pass global state
           handleStateUpdateAction={handleStateUpdateAction} // Pass handlers
           updateAppState={updateAppState} // Pass handlers
           itemData={item} // Pass the specific item's data for $itemState bindings
         />
       ));

       // Prepare props for the List.Root component (exclude custom props)
       const listRootProps = { ...componentProps };
       delete listRootProps.items;
       delete listRootProps.itemTemplate;
       listRootProps.children = renderedListItems; // Set the rendered items as children

       return <ResolvedComponent {...listRootProps} />;

     } else {
       // --- Original Rendering Logic for Non-List Components ---
       console.log(`[DynamicComponent Render] Rendering ${safeComponent.type} (${safeComponent.id}) with props:`, componentProps);
       if (safeComponent.type === 'Button' || safeComponent.type === 'button') {
         console.log(`[DynamicComponent Button Check] Final props for ${safeComponent.id}:`, componentProps);
       }
       return (
           <ResolvedComponent {...componentProps} />
       );
       // --- End Original Rendering Logic ---
     }

  } catch (renderError) {
    console.error(`[DynamicComponent] Error rendering component ${safeComponent.id} (${safeComponent.type}):`, renderError);
    console.error("Props passed:", componentProps);
    return renderFallbackComponent();
  }
};

// --- Action Execution Logic ---
const executeComponentMethod = (
  actions: any[],
  componentId: string,
  appState: Record<string, any>,
  updateAppState: (updates: Record<string, any>) => void, // Correct function signature
  event: ComponentEvent | any, // Accept specific or generic event type
  itemData?: Record<string, any> // <-- Added itemData
) => {
    console.log(`[ActionExec] Executing method for ${componentId}. Actions:`, actions);
    // Pass itemData to the method context if it exists
    const methodContext: Record<string, any> = { _itemData: itemData || null }; 

    // Helper to resolve values (from literals or method context variables)
    const resolveValue = (valueConfig: any): any => {
        if (typeof valueConfig !== 'object' || valueConfig === null) return valueConfig; // Already a literal or null/undefined
        
        // --- Updated resolveValue to prioritize _itemData ---
        if (valueConfig.type === 'VARIABLE') {
            const varName = valueConfig.name;
            // Check local method context first
            if (methodContext.hasOwnProperty(varName)) {
               console.log(`[resolveValue] Resolving VARIABLE '${varName}' from methodContext. Value:`, methodContext[varName]);
               return methodContext[varName];
            } 
            // --- Removed check for _itemData here, handled by GET_ITEM_CONTEXT ---
            // else if (methodContext._itemData && methodContext._itemData.hasOwnProperty(varName)) {
            //    console.log(`[resolveValue] Resolving VARIABLE '${varName}' from itemData. Value:`, methodContext._itemData[varName]);
            //    return methodContext._itemData[varName];
            // } 
            else {
               console.warn(`[resolveValue] Variable '${varName}' not found in methodContext or itemData.`);
               return undefined; 
            }
        }
        // --- End Updated resolveValue ---

        if (valueConfig.type === 'LITERAL') return valueConfig.value;

        // --- Added GET_ITEM_CONTEXT handling ---
        if (valueConfig.type === 'ITEM_CONTEXT') {
            const itemKey = valueConfig.key; // e.g., 'id', 'text', 'completed'
            if (methodContext._itemData && methodContext._itemData.hasOwnProperty(itemKey)) {
                console.log(`[resolveValue] Resolving ITEM_CONTEXT '${itemKey}'. Value:`, methodContext._itemData[itemKey]);
                return methodContext._itemData[itemKey];
        } else {
                 console.warn(`[resolveValue] ITEM_CONTEXT key '${itemKey}' not found in itemData.`);
                 return undefined;
            }
        }
        // --- End GET_ITEM_CONTEXT handling ---

        console.warn("[ActionExec] Unknown value config:", valueConfig);
        return valueConfig; // Return as is if structure is unknown
    };

    // Execute actions sequentially
    actions.forEach(action => {
        if (!action || typeof action !== 'object' || !action.type) {
            console.error("[ActionExec] Invalid action structure:", action);
            return; // Skip invalid actions
        }

        try {
            const actionType = action.type;
            const payload = action.payload || {}; // Ensure payload exists

            console.log(`[ActionExec] Processing action: ${actionType}`, payload);

            switch (actionType) {
                // --- Add GET_ITEM_CONTEXT Action ---
                case 'GET_ITEM_CONTEXT': {
                    const { resultVariableId, resultVariableIndex } = payload;
                    if (!itemData) {
                        console.error("GET_ITEM_CONTEXT: Cannot get item context - no itemData provided.");
                        break;
                    }
                    if (resultVariableId && itemData.id) {
                        methodContext[resultVariableId] = itemData.id;
                         console.log(`GET_ITEM_CONTEXT: ${resultVariableId} = ${itemData.id}`);
                    }
                    // Note: Getting the index might be complex/unreliable here
                    // If index is truly needed, it might need to be passed differently
                    // or the list state structure needs to guarantee stable indices.
                    // For now, we focus on ID-based identification.
                    if (resultVariableIndex) {
                         // Attempt to get index if passed, otherwise set null/undefined
                         methodContext[resultVariableIndex] = itemData._index !== undefined ? itemData._index : null; 
                         console.log(`GET_ITEM_CONTEXT: ${resultVariableIndex} = ${methodContext[resultVariableIndex]}`);
                    }
                    break;
                }
                // --- End GET_ITEM_CONTEXT Action ---

                case 'GET_PROPERTY': {
                    const { targetId, propertyName, resultVariable } = payload;
                    if (!propertyName || !resultVariable) {
                        console.error("GET_PROPERTY: Missing propertyName or resultVariable"); break;
                    }
                    // Simplistic state access: Assume propertyName is a key in global appState
                    methodContext[resultVariable] = appState[propertyName] ?? null;
                    console.log(`GET_PROPERTY (Global State): ${resultVariable} = ${methodContext[resultVariable]}`);

                    // --- ADDED: Placeholder for Item Context --- 
                    // We need a way for IR to specify getting context from the item itself
                    // if targetId indicates a list item template context.
                    // For now, this only reads from global appState.
                    // --- END Placeholder ---

        break;
      }
                case 'SET_PROPERTY': {
                    const { targetId, propertyName, value } = payload;
                     if (!propertyName) {
                        console.error("SET_PROPERTY: Missing propertyName"); break;
                    }
                    // --- ADD DEBUG LOG --- 
                    console.log(`[SET_PROPERTY Action] Attempting to set '${propertyName}'. Value object received:`, JSON.stringify(value));
                    // --- END DEBUG LOG ---
                    const resolvedValue = resolveValue(value); // Resolve first

                    // --- Add $increment logic ---
                    if (typeof resolvedValue === 'object' && resolvedValue !== null && resolvedValue.hasOwnProperty('$increment')) {
                        const incrementAmount = typeof resolvedValue.$increment === 'number' ? resolvedValue.$increment : 1; // Default increment by 1
                        const currentValue = appState[propertyName]; // Get current value from actual state
                        if (typeof currentValue === 'number') {
                            const newValue = currentValue + incrementAmount;
                            updateAppState({ [propertyName]: newValue });
                            console.log(`SET_PROPERTY ($increment): Updated state '${propertyName}' from ${currentValue} to ${newValue}`);
        } else {
                            console.error(`SET_PROPERTY ($increment): Cannot increment non-numeric state '${propertyName}'. Current value:`, currentValue);
      }
    } else {
                      // Original logic: Update central app state directly using propertyName as key
                      updateAppState({ [propertyName]: resolvedValue });
                      console.log(`SET_PROPERTY: Updated state '${propertyName}' to`, resolvedValue);
                    }
                    // --- End $increment logic ---
                    break;
                }
                case 'GET_EVENT_DATA': {
                    const { path, resultVariable } = payload;
                    if (!resultVariable) {
                         console.error("GET_EVENT_DATA: Missing resultVariable"); break;
                    }
                    let eventValue: any = event;
                    try {
                       // Safely traverse path, e.g., "target.value" or "target.checked"
                       path?.split('.').forEach((segment: string) => { eventValue = eventValue?.[segment]; });
                       methodContext[resultVariable] = eventValue;
                       console.log(`GET_EVENT_DATA: ${resultVariable} =`, eventValue);
                    } catch (e) {
                        console.error(`GET_EVENT_DATA Error accessing path '${path}': ${e}`);
                        methodContext[resultVariable] = undefined;
                    }
                    break;
                }
                case 'LOG_MESSAGE': {
                    const { message } = payload;
                    const resolvedMessage = resolveValue(message);
                    console.log('[IR LOG]', resolvedMessage);
                    break;
                }
                // --- ADDED: List Item Manipulation Handlers --- 
                case 'ADD_ITEM': {
                    const { targetId, itemValue } = payload;
                    if (!targetId) {
                        console.error("ADD_ITEM: Missing targetId (should be list's state key)"); break;
                    }
                    const resolvedItemValue = resolveValue(itemValue);
                    const currentList = appState[targetId] || [];
                    if (!Array.isArray(currentList)) {
                        console.error(`ADD_ITEM: State key '${targetId}' is not an array.`); break;
                    }
                    // Assume new items need text and a completed status
                    const newItem = {
                        id: uuidv4(), // Generate unique ID
                        text: resolvedItemValue,
                        completed: false
                    };
                    updateAppState({ [targetId]: [...currentList, newItem] });
                    console.log(`ADD_ITEM: Added item to '${targetId}'. New list:`, [...currentList, newItem]);
        break;
    }
                case 'UPDATE_ITEM_PROPERTY': {
                    const { targetId, property, value, itemIdentifier } = payload; // Expect itemIdentifier (e.g., { key: 'id', value: 'item-123' } or { index: 0 })
                    if (!targetId || !property || !itemIdentifier) {
                        console.error("UPDATE_ITEM_PROPERTY: Missing targetId, property, or itemIdentifier"); break;
                    }
                    const resolvedValue = resolveValue(value);
                    const currentList = appState[targetId] || [];
                    if (!Array.isArray(currentList)) {
                        console.error(`UPDATE_ITEM_PROPERTY: State key '${targetId}' is not an array.`); break;
                    }

                    const { key: idKey, value: idValue, index } = itemIdentifier;
                    let itemUpdated = false;
                    const newList = currentList.map((item, idx) => {
                        if ((idKey && item[idKey] === idValue) || (index !== undefined && idx === index)) {
                            itemUpdated = true;
                            return { ...item, [property]: resolvedValue };
                        }
                        return item;
                    });

                    if (itemUpdated) {
                        updateAppState({ [targetId]: newList });
                        console.log(`UPDATE_ITEM_PROPERTY: Updated item property '${property}' in list '${targetId}'. New list:`, newList);
        } else {
                        console.warn(`UPDATE_ITEM_PROPERTY: Item not found in list '${targetId}' with identifier:`, itemIdentifier);
                    }
                    break;
                }
                case 'DELETE_ITEM': {
                    const { targetId, itemIdentifier } = payload; 
                    if (!targetId || !itemIdentifier) {
                        console.error("DELETE_ITEM: Missing targetId or itemIdentifier"); break;
                    }
                    const currentList = appState[targetId] || [];
                     if (!Array.isArray(currentList)) {
                        console.error(`DELETE_ITEM: State key '${targetId}' is not an array.`); break;
                    }
                    
                    // Resolve the identifier value
                    const identifierValue = resolveValue(itemIdentifier.value);
                    const identifierKey = itemIdentifier.key; // e.g., 'id'

                    if (identifierKey === undefined || identifierValue === undefined) {
                         console.error("DELETE_ITEM: Invalid itemIdentifier structure or unresolved value."); break;
                    }

                    let originalLength = currentList.length;
                    // --- Added Debug Logging Inside Filter --- 
                    const newList = currentList.filter(item => {
                        const itemValueToCheck = item[identifierKey];
                        const itemMatches = itemValueToCheck === identifierValue;
                        console.log(`[DELETE_ITEM Filter Debug] Comparing item[${identifierKey}] (Type: ${typeof itemValueToCheck}, Value: ${itemValueToCheck}) === identifierValue (Type: ${typeof identifierValue}, Value: ${identifierValue}). Match: ${itemMatches}`);
                        return !itemMatches; // Keep if it DOESN'T match
                    });
                    // --- End Debug Logging ---

                    if (newList.length < originalLength) {
                         updateAppState({ [targetId]: newList });
                         console.log(`DELETE_ITEM: Deleted item from list '${targetId}'. New list:`, newList);
                    } else {
                        console.warn(`DELETE_ITEM: Item not found in list '${targetId}' with identifier:`, { key: identifierKey, value: identifierValue });
                    }
                    break;
                }
                // --- NEW: Higher-level action for toggling boolean properties --- 
                case 'TOGGLE_ITEM_BOOLEAN': {
                    const { targetId, propertyKey, itemIdentifier } = payload;
                    if (!targetId || !propertyKey || !itemIdentifier) {
                        console.error("TOGGLE_ITEM_BOOLEAN: Missing targetId, propertyKey, or itemIdentifier"); break;
                    }
                    const currentList = appState[targetId] || [];
                    if (!Array.isArray(currentList)) {
                        console.error(`TOGGLE_ITEM_BOOLEAN: State key '${targetId}' is not an array.`); break;
                    }

                    // Resolve identifier value (likely from item context)
                    const identifierValue = resolveValue(itemIdentifier.value);
                    const identifierKey = itemIdentifier.key; // e.g., 'id'

                    if (identifierKey === undefined || identifierValue === undefined) {
                         console.error("TOGGLE_ITEM_BOOLEAN: Invalid itemIdentifier structure or unresolved value."); break;
                    }

                    let itemFoundAndToggled = false;
                    const newList = currentList.map(item => {
                        if (item[identifierKey] === identifierValue) {
                            itemFoundAndToggled = true;
                            const currentValue = item[propertyKey];
                            if (typeof currentValue !== 'boolean') {
                                console.warn(`TOGGLE_ITEM_BOOLEAN: Property '${propertyKey}' on item is not a boolean. Setting to true.`);
                                return { ...item, [propertyKey]: true }; // Default to true if not boolean
                            }
                             const newValue = !currentValue;
                             console.log(`[TOGGLE_ITEM_BOOLEAN] Toggling '${propertyKey}' for item ${identifierValue} from ${currentValue} to ${newValue}`);
                            return { ...item, [propertyKey]: newValue };
                        }
                        return item;
                    });

                    if (itemFoundAndToggled) {
                        updateAppState({ [targetId]: newList });
                        console.log(`TOGGLE_ITEM_BOOLEAN: Updated list '${targetId}'. New list:`, newList);
                    } else {
                        console.warn(`TOGGLE_ITEM_BOOLEAN: Item not found in list '${targetId}' with identifier:`, { key: identifierKey, value: identifierValue });
                    }
                    break;
                }
                // --- END TOGGLE_ITEM_BOOLEAN ---

                // --- REMOVED COMPLEX ACTIONS: ADD_ITEM, REMOVE_ITEM, CALL_METHOD, IF, etc. ---
                // These require more complex state management or component manipulation
                // which is beyond the scope of this simplified renderer for now.
                // The AI needs to achieve these effects using SET_PROPERTY on state variables
                // that are then used by standard React/Chakra components.
                // For example, adding to a list means using SET_PROPERTY to update an array in appState,
                // and the list component would simply render based on that array.
                default:
                    console.warn(`[ActionExec] Unsupported action type: ${actionType}`);
            }
        } catch (error) {
            console.error(`[ActionExec] Error executing action: ${JSON.stringify(action)}`, error);
        }
    });
};

// --- ProcessAppConfig Wrapper ---
export const ProcessAppConfig: React.FC<{ config: AppConfig; }> = ({ config: initialConfig }) => {
  // Initialize state from config or default to empty object
  const [appState, setAppState] = useState<Record<string, any>>(() => {
    return initialConfig.app?.initialState || {};
  });

  // Centralized state update function passed down to components
  const updateAppState = useCallback((updates: Record<string, any>) => {
    setAppState(prevState => ({ ...prevState, ...updates }));
    console.log("[ProcessAppConfig] App State Updated:", updates);
  }, []);

  // Simplified legacy handler (mainly for potential direct prop handlers)
  const handleStateUpdateAction = useCallback((variableName: string, updateRule: any, event?: any) => {
     console.log(`[ProcessAppConfig] Handling legacy state update for '${variableName}'`, updateRule);
     setAppState(prevState => {
           let newValue = prevState[variableName];
            if (updateRule?.value !== undefined) {
                newValue = updateRule.value;
            } else if (updateRule?.toggle && typeof prevState[variableName] === 'boolean') {
                newValue = !prevState[variableName];
            } else if (updateRule?.fromEvent && event) {
                 let eventValue: any = event;
                 try {
                     updateRule.fromEvent.split('.').forEach((segment: string) => { eventValue = eventValue?.[segment]; });
                     newValue = eventValue;
                 } catch (e) { console.error("Error getting fromEvent", e); }
  } else {
                 console.warn("Legacy updateState rule not recognized:", updateRule);
            }
            return { ...prevState, [variableName]: newValue };
     });
  }, []);

  // Effect to reset state and components when config changes
  useEffect(() => {
    console.log("[ProcessAppConfig] Config changed, resetting state and components.");
    setAppState(initialConfig.app?.initialState || {});
    setRenderedComponents(initialConfig.components || []);
  }, [initialConfig]);

  // State for the top-level component structure
  const [renderedComponents, setRenderedComponents] = useState<ComponentChild[]>(initialConfig.components || []);

  // --- Region Rendering Logic ---
  const renderRegion = (region: string) => {
    const components = (renderedComponents || []).filter(c => (c.region || 'main') === region);
    if (components.length === 0 && region !== 'main') return null; // Don't render empty non-main regions

                return (
      <Box key={region} className={`region region-${region}`} {...getRegionStyleProps(region)}>
        {components.length > 0 ? components.map((component, index) => (
                  <DynamicComponent
            key={component.id || `${region}-component-${index}`} 
            component={component}
            appState={appState}
            handleStateUpdateAction={handleStateUpdateAction}
            updateAppState={updateAppState} // Pass down the central updater
          />
        )) : (region === 'main' ? <Text>No components in main region.</Text> : null) }
      </Box>
    );
  };

  // --- Region Styling ---
  const getRegionStyleProps = (region: string): Record<string, any> => {
     const themeColors = initialConfig.theme?.colors || {};
    switch (region) {
         case 'header': return { p: "1rem", bg: themeColors.primary || 'gray.100', borderBottomWidth: '1px', mb: "1rem" };
         case 'footer': return { p: "1rem", bg: themeColors.secondary || 'gray.100', borderTopWidth: '1px', mt: 'auto' }; // mt: auto pushes footer down
         case 'sidebar': return { w: { base: '100%', md: '250px' }, bg: themeColors.surface || 'gray.50', p: "1rem", borderRightWidth: { base: '0', md: '1px'}, borderBottomWidth: { base: '1px', md: '0' }, mb: {base: "1rem", md: 0} };
         case 'main': return { flex: 1, p: "1rem", bg: themeColors.background || 'white' };
         default: return { p: '1rem' };
     }
  };

  // --- Layout Structure Logic ---
  const getLayoutStructure = () => {
       const layoutType = initialConfig.layout?.type || 'singlepage'; // Default layout
       const regions = initialConfig.layout?.regions || ['main']; // Default regions
       const appLayoutProps: Record<string, any> = { display: 'flex', flexDir: 'column', minH: '100vh', w: '100%' }; // Use minH: 100vh

       if (layoutType === 'sidebar' && regions.includes('sidebar')) {
           // Sidebar layout (responsive)
        return (
             <Flex {...appLayoutProps} flexDir={{ base: 'column', md: 'row' }}>
              {renderRegion('sidebar')}
               <Flex flex='1' display='flex' flexDir='column' minH="0"> {/* Added minH to prevent flex overflow */}
                 {regions.filter(r => r !== 'sidebar' && r !== 'footer').map(region => renderRegion(region))}
                 {regions.includes('footer') && renderRegion('footer')}
               </Flex>
             </Flex>
           );
       } else {
         // Default single page layout (stacking regions)
      return (
             <Flex {...appLayoutProps}>
               {regions.filter(r => r !== 'footer').map(region => renderRegion(region))}
               {regions.includes('footer') && renderRegion('footer')}
             </Flex>
      );
    }
  };

  // --- Root Styling ---
  const themeProps = initialConfig.theme || {};
  const typographyProps = themeProps.typography || {};
  const colorProps = themeProps.colors || {};
  const rootStyleProps = {
      minH:'100vh', // Ensure takes full viewport height
      w:'100%',
      fontFamily: typographyProps.fontFamily || 'sans-serif', // Sensible default
      fontSize: typographyProps.fontSize || 'md', // Chakra size token
      color: colorProps.text || 'gray.800', // Sensible default
      bg: colorProps.background || 'gray.50', // Sensible default
  };

  return (
    <Box className="app-container" {...rootStyleProps}>
      {getLayoutStructure()}
    </Box>
  );
};


// --- AppConfig Interface (ensure it matches expected structure) ---
interface AppConfig {
  app?: {
    name?: string;
    description?: string;
    theme?: string; // Could be a theme name or identifier
    initialState?: Record<string, any>;
  };
  layout?: {
    type?: string; // e.g., 'singlepage', 'sidebar'
    regions?: string[]; // e.g., ['header', 'main', 'footer', 'sidebar']
  };
  components?: ComponentChild[]; // Array of root-level components
  theme?: {
    colors?: Record<string, string>; // e.g., { primary: '#007bff', background: '#ffffff' }
    typography?: {
        fontFamily?: string;
        fontSize?: string; // e.g., 'md', '16px'
        // other typography settings...
    };
    // other theme settings...
  };
} 