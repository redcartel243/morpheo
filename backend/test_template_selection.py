import asyncio
import json
from templates.service import template_service

async def test_template_selection(prompt):
    """Test the template selection logic with a given prompt."""
    try:
        template_id, justification = await template_service.select_template(prompt)
        print(f"Selected Template ID: {template_id}")
        print(f"Justification: {justification}")
        return template_id, justification
    except Exception as e:
        print(f"Error: {str(e)}")
        return None, None

async def test_template_customization(template_id, prompt):
    """Test the template customization logic with a given template ID and prompt."""
    try:
        customized_ui = await template_service.customize_template(template_id, prompt)
        print(f"Customized UI: {json.dumps(customized_ui, indent=2)[:200]}...")
        return customized_ui
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

async def main():
    # Test prompts
    prompts = [
        "Design a finance dashboard with charts on the S&P 500",
        "Create a financial dashboard with multiple charts showing S&P 500 stock performance",
        "Build a todo list application for managing daily tasks",
        "Make a calculator for basic arithmetic operations"
    ]
    
    for prompt in prompts:
        print(f"\n\nTesting prompt: {prompt}")
        template_id, justification = await test_template_selection(prompt)
        
        if template_id:
            print("\nTesting customization...")
            await test_template_customization(template_id, prompt)

if __name__ == "__main__":
    asyncio.run(main()) 