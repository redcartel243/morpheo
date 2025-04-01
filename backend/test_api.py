import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test user credentials from environment variables
username = os.getenv("TEST_USERNAME", "testuser")
password = os.getenv("TEST_PASSWORD", "defaulttestpass")

# Base URL
base_url = os.getenv("API_URL", "http://localhost:8000")

def test_generate_ui():
    # First, get a token
    print("Getting authentication token...")
    token_response = requests.post(
        f"{base_url}/token",
        data={"username": username, "password": password}
    )
    
    if token_response.status_code != 200:
        print(f"Failed to get token: {token_response.text}")
        return
    
    token_data = token_response.json()
    access_token = token_data["access_token"]
    print(f"Got access token: {access_token[:10]}...")
    
    # Now, generate a UI
    print("\nGenerating UI...")
    headers = {"Authorization": f"Bearer {access_token}"}
    ui_request = {
        "prompt": "Create a dashboard for a fitness tracking app that shows workout statistics, daily activity, and nutrition information. Include charts for progress visualization and a form to log new workouts.",
        "style_preferences": {
            "theme": "dark",
            "layout": "responsive",
            "complexity": "detailed"
        }
    }
    
    ui_response = requests.post(
        f"{base_url}/generate-ui",
        json=ui_request,
        headers=headers
    )
    
    if ui_response.status_code != 200:
        print(f"Failed to generate UI: {ui_response.text}")
        return
    
    ui_data = ui_response.json()
    print("\nUI generation successful!")
    print(f"UI ID: {ui_data.get('id')}")
    
    # Print a summary of the generated UI
    ui_config = ui_data.get("config", {})
    components = ui_config.get("components", [])
    layout = ui_config.get("layout", {})
    theme = ui_config.get("theme", {})
    
    print(f"\nGenerated UI Summary:")
    print(f"- Components: {len(components)}")
    print(f"- Layout type: {layout.get('type')}")
    print(f"- Theme colors: {len(theme.get('colors', {}))}")
    
    # Save the full response to a file for inspection
    with open("ui_response.json", "w") as f:
        json.dump(ui_data, f, indent=2)
    
    print("\nFull response saved to ui_response.json")

if __name__ == "__main__":
    test_generate_ui() 