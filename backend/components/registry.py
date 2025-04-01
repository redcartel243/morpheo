"""
Component Registry Module

This module manages the registry of all available UI and backend components in the system.
Components are organized by type and can be composed to create complete applications.
"""

import os
import json
from typing import Dict, List, Any, Optional, Union

# Component categories
UI_COMPONENT_TYPES = {
    "basic": "Basic UI elements like buttons, text, etc.",
    "layout": "Layout components for organizing UI structure",
    "input": "Input components for user interaction",
    "display": "Display components for showing data",
    "chart": "Chart components for data visualization"
}

BACKEND_COMPONENT_TYPES = {
    "services": "Service connectors for external APIs",
    "data": "Data processing and state management"
}

class ComponentRegistry:
    """
    Registry for managing all available components in the system.
    """
    
    def __init__(self):
        """Initialize the component registry."""
        self.ui_components = {}
        self.backend_components = {}
        self.app_configs = {}
        self.load_components()
    
    def load_components(self):
        """Load all components from the components directory."""
        components_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Load UI components
        ui_dir = os.path.join(components_dir, "ui")
        for component_type in UI_COMPONENT_TYPES.keys():
            type_dir = os.path.join(ui_dir, component_type)
            
            # Create component type directory if it doesn't exist
            if not os.path.exists(type_dir):
                os.makedirs(type_dir)
                continue
            
            # Initialize component type in components dict
            if component_type not in self.ui_components:
                self.ui_components[component_type] = []
            
            # Load all component files in the directory
            for filename in os.listdir(type_dir):
                if filename.endswith('.json'):
                    component_path = os.path.join(type_dir, filename)
                    try:
                        with open(component_path, 'r') as f:
                            component = json.load(f)
                            # Add the component to the registry
                            self.ui_components[component_type].append(component)
                    except Exception as e:
                        print(f"Error loading UI component {filename}: {str(e)}")
        
        # Load backend components
        backend_dir = os.path.join(components_dir, "backend")
        for component_type in BACKEND_COMPONENT_TYPES.keys():
            type_dir = os.path.join(backend_dir, component_type)
            
            # Create component type directory if it doesn't exist
            if not os.path.exists(type_dir):
                os.makedirs(type_dir)
                continue
            
            # Initialize component type in components dict
            if component_type not in self.backend_components:
                self.backend_components[component_type] = []
            
            # Load all component files in the directory
            for filename in os.listdir(type_dir):
                if filename.endswith('.json'):
                    component_path = os.path.join(type_dir, filename)
                    try:
                        with open(component_path, 'r') as f:
                            component = json.load(f)
                            # Add the component to the registry
                            self.backend_components[component_type].append(component)
                    except Exception as e:
                        print(f"Error loading backend component {filename}: {str(e)}")
        
        # Load app configuration templates
        app_configs_dir = os.path.join(components_dir, "app_configs")
        if not os.path.exists(app_configs_dir):
            os.makedirs(app_configs_dir)
        else:
            for filename in os.listdir(app_configs_dir):
                if filename.endswith('.json'):
                    config_path = os.path.join(app_configs_dir, filename)
                    try:
                        with open(config_path, 'r') as f:
                            config = json.load(f)
                            # Add the config to the registry
                            self.app_configs[config.get('id')] = config
                    except Exception as e:
                        print(f"Error loading app config {filename}: {str(e)}")
    
    def get_all_ui_components(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all UI components organized by type."""
        return self.ui_components
    
    def get_all_backend_components(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all backend components organized by type."""
        return self.backend_components
    
    def get_all_app_configs(self) -> Dict[str, Dict[str, Any]]:
        """Get all app configuration templates."""
        return self.app_configs
    
    def get_ui_components_by_type(self, component_type: str) -> List[Dict[str, Any]]:
        """Get all UI components of a specific type."""
        return self.ui_components.get(component_type, [])
    
    def get_backend_components_by_type(self, component_type: str) -> List[Dict[str, Any]]:
        """Get all backend components of a specific type."""
        return self.backend_components.get(component_type, [])
    
    def get_component_by_id(self, component_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific component by ID."""
        # Check UI components
        for component_type in self.ui_components.values():
            for component in component_type:
                if component.get('id') == component_id:
                    return component
        
        # Check backend components
        for component_type in self.backend_components.values():
            for component in component_type:
                if component.get('id') == component_id:
                    return component
        
        return None
    
    def get_app_config_by_id(self, config_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific app configuration by ID."""
        return self.app_configs.get(config_id)
    
    def get_app_config_by_type(self, app_type: str) -> Optional[Dict[str, Any]]:
        """Get a specific app configuration by type."""
        for config in self.app_configs.values():
            if config.get('type') == app_type:
                return config
        return None
    
    def get_components_for_selection(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get a simplified list of components for selection by AI.
        This includes only the necessary information for component selection.
        """
        components_for_selection = {
            "ui": {},
            "backend": {}
        }
        
        # Process UI components
        for component_type, components in self.ui_components.items():
            components_for_selection["ui"][component_type] = []
            for component in components:
                components_for_selection["ui"][component_type].append({
                    'id': component.get('id'),
                    'name': component.get('name'),
                    'description': component.get('description'),
                    'capabilities': component.get('capabilities', []),
                    'props': component.get('propTypes', {})
                })
        
        # Process backend components
        for component_type, components in self.backend_components.items():
            components_for_selection["backend"][component_type] = []
            for component in components:
                components_for_selection["backend"][component_type].append({
                    'id': component.get('id'),
                    'name': component.get('name'),
                    'description': component.get('description'),
                    'capabilities': component.get('capabilities', []),
                    'config': component.get('configSchema', {})
                })
        
        return components_for_selection
    
    def get_app_configs_for_selection(self) -> List[Dict[str, Any]]:
        """
        Get a simplified list of app configurations for selection by AI.
        """
        configs_for_selection = []
        
        for config in self.app_configs.values():
            configs_for_selection.append({
                'id': config.get('id'),
                'name': config.get('name'),
                'description': config.get('description'),
                'type': config.get('type'),
                'capabilities': config.get('capabilities', [])
            })
        
        return configs_for_selection

# Create a singleton instance of the component registry
component_registry = ComponentRegistry() 