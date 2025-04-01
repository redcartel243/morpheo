from typing import Dict, Any, List, Tuple
import re
import json

class PromptAnalyzer:
    """
    Advanced prompt analyzer that extracts detailed information from user prompts
    to better understand what kind of UI the user wants.
    """
    
    # App type keywords
    APP_TYPES = {
        "calculator": ["calculator", "compute", "calculation", "math", "arithmetic", "add", "subtract", "multiply", "divide"],
        "todo": ["todo", "task", "list", "checklist", "to-do", "to do", "reminder", "planner", "organizer"],
        "canvas": ["draw", "canvas", "paint", "sketch", "drawing", "whiteboard", "doodle", "art"],
        "chat": ["chat", "message", "conversation", "messaging", "talk", "communicate", "dialogue"],
        "weather": ["weather", "forecast", "temperature", "climate", "meteorology", "precipitation", "humidity"],
        "form": ["form", "input", "survey", "questionnaire", "feedback", "registration", "sign up", "contact"],
        "dashboard": ["dashboard", "stats", "analytics", "metrics", "monitor", "overview", "summary", "visualization"],
        "notes": ["notes", "notepad", "memo", "jot down", "write down", "text editor"],
        "timer": ["timer", "stopwatch", "countdown", "clock", "alarm", "pomodoro"],
        "calendar": ["calendar", "schedule", "appointment", "event", "date", "planner"],
        "quiz": ["quiz", "test", "question", "answer", "assessment", "exam"],
        "game": ["game", "play", "score", "win", "lose", "challenge"]
    }
    
    # Color keywords
    COLOR_KEYWORDS = {
        "red": ["red", "crimson", "scarlet", "ruby", "cherry"],
        "blue": ["blue", "azure", "navy", "cobalt", "sky blue", "teal", "cyan", "turquoise"],
        "green": ["green", "emerald", "lime", "olive", "mint", "forest"],
        "yellow": ["yellow", "gold", "amber", "lemon", "mustard"],
        "orange": ["orange", "tangerine", "peach", "coral", "amber"],
        "purple": ["purple", "violet", "lavender", "magenta", "plum", "indigo"],
        "pink": ["pink", "rose", "fuchsia", "salmon", "blush"],
        "brown": ["brown", "tan", "beige", "chocolate", "coffee", "mocha"],
        "black": ["black", "onyx", "ebony", "charcoal"],
        "white": ["white", "ivory", "cream", "snow"],
        "gray": ["gray", "grey", "silver", "slate", "ash"]
    }
    
    # Theme keywords
    THEME_KEYWORDS = {
        "dark": ["dark", "night", "black", "midnight", "dim", "shadow"],
        "light": ["light", "bright", "white", "day", "clear", "clean"],
        "colorful": ["colorful", "vibrant", "rainbow", "multicolor", "vivid", "bright"],
        "minimal": ["minimal", "simple", "clean", "sleek", "basic", "plain"],
        "modern": ["modern", "contemporary", "sleek", "trendy", "current"],
        "classic": ["classic", "traditional", "vintage", "retro", "old-school"],
        "professional": ["professional", "business", "corporate", "formal", "serious"],
        "playful": ["playful", "fun", "cheerful", "lively", "whimsical", "cute"],
        "elegant": ["elegant", "sophisticated", "luxurious", "premium", "high-end"],
        "natural": ["natural", "organic", "earthy", "eco", "green"]
    }
    
    # Layout keywords
    LAYOUT_KEYWORDS = {
        "grid": ["grid", "tiles", "blocks", "matrix", "cells"],
        "flex": ["flex", "flexible", "responsive", "adaptive", "fluid"],
        "stack": ["stack", "vertical", "horizontal", "column", "row"],
        "compact": ["compact", "dense", "tight", "small", "narrow"],
        "spacious": ["spacious", "wide", "open", "airy", "roomy", "large"],
        "centered": ["centered", "middle", "center", "aligned", "symmetrical"],
        "asymmetric": ["asymmetric", "unbalanced", "dynamic", "irregular"]
    }
    
    # Size keywords
    SIZE_KEYWORDS = {
        "small": ["small", "tiny", "little", "compact", "mini"],
        "medium": ["medium", "regular", "normal", "standard", "default"],
        "large": ["large", "big", "huge", "giant", "massive", "enormous"]
    }
    
    # Feature keywords
    FEATURE_KEYWORDS = {
        "responsive": ["responsive", "mobile", "tablet", "desktop", "screen size", "adapt"],
        "animated": ["animated", "animation", "motion", "transition", "dynamic"],
        "accessible": ["accessible", "a11y", "screen reader", "keyboard", "disability"],
        "multilingual": ["multilingual", "language", "translation", "localization", "i18n"],
        "dark_mode": ["dark mode", "night mode", "light mode", "theme switch", "toggle theme"],
        "search": ["search", "find", "lookup", "query", "filter"],
        "notifications": ["notifications", "alerts", "messages", "updates", "badges"],
        "user_profile": ["profile", "account", "user", "avatar", "personal"],
        "settings": ["settings", "preferences", "options", "configuration", "customize"],
        "help": ["help", "support", "guide", "tutorial", "documentation", "instructions"],
        "share": ["share", "social", "export", "send", "distribute"],
        "print": ["print", "pdf", "document", "paper", "hard copy"],
        "export": ["export", "download", "save", "backup", "extract"],
        "import": ["import", "upload", "load", "input", "bring in"],
        "undo": ["undo", "redo", "revert", "history", "previous"],
        "zoom": ["zoom", "magnify", "scale", "resize", "enlarge"]
    }
    
    def __init__(self):
        """Initialize the prompt analyzer"""
        pass
    
    def analyze_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Analyze a user prompt and extract detailed information about the desired UI
        
        Args:
            prompt: The user's prompt string
            
        Returns:
            A dictionary containing extracted information:
            {
                "app_type": str,
                "theme": str,
                "colors": List[str],
                "primary_color": str,
                "layout": str,
                "size": str,
                "features": List[str],
                "is_dark_mode": bool,
                "complexity": str,
                "style_keywords": List[str],
                "specific_components": List[str],
                "original_prompt": str
            }
        """
        prompt_lower = prompt.lower()
        
        # Extract app type
        app_type = self._extract_app_type(prompt_lower)
        
        # Extract theme preference
        theme, is_dark_mode = self._extract_theme(prompt_lower)
        
        # Extract color information
        colors = self._extract_colors(prompt_lower)
        primary_color = colors[0] if colors else None
        
        # Extract layout preference
        layout = self._extract_layout(prompt_lower)
        
        # Extract size preference
        size = self._extract_size(prompt_lower)
        
        # Extract features
        features = self._extract_features(prompt_lower)
        
        # Extract complexity
        complexity = self._extract_complexity(prompt_lower)
        
        # Extract style keywords
        style_keywords = self._extract_style_keywords(prompt_lower)
        
        # Extract specific components
        specific_components = self._extract_specific_components(prompt_lower)
        
        # Compile results
        result = {
            "app_type": app_type,
            "theme": theme,
            "colors": colors,
            "primary_color": primary_color,
            "layout": layout,
            "size": size,
            "features": features,
            "is_dark_mode": is_dark_mode,
            "complexity": complexity,
            "style_keywords": style_keywords,
            "specific_components": specific_components,
            "original_prompt": prompt
        }
        
        return result
    
    def _extract_app_type(self, prompt_lower: str) -> str:
        """Extract the app type from the prompt"""
        for app_type, keywords in self.APP_TYPES.items():
            if any(keyword in prompt_lower for keyword in keywords):
                return app_type
        return "generic"
    
    def _extract_theme(self, prompt_lower: str) -> Tuple[str, bool]:
        """Extract theme preference and dark mode flag from the prompt"""
        is_dark_mode = any(keyword in prompt_lower for keyword in self.THEME_KEYWORDS["dark"])
        
        for theme, keywords in self.THEME_KEYWORDS.items():
            if any(keyword in prompt_lower for keyword in keywords):
                return theme, is_dark_mode
        
        # Default to light theme if no theme is specified
        return "light", is_dark_mode
    
    def _extract_colors(self, prompt_lower: str) -> List[str]:
        """Extract color preferences from the prompt"""
        colors = []
        for color, keywords in self.COLOR_KEYWORDS.items():
            if any(keyword in prompt_lower for keyword in keywords):
                colors.append(color)
        return colors
    
    def _extract_layout(self, prompt_lower: str) -> str:
        """Extract layout preference from the prompt"""
        for layout, keywords in self.LAYOUT_KEYWORDS.items():
            if any(keyword in prompt_lower for keyword in keywords):
                return layout
        return "responsive"  # Default to responsive layout
    
    def _extract_size(self, prompt_lower: str) -> str:
        """Extract size preference from the prompt"""
        for size, keywords in self.SIZE_KEYWORDS.items():
            if any(keyword in prompt_lower for keyword in keywords):
                return size
        return "medium"  # Default to medium size
    
    def _extract_features(self, prompt_lower: str) -> List[str]:
        """Extract desired features from the prompt"""
        features = []
        for feature, keywords in self.FEATURE_KEYWORDS.items():
            if any(keyword in prompt_lower for keyword in keywords):
                features.append(feature)
        return features
    
    def _extract_complexity(self, prompt_lower: str) -> str:
        """Extract UI complexity preference from the prompt"""
        if any(word in prompt_lower for word in ["simple", "basic", "minimal", "clean"]):
            return "simple"
        elif any(word in prompt_lower for word in ["advanced", "complex", "detailed", "comprehensive"]):
            return "advanced"
        else:
            return "standard"  # Default to standard complexity
    
    def _extract_style_keywords(self, prompt_lower: str) -> List[str]:
        """Extract style-related keywords from the prompt"""
        style_words = [
            "modern", "classic", "elegant", "minimalist", "sleek", "bold", "subtle",
            "professional", "casual", "playful", "serious", "corporate", "creative",
            "futuristic", "retro", "vintage", "flat", "3d", "gradient", "monochrome",
            "rounded", "sharp", "soft", "hard", "glossy", "matte", "transparent"
        ]
        
        return [word for word in style_words if word in prompt_lower]
    
    def _extract_specific_components(self, prompt_lower: str) -> List[str]:
        """Extract specific UI components mentioned in the prompt"""
        component_words = [
            "button", "input", "form", "menu", "navbar", "sidebar", "footer", "header",
            "card", "modal", "dialog", "dropdown", "toggle", "slider", "checkbox",
            "radio", "tab", "accordion", "carousel", "pagination", "tooltip", "badge",
            "alert", "notification", "progress", "spinner", "loader", "icon", "image",
            "video", "audio", "chart", "graph", "table", "list", "grid", "divider"
        ]
        
        return [word for word in component_words if word in prompt_lower]
    
    def generate_style_preferences(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate style preferences based on prompt analysis
        
        Args:
            analysis: The result of analyze_prompt()
            
        Returns:
            A dictionary of style preferences that can be used by the UI generator
        """
        # Generate color palette based on extracted colors and theme
        colors = self._generate_color_palette(analysis)
        
        # Generate typography settings
        typography = self._generate_typography(analysis)
        
        # Generate spacing settings
        spacing = self._generate_spacing(analysis)
        
        # Compile style preferences
        style_preferences = {
            "theme": analysis["theme"],
            "colors": colors,
            "typography": typography,
            "spacing": spacing,
            "layout": analysis["layout"],
            "complexity": analysis["complexity"],
            "size": analysis["size"],
            "features": analysis["features"],
            "is_dark_mode": analysis["is_dark_mode"]
        }
        
        return style_preferences
    
    def _generate_color_palette(self, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate a color palette based on analysis"""
        is_dark_mode = analysis["is_dark_mode"]
        primary_color = analysis["primary_color"]
        
        # Default color palettes
        dark_palette = {
            "primary": "#3b82f6",  # Blue
            "secondary": "#10b981",  # Green
            "accent": "#8b5cf6",  # Purple
            "background": "#1e293b",  # Dark blue-gray
            "surface": "#334155",  # Lighter blue-gray
            "text": "#f8fafc",  # Almost white
            "border": "#475569",  # Medium blue-gray
            "error": "#ef4444",  # Red
            "warning": "#f59e0b",  # Amber
            "success": "#10b981"  # Green
        }
        
        light_palette = {
            "primary": "#3b82f6",  # Blue
            "secondary": "#10b981",  # Green
            "accent": "#8b5cf6",  # Purple
            "background": "#ffffff",  # White
            "surface": "#f8fafc",  # Very light gray
            "text": "#1e293b",  # Dark blue-gray
            "border": "#e2e8f0",  # Light gray
            "error": "#ef4444",  # Red
            "warning": "#f59e0b",  # Amber
            "success": "#10b981"  # Green
        }
        
        # Start with the appropriate base palette
        palette = dark_palette if is_dark_mode else light_palette
        
        # Adjust primary color if specified
        if primary_color:
            color_map = {
                "red": "#ef4444",
                "blue": "#3b82f6",
                "green": "#10b981",
                "yellow": "#f59e0b",
                "orange": "#f97316",
                "purple": "#8b5cf6",
                "pink": "#ec4899",
                "brown": "#92400e",
                "black": "#000000",
                "white": "#ffffff",
                "gray": "#6b7280"
            }
            
            if primary_color in color_map:
                palette["primary"] = color_map[primary_color]
        
        return palette
    
    def _generate_typography(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate typography settings based on analysis"""
        size = analysis["size"]
        complexity = analysis["complexity"]
        
        # Base font sizes
        if size == "small":
            base_size = "14px"
        elif size == "large":
            base_size = "18px"
        else:  # medium
            base_size = "16px"
        
        # Font family based on style
        font_family = "Arial, sans-serif"  # Default
        
        if "modern" in analysis["style_keywords"]:
            font_family = "Inter, system-ui, sans-serif"
        elif "classic" in analysis["style_keywords"]:
            font_family = "Georgia, serif"
        elif "elegant" in analysis["style_keywords"]:
            font_family = "Playfair Display, serif"
        elif "minimalist" in analysis["style_keywords"]:
            font_family = "Roboto, sans-serif"
        
        return {
            "fontFamily": font_family,
            "fontSize": base_size,
            "headingFontFamily": font_family,
            "fontWeight": "normal",
            "lineHeight": "1.5"
        }
    
    def _generate_spacing(self, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate spacing settings based on analysis"""
        size = analysis["size"]
        
        if size == "small":
            return {
                "small": "4px",
                "medium": "8px",
                "large": "16px",
                "xlarge": "24px"
            }
        elif size == "large":
            return {
                "small": "8px",
                "medium": "16px",
                "large": "32px",
                "xlarge": "48px"
            }
        else:  # medium
            return {
                "small": "8px",
                "medium": "16px",
                "large": "24px",
                "xlarge": "32px"
            } 