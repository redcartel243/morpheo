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
    - `propertyName`: (string) Name of the property to set (e.g., `"value"`, `"content"`).
    - `newValue`: (any) The value to set. Can be a literal (string, number, boolean) or a variable name (string starting with `$`, e.g., `"$textFromInput"`) referencing a value stored by `GET_PROPERTY`.
    ```json
    { "type": "SET_PROPERTY", "targetId": "my-label", "propertyName": "content", "newValue": "Updated Text" }
    { "type": "SET_PROPERTY", "targetId": "my-input", "propertyName": "value", "newValue": "$textFromInput" }
    { "type": "SET_PROPERTY", "targetId": "my-input", "propertyName": "value", "newValue": "" } // Clear input
    ```

3.  **`ADD_ITEM`**: Adds an item to a list component's `items` property.
    - `targetId`: (string) ID of the list component.
    - `itemValue`: (any) The value to add. Can be a literal or a variable name (string starting with `$`).
    ```json
    { "type": "ADD_ITEM", "targetId": "my-list", "itemValue": "New List Item" }
    { "type": "ADD_ITEM", "targetId": "my-list", "itemValue": "$textFromInput" }
    ```

4.  **`REMOVE_ITEM`**: Removes an item from a list component (by index or value - specify details if needed).
    - `targetId`: (string) ID of the list component.
    - `itemIndex` or `itemValue`: (number or any) Identifier for the item to remove.
    ```json
    { "type": "REMOVE_ITEM", "targetId": "my-list", "itemIndex": 0 } 
    ```

5.  **`TOGGLE_STYLE`**: Adds/removes a specific style (e.g., for completing a task).
    - `targetId`: (string) ID of the component to style.
    - `styleName`: (string) CSS property name (e.g., `"textDecoration"`).
    - `styleValue`: (string) CSS value (e.g., `"line-through"`).
    ```json
    { "type": "TOGGLE_STYLE", "targetId": "task-item-1", "styleName": "textDecoration", "styleValue": "line-through" }
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

**REMINDER:** You MUST define `methods` using the IR actions above for all interactive components (buttons, inputs needing validation/reaction, list items needing click/delete/toggle actions, etc.) to make the application functional. The AI *must* generate these methods based on the requested functionality.

## RESPONSE FORMAT
Your response MUST be a complete JSON object matching this structure EXACTLY:
```