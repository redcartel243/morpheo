"""
Component Registry for Morpheo UI

This module maintains the registry of available components for the Morpheo UI system.
It provides access to component definitions and examples that can be used
for generating UI configurations through AI.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class ComponentRegistry:
    """Registry for UI components that can be used in AI-generated UIs."""
    
    def __init__(self):
        """Initialize the component registry."""
        self.components = {}
        self.app_configs = {}
        self._populate_registry()
    
    def _populate_registry(self):
        """Populate the registry with built-in components."""
        # Register basic components
        self._register_basic_components()
        self._register_advanced_components()
        # We've removed template registration - components are now purely AI-driven
    
    def _register_basic_components(self):
        """Register basic UI components."""
        # Text component
        self.register_component({
            "type": "text",
            "name": "Text",
            "description": "Displays text content in various styles and formats.",
            "examples": [
                {"properties": {"content": "Hello World"}, "styles": {"color": "black"}},
                {"properties": {"content": "Title", "variant": "h1"}, "styles": {"fontSize": "24px", "fontWeight": "bold"}}
            ],
            "properties": {
                "content": {"type": "string", "description": "The text content to display"},
                "variant": {"type": "string", "enum": ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span"], "description": "The HTML element variant to use"}
            }
        })
        
        # Container component
        self.register_component({
            "type": "container",
            "name": "Container",
            "description": "A flexible container that can hold other components.",
            "examples": [
                {"properties": {}, "styles": {"padding": "16px", "backgroundColor": "#f5f5f5", "borderRadius": "8px"}},
                {"properties": {}, "styles": {"display": "flex", "flexDirection": "column", "gap": "8px"}}
            ],
            "properties": {}
        })
        
        # Button component
        self.register_component({
            "type": "button",
            "name": "Button",
            "description": "An interactive button that triggers actions.",
            "examples": [
                {"properties": {"text": "Click Me"}, "styles": {"padding": "8px 16px", "backgroundColor": "#4CAF50", "color": "white", "border": "none", "borderRadius": "4px", "cursor": "pointer"}},
                {"properties": {"text": "Submit"}, "styles": {"padding": "12px 24px", "backgroundColor": "#2196F3", "color": "white", "border": "none", "borderRadius": "4px", "boxShadow": "0 2px 4px rgba(0,0,0,0.2)", "cursor": "pointer"}}
            ],
            "properties": {
                "text": {"type": "string", "description": "The button text"},
                "variant": {"type": "string", "enum": ["primary", "secondary", "text"], "description": "Button style variant"}
            },
            "methods": {
                "onClick": {"description": "Called when the button is clicked"},
                "onMouseEnter": {"description": "Called when mouse enters the button area"},
                "onMouseLeave": {"description": "Called when mouse leaves the button area"}
            }
        })
        
        # Input component
        self.register_component({
            "type": "input",
            "name": "Input",
            "description": "A text input field for user data entry.",
            "examples": [
                {"properties": {"placeholder": "Enter your name", "label": "Name"}, "styles": {"padding": "8px", "border": "1px solid #ddd", "borderRadius": "4px", "width": "100%"}},
                {"properties": {"placeholder": "Email address", "label": "Email", "type": "email"}, "styles": {"padding": "10px", "border": "1px solid #ccc", "borderRadius": "4px", "width": "100%"}}
            ],
            "properties": {
                "placeholder": {"type": "string", "description": "Placeholder text"},
                "label": {"type": "string", "description": "Label for the input"},
                "value": {"type": "string", "description": "Current input value"},
                "type": {"type": "string", "enum": ["text", "password", "email", "number", "tel"], "description": "Input type"}
            },
            "methods": {
                "onChange": {"description": "Called when the input value changes"},
                "onFocus": {"description": "Called when the input receives focus"},
                "onBlur": {"description": "Called when the input loses focus"}
            }
        })
        
        # Text Input component (alias for input, with focus on text input)
        self.register_component({
            "type": "text-input",
            "name": "Text Input",
            "description": "A specialized text input field for text entry.",
            "examples": [
                {"properties": {"placeholder": "Enter your message", "label": "Message"}, "styles": {"padding": "8px", "border": "1px solid #ddd", "borderRadius": "4px", "width": "100%"}},
                {"properties": {"placeholder": "Write a comment", "label": "Comment"}, "styles": {"padding": "10px", "border": "1px solid #ccc", "borderRadius": "4px", "width": "100%"}}
            ],
            "properties": {
                "placeholder": {"type": "string", "description": "Placeholder text"},
                "label": {"type": "string", "description": "Label for the input"},
                "value": {"type": "string", "description": "Current input value"}
            },
            "methods": {
                "onChange": {"description": "Called when the input value changes"},
                "onFocus": {"description": "Called when the input receives focus"},
                "onBlur": {"description": "Called when the input loses focus"}
            }
        })
        
        # Textarea component for multiline text input
        self.register_component({
            "type": "textarea",
            "name": "Textarea",
            "description": "A multiline text input field for longer content.",
            "examples": [
                {"properties": {"placeholder": "Enter your message", "rows": 4}, "styles": {"padding": "8px", "border": "1px solid #ddd", "borderRadius": "4px", "width": "100%", "resize": "vertical"}},
                {"properties": {"placeholder": "Write a description", "rows": 6, "value": "Initial content"}, "styles": {"padding": "10px", "border": "1px solid #ccc", "borderRadius": "4px", "width": "100%", "minHeight": "120px"}}
            ],
            "properties": {
                "placeholder": {"type": "string", "description": "Placeholder text"},
                "label": {"type": "string", "description": "Label for the textarea"},
                "value": {"type": "string", "description": "Current textarea content"},
                "rows": {"type": "number", "description": "Number of visible text rows"},
                "readOnly": {"type": "boolean", "description": "Whether the textarea is read-only"}
            },
            "methods": {
                "onChange": {"description": "Called when the textarea content changes"},
                "onFocus": {"description": "Called when the textarea receives focus"},
                "onBlur": {"description": "Called when the textarea loses focus"}
            }
        })
        
        # Select/Dropdown component
        self.register_component({
            "type": "select",
            "name": "Select",
            "description": "A dropdown selection menu with options.",
            "examples": [
                {
                    "properties": {
                        "label": "Choose an option",
                        "options": [{"value": "option1", "label": "Option 1"}, {"value": "option2", "label": "Option 2"}, {"value": "option3", "label": "Option 3"}],
                        "value": "option1"
                    },
                    "styles": {
                        "width": "100%",
                        "padding": "8px",
                        "border": "1px solid #ddd",
                        "borderRadius": "4px"
                    }
                },
                {
                    "properties": {
                        "label": "Select a country",
                        "options": [{"value": "us", "label": "United States"}, {"value": "uk", "label": "United Kingdom"}, {"value": "ca", "label": "Canada"}],
                        "placeholder": "Select a country"
                    },
                    "styles": {
                        "width": "100%",
                        "padding": "10px",
                        "border": "1px solid #ccc",
                        "borderRadius": "4px",
                        "backgroundColor": "#f9f9f9"
                    }
                }
            ],
            "properties": {
                "label": {"type": "string", "description": "Label for the select component"},
                "options": {"type": "array", "description": "Array of options with value and label properties"},
                "value": {"type": "string", "description": "Currently selected value"},
                "placeholder": {"type": "string", "description": "Placeholder text when no option is selected"},
                "disabled": {"type": "boolean", "description": "Whether the select is disabled"}
            },
            "methods": {
                "onChange": {"description": "Called when the selected option changes"},
                "onFocus": {"description": "Called when the select receives focus"},
                "onBlur": {"description": "Called when the select loses focus"}
            }
        })
        
        # Radio Group component
        self.register_component({
            "type": "radio-group",
            "name": "Radio Group",
            "description": "A group of radio buttons for selecting a single option from multiple choices.",
            "examples": [
                {
                    "properties": {
                        "label": "Select your gender",
                        "options": [{"value": "male", "label": "Male"}, {"value": "female", "label": "Female"}, {"value": "other", "label": "Other"}],
                        "value": "male"
                    },
                    "styles": {
                        "display": "flex",
                        "flexDirection": "column",
                        "gap": "8px"
                    }
                },
                {
                    "properties": {
                        "label": "Payment method",
                        "options": [{"value": "credit", "label": "Credit Card"}, {"value": "debit", "label": "Debit Card"}, {"value": "paypal", "label": "PayPal"}],
                        "value": "credit",
                        "inline": True
                    },
                    "styles": {
                        "display": "flex",
                        "gap": "16px",
                        "alignItems": "center"
                    }
                }
            ],
            "properties": {
                "label": {"type": "string", "description": "Label for the radio group"},
                "options": {"type": "array", "description": "Array of options with value and label properties"},
                "value": {"type": "string", "description": "Currently selected value"},
                "inline": {"type": "boolean", "description": "Whether to display radio buttons inline"},
                "disabled": {"type": "boolean", "description": "Whether the radio group is disabled"}
            },
            "methods": {
                "onChange": {"description": "Called when the selected option changes"}
            }
        })
        
        # Toggle/Switch component
        self.register_component({
            "type": "toggle",
            "name": "Toggle",
            "description": "A toggle switch for binary options.",
            "examples": [
                {
                    "properties": {
                        "label": "Dark Mode",
                        "checked": False
                    },
                    "styles": {
                        "display": "flex",
                        "alignItems": "center",
                        "gap": "8px"
                    }
                },
                {
                    "properties": {
                        "label": "Enable notifications",
                        "checked": True,
                        "labelPosition": "left"
                    },
                    "styles": {
                        "display": "flex",
                        "justifyContent": "space-between",
                        "padding": "8px 0"
                    }
                }
            ],
            "properties": {
                "label": {"type": "string", "description": "Label for the toggle"},
                "checked": {"type": "boolean", "description": "Whether the toggle is checked/active"},
                "labelPosition": {"type": "string", "enum": ["left", "right"], "description": "Position of the label relative to the toggle"},
                "disabled": {"type": "boolean", "description": "Whether the toggle is disabled"}
            },
            "methods": {
                "onChange": {"description": "Called when the toggle state changes"}
            }
        })
        
        # Form component
        self.register_component({
            "type": "form",
            "name": "Form",
            "description": "A container for form elements with validation and submission handling.",
            "examples": [
                {
                    "properties": {
                        "title": "Contact Form"
                    },
                    "styles": {
                        "display": "flex",
                        "flexDirection": "column",
                        "gap": "16px",
                        "padding": "20px",
                        "border": "1px solid #ddd",
                        "borderRadius": "8px"
                    }
                },
                {
                    "properties": {
                        "title": "User Registration",
                        "submitButtonText": "Register"
                    },
                    "styles": {
                        "maxWidth": "500px",
                        "margin": "0 auto",
                        "padding": "24px",
                        "backgroundColor": "#f9f9f9",
                        "borderRadius": "8px",
                        "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"
                    }
                }
            ],
            "properties": {
                "title": {"type": "string", "description": "Title of the form"},
                "submitButtonText": {"type": "string", "description": "Text for the submit button"}
            },
            "methods": {
                "onSubmit": {"description": "Called when the form is submitted"},
                "onValidationError": {"description": "Called when validation fails"}
            }
        })
        
        # Checkbox component
        self.register_component({
            "type": "checkbox",
            "name": "Checkbox",
            "description": "A checkbox for toggling options.",
            "examples": [
                {"properties": {"label": "Agree to terms", "checked": False}, "styles": {}},
                {"properties": {"label": "Remember me", "checked": True}, "styles": {}}
            ],
            "properties": {
                "label": {"type": "string", "description": "Label for the checkbox"},
                "checked": {"type": "boolean", "description": "Whether the checkbox is checked"}
            },
            "methods": {
                "onChange": {"description": "Called when the checkbox state changes"}
            }
        })
        
        # Image component
        self.register_component({
            "type": "image",
            "name": "Image",
            "description": "Displays an image.",
            "examples": [
                {"properties": {"alt": "Sample image"}, "styles": {"width": "100%", "borderRadius": "8px"}},
                {"properties": {"alt": "Profile picture"}, "styles": {"width": "64px", "height": "64px", "borderRadius": "50%", "objectFit": "cover"}}
            ],
            "properties": {
                "src": {"type": "string", "description": "Image source URL"},
                "alt": {"type": "string", "description": "Alternative text for the image"}
            }
        })
    
    def _register_advanced_components(self):
        """Register advanced UI components."""
        # Chart component
        self.register_component({
            "type": "chart",
            "name": "Chart",
            "description": "Displays various types of charts for data visualization.",
            "examples": [
                {"properties": {"type": "bar", "data": [12, 19, 3, 5, 2, 3], "labels": ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"]}, "styles": {"width": "100%", "height": "300px"}},
                {"properties": {"type": "line", "data": [65, 59, 80, 81, 56, 55, 40], "labels": ["January", "February", "March", "April", "May", "June", "July"]}, "styles": {"width": "100%", "height": "300px"}}
            ],
            "properties": {
                "type": {"type": "string", "enum": ["bar", "line", "pie", "doughnut"], "description": "Type of chart to display"},
                "data": {"type": "array", "description": "Array of data points"},
                "labels": {"type": "array", "description": "Labels for data points"},
                "title": {"type": "string", "description": "Chart title"}
            }
        })
        
        # Divider component
        self.register_component({
            "type": "divider",
            "name": "Divider",
            "description": "A horizontal or vertical dividing line to separate content.",
            "examples": [
                {
                    "properties": {
                        "orientation": "horizontal",
                        "withText": False
                    },
                    "styles": {
                        "width": "100%",
                        "height": "1px",
                        "backgroundColor": "#e0e0e0",
                        "margin": "16px 0"
                    }
                },
                {
                    "properties": {
                        "orientation": "horizontal",
                        "withText": True,
                        "text": "OR"
                    },
                    "styles": {
                        "display": "flex",
                        "alignItems": "center",
                        "color": "#6c757d",
                        "margin": "24px 0",
                        "width": "100%"
                    }
                }
            ],
            "properties": {
                "orientation": {"type": "string", "enum": ["horizontal", "vertical"], "description": "Orientation of the divider"},
                "withText": {"type": "boolean", "description": "Whether the divider contains text"},
                "text": {"type": "string", "description": "Text to display within the divider"}
            }
        })
        
        # Modal component
        self.register_component({
            "type": "modal",
            "name": "Modal",
            "description": "A dialog box or popup window that appears over the page content.",
            "examples": [
                {
                    "properties": {
                        "title": "Confirmation",
                        "open": False,
                        "closeOnBackdropClick": True,
                        "showCloseButton": True
                    },
                    "styles": {
                        "backgroundColor": "white",
                        "borderRadius": "8px",
                        "boxShadow": "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
                        "padding": "24px",
                        "maxWidth": "500px",
                        "width": "90%"
                    }
                },
                {
                    "properties": {
                        "title": "Edit Profile",
                        "open": False,
                        "size": "large",
                        "showFooter": True,
                        "cancelButtonText": "Cancel",
                        "confirmButtonText": "Save Changes"
                    },
                    "styles": {
                        "backgroundColor": "white",
                        "borderRadius": "4px",
                        "boxShadow": "0 10px 15px rgba(0, 0, 0, 0.1)",
                        "maxWidth": "800px",
                        "width": "95%"
                    }
                }
            ],
            "properties": {
                "title": {"type": "string", "description": "Title of the modal"},
                "open": {"type": "boolean", "description": "Whether the modal is open"},
                "size": {"type": "string", "enum": ["small", "medium", "large", "fullscreen"], "description": "Size of the modal"},
                "closeOnBackdropClick": {"type": "boolean", "description": "Whether clicking outside the modal closes it"},
                "showCloseButton": {"type": "boolean", "description": "Whether to show a close button in the header"},
                "showFooter": {"type": "boolean", "description": "Whether to show a footer with buttons"},
                "cancelButtonText": {"type": "string", "description": "Text for the cancel button"},
                "confirmButtonText": {"type": "string", "description": "Text for the confirm button"}
            },
            "methods": {
                "onOpen": {"description": "Called when the modal opens"},
                "onClose": {"description": "Called when the modal closes"},
                "onConfirm": {"description": "Called when the confirm button is clicked"}
            }
        })
        
        # Grid component
        self.register_component({
            "type": "grid",
            "name": "Grid",
            "description": "A grid layout container for organizing content in rows and columns.",
            "examples": [
                {
                    "properties": {
                        "columns": 2,
                        "gap": "16px",
                        "columnWidths": ["1fr", "1fr"],
                        "rows": 2,
                        "rowHeights": ["auto", "auto"]
                    },
                    "styles": {
                        "display": "grid",
                        "gridTemplateColumns": "1fr 1fr",
                        "gridTemplateRows": "auto auto",
                        "gap": "16px",
                        "width": "100%",
                        "padding": "16px"
                    }
                },
                {
                    "properties": {
                        "columns": 3,
                        "gap": "8px",
                        "columnWidths": ["1fr", "2fr", "1fr"],
                        "rows": 1
                    },
                    "styles": {
                        "display": "grid",
                        "gridTemplateColumns": "repeat(3, 1fr)",
                        "gap": "8px",
                        "width": "100%",
                        "backgroundColor": "#f5f5f5",
                        "padding": "12px",
                        "borderRadius": "8px"
                    }
                }
            ],
            "properties": {
                "columns": {"type": "number", "description": "Number of columns in the grid"},
                "gap": {"type": "string", "description": "Gap between grid items (CSS value)"},
                "columnWidths": {"type": "array", "description": "Array of column width values (e.g., ['1fr', '2fr', '1fr'])"},
                "rows": {"type": "number", "description": "Number of rows in the grid"},
                "rowHeights": {"type": "array", "description": "Array of row height values (e.g., ['auto', '200px'])"},
                "areas": {"type": "array", "description": "Grid template areas for named grid areas"}
            }
        })
        
        # Card component
        self.register_component({
            "type": "card",
            "name": "Card",
            "description": "A card container for displaying content with a consistent style.",
            "examples": [
                {"properties": {"title": "Card Title"}, "styles": {"padding": "16px", "borderRadius": "8px", "boxShadow": "0 2px 4px rgba(0,0,0,0.1)", "backgroundColor": "white"}},
                {"properties": {"title": "Featured"}, "styles": {"padding": "24px", "borderRadius": "12px", "boxShadow": "0 4px 8px rgba(0,0,0,0.1)", "backgroundColor": "white", "border": "1px solid #eee"}}
            ],
            "properties": {
                "title": {"type": "string", "description": "Card title"},
                "subtitle": {"type": "string", "description": "Card subtitle"}
            }
        })
        
        # Alert component
        self.register_component({
            "type": "alert",
            "name": "Alert",
            "description": "Displays important messages or notifications to the user.",
            "examples": [
                {
                    "properties": {
                        "type": "success",
                        "title": "Success!",
                        "message": "Your changes have been saved successfully.",
                        "dismissible": True
                    },
                    "styles": {
                        "backgroundColor": "#d4edda",
                        "color": "#155724",
                        "padding": "12px 16px",
                        "borderRadius": "4px",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "space-between",
                        "marginBottom": "16px"
                    }
                },
                {
                    "properties": {
                        "type": "error",
                        "message": "An error occurred while processing your request.",
                        "dismissible": False
                    },
                    "styles": {
                        "backgroundColor": "#f8d7da",
                        "color": "#721c24",
                        "padding": "12px 16px",
                        "borderRadius": "4px",
                        "marginBottom": "16px"
                    }
                }
            ],
            "properties": {
                "type": {"type": "string", "enum": ["info", "success", "warning", "error"], "description": "The type of alert"},
                "title": {"type": "string", "description": "Title of the alert"},
                "message": {"type": "string", "description": "Content/message of the alert"},
                "dismissible": {"type": "boolean", "description": "Whether the alert can be dismissed by the user"},
                "icon": {"type": "string", "description": "Optional icon to display with the alert"}
            },
            "methods": {
                "onDismiss": {"description": "Called when the alert is dismissed"}
            }
        })
        
        # Progress component
        self.register_component({
            "type": "progress",
            "name": "Progress",
            "description": "Displays a progress bar or spinner to indicate loading or completion status.",
            "examples": [
                {
                    "properties": {
                        "type": "bar",
                        "value": 75,
                        "max": 100,
                        "showValue": True
                    },
                    "styles": {
                        "height": "8px",
                        "borderRadius": "4px",
                        "backgroundColor": "#e9ecef",
                        "marginBottom": "16px"
                    }
                },
                {
                    "properties": {
                        "type": "spinner",
                        "size": "medium",
                        "label": "Loading..."
                    },
                    "styles": {
                        "color": "#007bff",
                        "margin": "16px 0"
                    }
                }
            ],
            "properties": {
                "type": {"type": "string", "enum": ["bar", "spinner", "circular"], "description": "Type of progress indicator"},
                "value": {"type": "number", "description": "Current progress value"},
                "max": {"type": "number", "description": "Maximum progress value"},
                "showValue": {"type": "boolean", "description": "Whether to display the value as text"},
                "size": {"type": "string", "enum": ["small", "medium", "large"], "description": "Size of the progress indicator"},
                "label": {"type": "string", "description": "Label to display alongside the progress indicator"}
            }
        })
        
        # Date Picker component
        self.register_component({
            "type": "date-picker",
            "name": "Date Picker",
            "description": "A component for selecting dates from a calendar interface.",
            "examples": [
                {
                    "properties": {
                        "label": "Select Date",
                        "value": "",
                        "placeholder": "YYYY-MM-DD",
                        "format": "YYYY-MM-DD"
                    },
                    "styles": {
                        "width": "100%",
                        "padding": "8px",
                        "border": "1px solid #ddd",
                        "borderRadius": "4px"
                    }
                },
                {
                    "properties": {
                        "label": "Appointment Date",
                        "value": "2023-10-25",
                        "format": "YYYY-MM-DD",
                        "minDate": "2023-10-01",
                        "maxDate": "2023-12-31"
                    },
                    "styles": {
                        "width": "100%",
                        "padding": "10px",
                        "border": "1px solid #ccc",
                        "borderRadius": "4px",
                        "backgroundColor": "#f9f9f9"
                    }
                }
            ],
            "properties": {
                "label": {"type": "string", "description": "Label for the date picker"},
                "value": {"type": "string", "description": "Currently selected date"},
                "placeholder": {"type": "string", "description": "Placeholder text when no date is selected"},
                "format": {"type": "string", "description": "Format string for date display"},
                "minDate": {"type": "string", "description": "Minimum selectable date"},
                "maxDate": {"type": "string", "description": "Maximum selectable date"},
                "disabled": {"type": "boolean", "description": "Whether the date picker is disabled"}
            },
            "methods": {
                "onChange": {"description": "Called when the selected date changes"},
                "onFocus": {"description": "Called when the date picker receives focus"},
                "onBlur": {"description": "Called when the date picker loses focus"}
            }
        })
        
        # File Upload component
        self.register_component({
            "type": "file-upload",
            "name": "File Upload",
            "description": "Allows users to upload files from their device.",
            "examples": [
                {
                    "properties": {
                        "label": "Upload File",
                        "accept": "image/*",
                        "multiple": False,
                        "maxSize": 5242880 
                    },
                    "styles": {
                        "width": "100%",
                        "padding": "16px",
                        "border": "2px dashed #ddd",
                        "borderRadius": "4px",
                        "textAlign": "center"
                    }
                },
                {
                    "properties": {
                        "label": "Drop files here",
                        "description": "Supports JPG, PNG, PDF (max 10MB)",
                        "accept": ".jpg,.png,.pdf",
                        "multiple": True,
                        "maxSize": 10485760
                    },
                    "styles": {
                        "width": "100%",
                        "padding": "24px",
                        "border": "2px dashed #007bff",
                        "borderRadius": "8px",
                        "backgroundColor": "#f8f9fa",
                        "textAlign": "center"
                    }
                }
            ],
            "properties": {
                "label": {"type": "string", "description": "Label for the upload area"},
                "description": {"type": "string", "description": "Additional description text"},
                "accept": {"type": "string", "description": "MIME types or file extensions to accept"},
                "multiple": {"type": "boolean", "description": "Whether multiple files can be uploaded"},
                "maxSize": {"type": "number", "description": "Maximum file size in bytes"},
                "disabled": {"type": "boolean", "description": "Whether the upload is disabled"}
            },
            "methods": {
                "onChange": {"description": "Called when files are selected or dropped"},
                "onUpload": {"description": "Called when files are starting to upload"},
                "onSuccess": {"description": "Called when files are successfully uploaded"},
                "onError": {"description": "Called when an error occurs during upload"}
            }
        })
        
        # Tooltip component
        self.register_component({
            "type": "tooltip",
            "name": "Tooltip",
            "description": "Displays additional information when hovering over an element.",
            "examples": [
                {
                    "properties": {
                        "content": "This is a helpful tooltip",
                        "position": "top"
                    },
                    "styles": {
                        "backgroundColor": "#333",
                        "color": "white",
                        "padding": "5px 10px",
                        "borderRadius": "3px",
                        "fontSize": "12px"
                    }
                },
                {
                    "properties": {
                        "content": "Click for more information",
                        "position": "right",
                        "arrow": True
                    },
                    "styles": {
                        "backgroundColor": "#007bff",
                        "color": "white",
                        "padding": "8px 12px",
                        "borderRadius": "4px",
                        "fontSize": "14px",
                        "maxWidth": "200px"
                    }
                }
            ],
            "properties": {
                "content": {"type": "string", "description": "Content to display in the tooltip"},
                "position": {"type": "string", "enum": ["top", "right", "bottom", "left"], "description": "Position of the tooltip relative to its target"},
                "arrow": {"type": "boolean", "description": "Whether to show an arrow pointing to the target"},
                "delay": {"type": "number", "description": "Delay in milliseconds before showing the tooltip"},
                "trigger": {"type": "string", "enum": ["hover", "click", "focus"], "description": "Event that triggers the tooltip"}
            }
        })
        
        # List component
        self.register_component({
            "type": "list",
            "name": "List",
            "description": "Displays a list of items.",
            "examples": [
                {"properties": {"items": ["Item 1", "Item 2", "Item 3"]}, "styles": {"listStyleType": "disc", "paddingLeft": "20px"}},
                {"properties": {"items": ["First", "Second", "Third"], "ordered": True}, "styles": {"paddingLeft": "20px"}}
            ],
            "properties": {
                "items": {"type": "array", "description": "List items"},
                "ordered": {"type": "boolean", "description": "Whether the list is ordered"}
            }
        })
        
        # Tabs component
        self.register_component({
            "type": "tabs",
            "name": "Tabs",
            "description": "Tabbed interface for organizing content.",
            "examples": [
                {"properties": {"tabs": [{"label": "Tab 1", "content": "Content 1"}, {"label": "Tab 2", "content": "Content 2"}]}, "styles": {}},
                {"properties": {"tabs": [{"label": "Info", "content": "Information tab"}, {"label": "Settings", "content": "Settings tab"}], "activeTab": 0}, "styles": {}}
            ],
            "properties": {
                "tabs": {"type": "array", "description": "Array of tab objects with label and content"},
                "activeTab": {"type": "number", "description": "Index of the active tab"}
            },
            "methods": {
                "onTabChange": {"description": "Called when active tab changes"}
            }
        })
    
    def register_component(self, component: Dict[str, Any]) -> None:
        """
        Register a component in the registry.
        
        Args:
            component: Component definition
        """
        component_type = component.get("type")
        if not component_type:
            logger.warning("Attempted to register component without type")
            return
        
        self.components[component_type] = component
        logger.debug(f"Registered component: {component_type}")
    
    def register_app_config(self, app_config: Dict[str, Any]) -> None:
        """
        Register an app configuration in the registry.
        
        Args:
            app_config: App configuration definition
        """
        app_id = app_config.get("id")
        if not app_id:
            logger.warning("Attempted to register app config without id")
            return
        
        self.app_configs[app_id] = app_config
        logger.debug(f"Registered app config: {app_id}")
    
    def get_component(self, component_type: str) -> Optional[Dict[str, Any]]:
        """
        Get a component by type.
        
        Args:
            component_type: Component type
            
        Returns:
            Component definition or None if not found
        """
        return self.components.get(component_type)
    
    def get_app_config(self, app_id: str) -> Optional[Dict[str, Any]]:
        """
        Get an app configuration by id.
        
        Args:
            app_id: App configuration id
            
        Returns:
            App configuration or None if not found
        """
        return self.app_configs.get(app_id)
    
    def get_all_components(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all registered components.
        
        Returns:
            Dictionary of component definitions
        """
        return self.components
    
    def get_all_app_configs(self) -> Dict[str, Any]:
        """
        Get all available app configurations.
        
        Returns:
            Dictionary of app configurations
        """
        return self.app_configs
    
    def get_components_for_selection(self) -> List[Dict[str, Any]]:
        """
        Get components in a format suitable for selection.
        
        Returns:
            List of component definitions
        """
        return list(self.components.values())
    
    def get_app_configs_for_selection(self) -> List[Dict[str, Any]]:
        """
        Get app configurations in a format suitable for selection.
        
        Returns:
            List of app configurations
        """
        return list(self.app_configs.values())

# Create a singleton instance of the component registry
component_registry = ComponentRegistry() 