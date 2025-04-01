"""
Tool Registry Module

This module manages the registry of all available tools and modules in the system.
Tools are organized by category and include metadata for selection and integration.
"""

from typing import Dict, List, Any, Optional

# Tool categories
CATEGORIES = {
    "ui": "UI components and elements",
    "functionality": "Functional capabilities and behaviors",
    "styling": "Visual styling and theming",
    "ai": "AI-powered capabilities",
    "data": "Data processing and management",
    "integration": "External service integrations"
}

class ToolRegistry:
    """
    Registry for managing all available tools and modules in the system.
    """
    
    def __init__(self):
        """Initialize the tool registry."""
        self.tools = self._initialize_tools()
    
    def _initialize_tools(self) -> Dict[str, Dict[str, List[str]]]:
        """Initialize the tool registry with available tools."""
        return {
            "ui": {
                "components": [
                    "button", "input", "checkbox", "radio", "select", "textarea",
                    "slider", "toggle", "card", "modal", "drawer", "tabs",
                    "accordion", "tooltip", "popover", "menu", "navbar", "footer",
                    "sidebar", "breadcrumb", "pagination", "progress", "spinner",
                    "avatar", "badge", "tag", "alert", "toast", "dialog"
                ],
                "layouts": [
                    "flex", "grid", "responsive-grid", "masonry", "split",
                    "stack", "sidebar-layout", "dashboard-layout", "card-grid",
                    "hero-section", "feature-section", "footer-section"
                ],
                "animations": [
                    "fade", "slide", "zoom", "flip", "rotate", "bounce",
                    "pulse", "shake", "wobble", "swing", "tada", "jello"
                ]
            },
            "functionality": {
                "dataProcessing": [
                    "filter", "sort", "search", "pagination", "infinite-scroll",
                    "data-binding", "form-validation", "data-transformation"
                ],
                "userInteraction": [
                    "drag-and-drop", "resize", "scroll-effects", "keyboard-shortcuts",
                    "touch-gestures", "clipboard", "undo-redo", "zoom-pan"
                ],
                "stateManagement": [
                    "local-state", "global-state", "persistence", "history",
                    "session-management", "authentication", "authorization"
                ]
            },
            "styling": {
                "themes": [
                    "light", "dark", "colorful", "minimal", "professional",
                    "playful", "elegant", "modern", "retro", "futuristic"
                ],
                "customization": [
                    "color-scheme", "typography", "spacing", "borders",
                    "shadows", "animations", "responsive-design"
                ]
            },
            "ai": {
                "vision": [
                    "face-detection", "object-detection", "image-classification",
                    "pose-estimation", "gesture-recognition", "emotion-detection"
                ],
                "nlp": [
                    "text-analysis", "sentiment-analysis", "entity-recognition",
                    "language-translation", "text-generation", "summarization"
                ],
                "audio": [
                    "speech-recognition", "voice-commands", "audio-analysis",
                    "music-recognition", "sound-classification"
                ]
            },
            "data": {
                "storage": [
                    "local-storage", "session-storage", "indexed-db",
                    "cookies", "cache-storage"
                ],
                "visualization": [
                    "charts", "graphs", "maps", "tables", "timelines",
                    "heatmaps", "treemaps", "network-diagrams"
                ],
                "formats": [
                    "json", "csv", "xml", "yaml", "markdown", "html"
                ]
            },
            "integration": {
                "apis": [
                    "rest-api", "graphql", "websockets", "server-sent-events"
                ],
                "services": [
                    "authentication", "analytics", "payments", "maps",
                    "social-media", "file-storage", "email", "sms"
                ],
                "platforms": [
                    "firebase", "aws", "azure", "google-cloud", "vercel"
                ]
            }
        }
    
    def get_all_tools(self) -> Dict[str, Dict[str, List[str]]]:
        """Get all tools organized by category and subcategory."""
        return self.tools
    
    def get_tools_by_category(self, category: str) -> Dict[str, List[str]]:
        """Get all tools in a specific category."""
        return self.tools.get(category, {})
    
    def get_tools_by_subcategory(self, category: str, subcategory: str) -> List[str]:
        """Get all tools in a specific subcategory."""
        category_tools = self.tools.get(category, {})
        return category_tools.get(subcategory, [])
    
    def get_tools_for_selection(self) -> Dict[str, Dict[str, List[str]]]:
        """
        Get a simplified list of tools for selection by AI.
        This includes all available tools organized by category and subcategory.
        """
        return self.tools
    
    def get_tools_for_template(self, template_category: str) -> Dict[str, List[str]]:
        """
        Get a list of recommended tools for a specific template category.
        This helps guide the AI in selecting appropriate tools for a template.
        """
        recommended_tools = {}
        
        if template_category == "basic":
            recommended_tools = {
                "ui": self.tools["ui"]["components"][:10] + self.tools["ui"]["layouts"][:5],
                "functionality": self.tools["functionality"]["dataProcessing"][:5] + self.tools["functionality"]["userInteraction"][:3],
                "styling": self.tools["styling"]["themes"][:5] + self.tools["styling"]["customization"][:5]
            }
        elif template_category == "interactive":
            recommended_tools = {
                "ui": self.tools["ui"]["components"] + self.tools["ui"]["animations"],
                "functionality": self.tools["functionality"]["userInteraction"] + self.tools["functionality"]["stateManagement"][:5],
                "styling": self.tools["styling"]["themes"] + self.tools["styling"]["customization"]
            }
        elif template_category == "ai_powered":
            recommended_tools = {
                "ui": self.tools["ui"]["components"] + self.tools["ui"]["layouts"][:5],
                "functionality": self.tools["functionality"]["dataProcessing"] + self.tools["functionality"]["stateManagement"],
                "ai": self.tools["ai"]["vision"] + self.tools["ai"]["nlp"] + self.tools["ai"]["audio"],
                "integration": self.tools["integration"]["apis"] + self.tools["integration"]["services"][:5]
            }
        elif template_category == "data_driven":
            recommended_tools = {
                "ui": self.tools["ui"]["components"] + self.tools["ui"]["layouts"],
                "functionality": self.tools["functionality"]["dataProcessing"] + self.tools["functionality"]["stateManagement"],
                "data": self.tools["data"]["storage"] + self.tools["data"]["visualization"] + self.tools["data"]["formats"],
                "integration": self.tools["integration"]["apis"] + self.tools["integration"]["services"][:5]
            }
        
        return recommended_tools

# Create a singleton instance of the tool registry
tool_registry = ToolRegistry() 