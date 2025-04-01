from templates.registry import template_registry
import json

def main():
    """Test what templates are available in the registry."""
    # Get all templates
    all_templates = template_registry.get_all_templates()
    
    print("Available Templates:")
    for category, templates in all_templates.items():
        print(f"\nCategory: {category}")
        for template in templates:
            print(f"  - ID: {template.get('id')}")
            print(f"    Name: {template.get('name')}")
            print(f"    Description: {template.get('description')}")
            print(f"    Capabilities: {', '.join(template.get('capabilities', []))}")
    
    # Get templates for selection
    templates_for_selection = template_registry.get_templates_for_selection()
    
    print("\n\nTemplates for Selection:")
    for template in templates_for_selection:
        print(f"  - ID: {template.get('id')}")
        print(f"    Name: {template.get('name')}")
        print(f"    Category: {template.get('category')}")
        print(f"    Capabilities: {', '.join(template.get('capabilities', []))}")

if __name__ == "__main__":
    main() 