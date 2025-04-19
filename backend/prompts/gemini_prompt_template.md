# MORPHEO UI CONFIGURATION GENERATOR

## USER REQUEST
{{user_request}}

For visual elements that require images:
- Use appropriate CSS styling (colors, gradients, patterns) for most visual effects
- For themed backgrounds, use colors that evoke the theme
- Only use image URLs if explicitly provided by the user
- Never use placeholder paths like 'path/to/image.jpg' or similar non-existent references
- When no image URL is provided, implement visual elements with CSS or unicode characters where possible

## CORE PRINCIPLES
Morpheo is an AI-driven component system with these fundamental principles:

1. **Zero Application-Specific Logic**: No hardcoded behavior.
2. **Pure AI-Driven Generation**: You determine components and behavior.
3. **Generic Component System**: Use reusable building blocks.

## CAMERA AND MEDIA PROCESSING REQUIREMENTS (Condensed)
- Use `<video>` component (`type: "video"`) for camera input.
- Use `<canvas>` component (`type: "canvas"`) for overlays.
- Ensure proper camera access and cleanup.

## YOUR TASK
Generate a complete JSON configuration for a UI application that satisfies the user's request.

DO NOT use templates or predefined application structures. Instead:
- Analyze the user's needs.
- Select and arrange appropriate components.
- Define component `properties`, `styles`, and **`methods` (using the IR described below)**.
- Ensure components work together to provide the requested functionality.
- **Infer the intended relationship between components** (e.g., an input, button, and list likely work together). **CRITICAL: Functional applications require defining `methods` using the IR for ALL interactive components.** Analyze the request and generate necessary actions (reading inputs, modifying lists/items, changing styles) for buttons, interactive list items, and inputs that drive behavior.

## DEFINING INTERACTIVITY: METHODS & INTERMEDIATE REPRESENTATION (IR)

**IMPORTANT: DO NOT GENERATE JAVASCRIPT STRINGS FOR METHODS.**

Instead, define component logic within the `methods` object using a structured **Intermediate Representation (IR)**. Each method name (e.g., `"click"`, `"change"`) maps to an **array `[]` of action objects** that execute sequentially.

**IR Action Object Structure:**
Each object in the array has a `"type"` field specifying the action, plus parameters.

**Available IR Action Types:**

1.  **`GET_PROPERTY`**: Reads a property from a component.
    - `targetId`: (string) ID of the source component.
    - `propertyName`: (string) Name of the property to read (e.g., `"value"`, `"content"`).
    - `resultVariable`: (string) Name of a temporary variable to store the result (e.g., `"inputValue"`).
    ```json
    { "type": "GET_PROPERTY", "targetId": "my-input", "propertyName": "value", "resultVariable": "textFromInput" }
    ```

2.  **`SET_PROPERTY`**: Writes a value to a component's property.
    - `targetId`: (string) ID of the target component.
    - `propertyName`: (string) Name of the property to set (e.g., `"value"`, `"content"`, `"styles.fontWeight"`). Nested properties like styles are allowed.
    - `newValue`: (any) The value to set. Can be a literal (string, number, boolean), or a variable name (`"$varName"`).
      **IMPORTANT: Do NOT use complex conditional objects here for toggling.** Use the dedicated `TOGGLE_PROPERTY` action instead (see below).
    ```json
    // Examples:
    { "type": "SET_PROPERTY", "targetId": "my-label", "propertyName": "content", "newValue": "Updated Text" }
    { "type": "SET_PROPERTY", "targetId": "my-input", "propertyName": "value", "newValue": "$textFromInput" }
    { "type": "SET_PROPERTY", "targetId": "my-input", "propertyName": "value", "newValue": "" } // Clear input
    ```

3.  **`TOGGLE_PROPERTY`**: **NEW** Toggles a property between two specified values.
    - `targetId`: (string) ID of the component whose property will be toggled.
    - `propertyName`: (string) Name of the property to toggle (e.g., `"styles.fontWeight"`, `"properties.checked"`).
    - `values`: (array) An array containing exactly two possible values to toggle between (e.g., `["normal", "bold"]`, `[true, false]`).
    ```json
    // Example: Toggle font weight between normal and bold
    { "type": "TOGGLE_PROPERTY", "targetId": "my-text", "propertyName": "styles.fontWeight", "values": ["normal", "bold"] }
    // Example: Toggle a boolean property (like a checkbox state visually)
    { "type": "TOGGLE_PROPERTY", "targetId": "status-indicator", "propertyName": "properties.isActive", "values": [true, false] }
    ```

4.  **`ADD_ITEM`**: Adds an item to a list component's `items` property.
    - `targetId`: (string) ID of the list component.
    - `itemValue`: (any) The value to add. Can be a literal or a variable name (string starting with `$`).
    ```json
    { "type": "ADD_ITEM", "targetId": "my-list", "itemValue": "New List Item" }
    { "type": "ADD_ITEM", "targetId": "my-list", "itemValue": "$textFromInput" }
    ```

5.  **`REMOVE_ITEM`**: Removes an item from a list component (by index or value - specify details if needed).
    - `targetId`: (string) ID of the list component.
    - `itemIndex` or `itemValue`: (number or any) Identifier for the item to remove.
    ```json
    { "type": "REMOVE_ITEM", "targetId": "my-list", "itemIndex": 0 } 
    ```

6.  **`LOG_MESSAGE`**: Prints a message to the console (for debugging).
    - `message`: (string) The message to log. Can include variables (`$varName`).
    ```json
    { "type": "LOG_MESSAGE", "message": "Button clicked! Input value: $inputValue" }
    ```

**Example: Illustrating a Common Interaction Pattern**
The following demonstrates how IR actions can connect an input, button, and list. Apply this *pattern* when similar interactions are required by the user request.
For a button `add-button`, an input `item-input`, and a list `item-list`:
```json
"methods": {
  "click": [
    { "type": "GET_PROPERTY", "targetId": "item-input", "propertyName": "value", "resultVariable": "newItemText" },
    { "type": "ADD_ITEM", "targetId": "item-list", "itemValue": "$newItemText" },
    { "type": "SET_PROPERTY", "targetId": "item-input", "propertyName": "value", "newValue": "" }
  ]
}
```

**Example: Toggling a Style using `TOGGLE_PROPERTY`**
This is the **preferred** pattern for toggling a property (like a style or state) between two values.
Component IDs: `toggle-bold-button` (Button), `text-display` (Text)
```json
"methods": {
  "click": [
    // No need to GET the property first, TOGGLE_PROPERTY handles it
    { 
      "type": "LOG_MESSAGE", // Optional: Log before toggle
      "message": "Toggling font weight..." 
    },
    { 
      "type": "TOGGLE_PROPERTY", 
      "targetId": "text-display", 
      "propertyName": "styles.fontWeight", // The property to toggle
      "values": ["normal", "bold"]         // The two values to cycle between
    },
    { 
      "type": "LOG_MESSAGE", // Optional: Log after toggle
      "message": "Font weight toggled." 
    }
    // Optional: Update button text based on the *intended* new state (if predictable)
    // Requires more complex logic, potentially GET after TOGGLE or separate state variable
  ]
}
```

**REMINDER:** You MUST define `methods` using the IR actions above for all interactive components (buttons, inputs needing validation/reaction, list items needing click/delete/toggle actions, etc.) to make the application functional. The AI *must* generate these methods based on the requested functionality. **Use `TOGGLE_PROPERTY` for simple two-state toggles instead of complex conditional logic within `SET_PROPERTY`.**

**IMPORTANT ANTI-PATTERN:** Do not attempt to modify a component's own method definition (e.g., setting `methods.click` to a new IR array) from within the IR sequence for that same method. Use conditional logic *within* the *existing* IR sequence (like the conditional `newValue` object or potentially an `IF` action if more complex logic is needed) to handle state changes and toggling behavior. **Prefer `TOGGLE_PROPERTY` where applicable.**

## RESPONSE FORMAT
Your response MUST be a complete JSON object matching this structure EXACTLY:
```json
{
  "app_name": "App Name Generated From Request",
  "app": {
    "title": "App Name Generated From Request"
  },
  "layout": {
    "type": "flex",
    "direction": "vertical"
  },
  "components": [
    {
      "id": "unique-component-id",
      "type": "component-type", // e.g., container, input, button, list
      "properties": { /* Component-specific properties, e.g., "placeholder", "content", "items" */ },
      "styles": { /* CSS-compatible styles, e.g., "padding", "color" */ },
      "methods": { 
        // CRITICAL: All interactive components MUST have methods defined!
        // For example, buttons should have a "click" method:
        "click": [
          // Array of IR action objects that execute when clicked
          { "type": "GET_PROPERTY", "targetId": "some-input", "propertyName": "value", "resultVariable": "inputValue" },
          // More actions...
        ]
      },
      "events": { /* Optional: maps frontend event names (e.g., "onClick") to method names (e.g., "click") */ },
      "children": [ /* Optional: Nested component objects for containers */ ]
    },
    { /* ... more components ... */ }
  ]
}
```

## IMPLEMENTATION GUIDELINES (Condensed)
- **Component IDs**: Unique, descriptive, kebab-case.
- **Methods**: Use the IR actions defined above. Implement core logic.
- **Styling**: Consistent, accessible, responsive.
- **Data Flow**: Define interactions clearly via IR methods.

**FINAL REQUIREMENT: ALL BUTTONS MUST HAVE A CLICK METHOD DEFINED. Input components should have appropriate methods like "change" when they need to trigger actions.**

**FINAL REMINDER: RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, MARKDOWN, OR TEXT OUTSIDE THE JSON OBJECT.**

FAILURE TO INCLUDE PROPERTIES AND METHODS WILL RESULT IN A NON-FUNCTIONAL UI!

4. **Input components MUST handle their own value changes**:
   - Input fields (`input`, `text-input`, `textarea`) REQUIRE an `onChange` handler in `methods`.
   - This handler must use `GET_EVENT_DATA` (path: `target.value`) and `SET_PROPERTY` to update the input's own `value` property.
   - Example `onChange` IR for an input with id `my-input`:
   ```json
   "onChange": [
     { 
       "type": "GET_EVENT_DATA", 
       "path": "target.value", 
       "assignTo": "currentValue" 
     },
     { 
       "type": "SET_PROPERTY", 
       "targetId": "#my-input", 
       "propertyName": "value", 
       "value": { "type": "VARIABLE", "name": "currentValue" }
     }
   ]
   ```