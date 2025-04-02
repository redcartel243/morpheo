# OpenAI Response Handler

This module provides robust handling for incomplete or truncated OpenAI API responses, which can occur when generating complex UI applications.

## Overview

The `ResponseHandler` class implements various strategies for handling and repairing incomplete JSON responses, following OpenAI recommendations from https://platform.openai.com/docs/api-reference/responses.

## Key Features

1. **Incomplete JSON Detection**: Identifies when a response appears to be truncated
2. **JSON Repair**: Uses multiple strategies to repair malformed or incomplete JSON
3. **Truncated Function Detection**: Specifically handles truncated JavaScript function code
4. **Fallback Mechanisms**: Provides graceful degradation with helpful error feedback

## Usage

### Basic Usage

```python
from components.response_handler import ResponseHandler

# Initialize the handler
handler = ResponseHandler()

# Process an OpenAI response
response = {
    "choices": [{
        "message": {
            "content": json_content  # This might be incomplete
        }
    }]
}

# Process the response - handles incomplete JSON automatically
processed_response = handler.handle_response(response)
```

### Streaming Responses

```python
# For streaming responses, collect all chunks and pass the list
streaming_chunks = []  # All response chunks from the API

# Process the complete stream
processed_response = handler.handle_response(streaming_chunks, is_streaming=True)
```

## Recovery Strategies

The handler uses several strategies to recover from incomplete responses:

1. **Basic JSON Repair**: Fixes common syntax errors like missing commas and quotes
2. **Structure Balancing**: Adds missing closing braces and brackets
3. **Function Completion**: Detects and repairs truncated JavaScript functions
4. **Partial Extraction**: When only part of the response is valid, it extracts usable sections
5. **Fallback Generation**: When repair fails, it provides a useful error recovery UI

## Error Recovery UI

When the handler cannot repair a response, it generates a standardized error recovery UI with:

- Clear error messaging
- A "Try Again" button
- Proper styling and layout

## Testing

The handler comes with comprehensive tests that can be run using:

```bash
python -m unittest backend/testing/test_response_handler.py
```

## Integration with ComponentService

The handler is integrated with the `ComponentService` to automatically process all OpenAI responses:

```python
# In ComponentService
def _process_openai_response(self, response):
    return self.response_handler.handle_response(response)
```

## Extending the Handler

To add additional repair strategies:

1. Implement a new repair method in `ResponseHandler`
2. Add the method to the repair pipeline in `_parse_and_repair_json` or relevant methods
3. Add tests to verify the new functionality 