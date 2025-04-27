from fastapi import FastAPI, Depends, HTTPException, status, Request, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Tuple
import openai
import os
from dotenv import load_dotenv
import json
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from openai import OpenAI
import copy
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ui_validator import is_ui_config_complete, merge_template_with_ai_config, create_error_ui, attempt_json_repair, extract_partial_json
from prompt_analyzer import PromptAnalyzer
from components.service import component_service
import traceback
import re
import time
import asyncio
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import logging # Import the logging module

# Set up logging (basic configuration)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__) # Get a logger instance for this module

# Import Gemini library using the new SDK pattern
from google import genai 
from google.genai import types as genai_types # Import types as well

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Morpheo - AI-Powered Dynamic UI Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # For development only, warn and use a random key
    print("WARNING: No SECRET_KEY environment variable found. Using a random key for development.")
    print("This is NOT secure for production environments.")
    import secrets
    SECRET_KEY = secrets.token_hex(32)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# OpenAI API configuration
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=openai_api_key)

# NEW Gemini Client Initialization
client = None
genai_types = None
try:
    # Re-import here just to be safe within the try block for initialization
    from google import genai
    from google.genai import types as genai_types_import
    genai_types = genai_types_import # Assign to global scope if import succeeds
    
    if os.getenv("GOOGLE_API_KEY"):
        client = genai.Client() # Uses GOOGLE_API_KEY env var
        # Optional: Test client by listing models
        # list(client.models.list())
        print("NEW google.genai SDK Client initialized successfully.")
    else:
        print("Warning: GOOGLE_API_KEY not found. Gemini client not initialized.")
except ImportError:
    print("Warning: google.genai library not found. Install it with 'pip install google-genai'. Gemini features disabled.")
except Exception as e:
    print(f"Error initializing google.genai Client: {e}")

# Initialize the prompt analyzer
prompt_analyzer = PromptAnalyzer()

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class UIConfig(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: str
    description: Optional[str] = None
    config: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UIRequest(BaseModel):
    prompt: str
    style_preferences: Optional[Dict[str, Any]] = None

class TemplateUIRequest(BaseModel):
    """
    Request model for template-based UI generation
    """
    prompt: str
    style_preferences: Optional[Dict[str, Any]] = None

# Load test credentials from environment variables
test_username = os.getenv("TEST_USERNAME", "testuser")
test_password = os.getenv("TEST_PASSWORD", "defaulttestpass")

# Mock database (replace with actual database in production)
fake_users_db = {
    test_username: {
        "username": test_username,
        "full_name": "Test User",
        "email": f"{test_username}@example.com",
        "hashed_password": pwd_context.hash(test_password),
        "disabled": False,
    }
}

ui_configs_db = {}

# Global variable to store the app configuration
current_app_config = None

# Security functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Refactored generate_ui_config function
async def generate_ui_config(prompt: str, style_preferences: Optional[Dict[str, Any]] = None):
    """Generate UI config using NEW Gemini SDK pattern or fallback."""
    # Load the new prompt template
    try:
        with open("backend/gemini_prompt_template.md", "r", encoding="utf-8") as f:
            prompt_template = f.read()
    except FileNotFoundError:
        print("ERROR: backend/gemini_prompt_template.md not found.", file=sys.stderr)
        # Fallback or raise error - for now, using a basic instruction
        prompt_template = "Generate a React component using Chakra UI for the following request: {user_prompt}"

    # Construct the final prompt for the AI
    # Inject the user's actual prompt into the template
    # NOTE: This is a basic placeholder for injection. A more robust method 
    # might involve finding a specific marker like {{USER_REQUEST}} in the template.
    # For now, we assume the template expects the user prompt to be appended or 
    # described within its structure.
    # Let's structure it assuming the template has an ## Input section
    # A simple approach: append the user request under a clear heading
    final_prompt_for_ai = prompt_template + "\n\n## User Request:\n\n" + prompt

    # Log the final prompt being sent to the AI
    # Consider logging to a file or system for better tracking
    print(f"--- Sending Prompt to AI ---\n{final_prompt_for_ai}\n--------------------------")

    # Create a log file (keeping logging for now)
    with open("openai_request_log.txt", "w", encoding="utf-8") as log_file:
        log_file.write(f"User Prompt: {prompt}\n")
        log_file.write(f"Style preferences: {json.dumps(style_preferences or {}, indent=2)}\n")
        log_file.write(f"\n--- Compiled Prompt for AI ---\n{final_prompt_for_ai}\n")

    # Initialize response variables
    raw_response_content = None
    component_code = None
    error_message = None

    # --- AI CALL (Using Gemini Client - adapt as needed) ---
    if client and genai_types:
        try:
            print("Attempting to generate UI config using Gemini Pro...", file=sys.stderr)
            # Configure Gemini generation
            # IMPORTANT: Ensure Gemini doesn't try to return structured JSON unless specifically asked
            # Adjust temperature, safety settings as needed
            generation_config = genai_types.GenerationConfig(
                temperature=0.7, # Adjust as needed for creativity vs predictability
                # top_p=1,
                # top_k=1,
                # max_output_tokens=8192, # Adjust based on expected component size
            )
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
            ]

            # Create the Gemini request parts
            # No specific system instruction needed if handled in the main prompt text
            parts = [final_prompt_for_ai] 

            # --- IMPORTANT: Use generate_content, NOT generate_response_from_text
            # Ensure the model knows we expect text output
            gemini_model = client.generative_model(
                model_name="gemini-1.5-pro-latest", # Or your preferred model
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            response = await asyncio.to_thread(
                 gemini_model.generate_content,
                 parts,
                 stream=False, # Get the full response at once
                 # request_options={"timeout": 300} # Example timeout
                )
                
            # Check if the response has content and parts
            if response.parts:
                 raw_response_content = response.text # Access text directly
                 print("--- Raw AI Response ---", file=sys.stderr)
                 print(raw_response_content, file=sys.stderr)
                 print("-----------------------")
            else:
                # Handle cases where the response might be blocked or empty
                error_message = "AI response was empty or blocked."
                print(f"Warning: {error_message} Response: {response}", file=sys.stderr)
                # You might want to inspect response.prompt_feedback for block reasons
                if response.prompt_feedback:
                    print(f"Prompt Feedback: {response.prompt_feedback}", file=sys.stderr)
                    error_message += f" Reason: {response.prompt_feedback}"

                else:
                    error_message = "Gemini client not initialized."
                    print(error_message, file=sys.stderr)

        except Exception as e:
            error_message = f"Error calling Gemini API: {e}"
            print(error_message, file=sys.stderr)
            traceback.print_exc()

    

    # --- New Response Handling: Extract React code --- 
    if raw_response_content:
        # Attempt to extract code block
        match = re.search(r"```(?:typescript|javascript|jsx|tsx)?\n(.*?)```", raw_response_content, re.DOTALL | re.IGNORECASE)
        if match:
            component_code = match.group(1).strip()
            print("--- Extracted Component Code ---")
            print(component_code)
            print("----------------------------")
        else:
            # Fallback: Assume the entire response might be code if no block found
            print("Warning: Code block ```...``` not found in AI response. Assuming entire response is code.")
            component_code = raw_response_content.strip()
            # Very basic check if it looks like React code
            if not ("import React" in component_code or "=> {" in component_code or "export const" in component_code):
                 print("Warning: Fallback content doesn't strongly resemble React code.")
                 error_message = "AI did not return a recognizable React code block."
                 component_code = None # Don't return potentially wrong content

    # Handle errors
    if error_message and not component_code:
        print(f"Final error before returning: {error_message}")
        # Decide what to return on error. Maybe raise an exception or return an error structure?
        # For now, returning a simple error dictionary, but endpoints need to handle this.
        # Alternatively, return None or raise HTTPException
        # return {"error": error_message, "details": "Failed to generate UI component code."} 
        # Let's return None for now, the endpoint should handle this
        return None 
    
    # Log the successful component code
    with open("openai_response_debug.txt", "w", encoding="utf-8") as debug_file:
        debug_file.write("--- Prompt Sent ---\n")
        debug_file.write(final_prompt_for_ai + "\n")
        debug_file.write("\n--- Raw Response ---\n")
        debug_file.write(raw_response_content + "\n")
        debug_file.write("\n--- Extracted Component Code ---\n")
        debug_file.write(component_code if component_code else "None")

    # Return the extracted code string
    return component_code

# Helper function to add default event handlers for interactive components
def add_default_event_handlers(component, event_handlers):
    """Add default event handlers to interactive components if missing"""
    if not component or not isinstance(component, dict):
        return
    
    component_type = component.get("type", "").lower()
    
    # Don't add events if they already exist
    if component.get("events") and len(component.get("events")) > 0:
        return
        
    # Add default event handlers based on component type
    if component_type == "button" or component_type.startswith("button"):
        component["events"] = {"onClick": "handleButtonClick"}
        
    elif component_type == "input" or component_type.startswith("input"):
        input_type = component.get("props", {}).get("type", "text").lower()
        
        if input_type == "text" or input_type == "number" or input_type == "email" or input_type == "password":
            component["events"] = {"onChange": "handleInputChange"}
        elif input_type == "checkbox":
            component["events"] = {"onChange": "handleCheckboxToggle"}
        elif input_type == "radio":
            component["events"] = {"onChange": "handleRadioChange"}
        elif input_type == "color":
            component["events"] = {"onChange": "handleColorChange"}
        elif input_type == "range":
            component["events"] = {"onChange": "handleRangeChange"}
        elif input_type == "file":
            component["events"] = {"onChange": "handleFileChange"}
        else:
            component["events"] = {"onChange": "handleInputChange"}
        
    elif component_type == "checkbox" or component_type.startswith("checkbox"):
        component["events"] = {"onChange": "handleCheckboxToggle"}
        
    elif component_type == "select" or component_type.startswith("select"):
        component["events"] = {"onChange": "handleSelectChange"}
        
    elif component_type == "textarea" or component_type.startswith("textarea"):
        component["events"] = {"onChange": "handleTextareaChange"}
        
    elif component_type == "form" or component_type.startswith("form"):
        component["events"] = {"onSubmit": "handleFormSubmit"}
        
    elif component_type == "a" or component_type.startswith("a") or component_type == "link":
        component["events"] = {"onClick": "handleNavigation"}
        
    elif component_type == "canvas" or component_type.startswith("canvas"):
        component["events"] = {
            "onMouseDown": "handleStartDrawing",
            "onMouseMove": "handleDraw",
            "onMouseUp": "handleStopDrawing",
            "onMouseLeave": "handleStopDrawing"
        }
    
    # Special case for calculator buttons
    if component_type == "button" and component.get("props", {}).get("value", "").isdigit():
        component["events"] = {"onClick": "handleNumberInput"}
    elif component_type == "button" and component.get("props", {}).get("value") in ["+", "-", "*", "/", "=", "C"]:
        component["events"] = {"onClick": "handleNumberInput"}
    
    # Special case for todo list buttons
    if component_type == "button" and "add" in str(component.get("props", {}).get("action", "")).lower():
        component["events"] = {"onClick": "handleAddTodo"}
    elif component_type == "button" and "delete" in str(component.get("props", {}).get("action", "")).lower():
        component["events"] = {"onClick": "handleDeleteTodo"}
    elif component_type == "button" and "toggle" in str(component.get("props", {}).get("action", "")).lower():
        component["events"] = {"onClick": "handleToggleTodo"}
    
    # Special case for modal buttons
    if component_type == "button" and "modal" in str(component.get("props", {}).get("action", "")).lower():
        if "open" in str(component.get("props", {}).get("action", "")).lower():
            component["events"] = {"onClick": "handleOpenModal"}
        elif "close" in str(component.get("props", {}).get("action", "")).lower():
            component["events"] = {"onClick": "handleCloseModal"}
    
    # Ensure all event handlers referenced in the component exist in the eventHandlers object
    for event_name, handler_name in component.get("events", {}).items():
        if handler_name not in event_handlers:
            # If the handler doesn't exist, add a default implementation
            event_handlers[handler_name] = f"""function(event, state, setState) {{ 
                console.log('Default handler for {handler_name}', event); 
            }}"""

# Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/generate-ui", response_model=Dict[str, Any])
async def generate_ui(
    request: UIRequest,
    current_user: User = Depends(get_current_active_user)
):
    # This endpoint might be deprecated or should call component_service now, but kept for reference
    print("Received request for /generate-ui endpoint")
    ui_config = await generate_ui_config(request.prompt, request.style_preferences)
    
    # Save the configuration
    config_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    ui_config_record = UIConfig(
        id=config_id,
        user_id=current_user.username,
        name=f"UI from {now.strftime('%Y-%m-%d %H:%M')}",
        description=request.prompt,
        config=ui_config,
        created_at=now,
        updated_at=now
    )
    
    ui_configs_db[config_id] = ui_config_record.dict()
    
    return {
        "id": config_id,
        "config": ui_config
    }

@app.post("/generate-component-ui", response_model=Dict[str, Any])
async def generate_component_ui(
    request: UIRequest,
    current_user: User = Depends(get_current_active_user)
):
    # This correctly calls component_service, which uses the new SDK pattern
    print("Received request for /generate-component-ui endpoint")
    # component_service.generate_app_config now returns the code string or None
    component_code_string = component_service.generate_app_config(request.prompt)
    
    if component_code_string:
        print(f"Successfully generated component code string starting with: {component_code_string[:100]}...")
        # Return the code string in a structure consistent with /api/generate
        return {
            "component_code": component_code_string,
            "error": None
        }
    else:
        # If component_service returned None, raise an error
        print("Error: Failed to generate component code string.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate component code. Check backend logs."
        )

@app.get("/ui-configs", response_model=List[UIConfig])
async def get_ui_configs(current_user: User = Depends(get_current_active_user)):
    """
    Get all UI configurations for the current user
    """
    user_configs = [
        UIConfig(**config) 
        for config in ui_configs_db.values() 
        if config["user_id"] == current_user.username
    ]
    return user_configs

@app.get("/ui-configs/{config_id}", response_model=UIConfig)
async def get_ui_config(
    config_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific UI configuration
    """
    if config_id not in ui_configs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UI configuration not found"
        )
    
    config = ui_configs_db[config_id]
    if config["user_id"] != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this configuration"
        )
    
    return UIConfig(**config)

@app.put("/ui-configs/{config_id}", response_model=UIConfig)
async def update_ui_config(
    config_id: str,
    updated_config: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a specific UI configuration
    """
    if config_id not in ui_configs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UI configuration not found"
        )
    
    config = ui_configs_db[config_id]
    if config["user_id"] != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this configuration"
        )
    
    config["config"] = updated_config
    config["updated_at"] = datetime.utcnow()
    ui_configs_db[config_id] = config
    
    return UIConfig(**config)

@app.delete("/ui-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ui_config(
    config_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a specific UI configuration
    """
    if config_id not in ui_configs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UI configuration not found"
        )
    
    config = ui_configs_db[config_id]
    if config["user_id"] != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this configuration"
        )
    
    del ui_configs_db[config_id]
    return None

# Root endpoint
@app.get("/", response_class=HTMLResponse)
async def root():
    """
    Serve a simple HTML page with a calculator built using direct HTML, CSS and JavaScript.
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simple Calculator</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
            }
            .calculator {
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                padding: 20px;
                width: 300px;
            }
            .display {
                background-color: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 5px;
                margin-bottom: 20px;
                padding: 15px;
                text-align: right;
                font-size: 24px;
                height: 30px;
            }
            .buttons {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
            }
            button {
                padding: 15px;
                border: none;
                border-radius: 5px;
                font-size: 18px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            button:hover {
                opacity: 0.9;
            }
            .number {
                background-color: #e0e0e0;
            }
            .operator {
                background-color: #4CAF50;
                color: white;
            }
            .equals {
                background-color: #2196F3;
                color: white;
                grid-column: span 2;
            }
            .clear {
                background-color: #ff6347;
                color: white;
            }
            .title {
                font-size: 24px;
                margin-bottom: 20px;
                text-align: center;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="title">Simple Calculator</div>
        <div class="calculator">
            <div class="display" id="display">0</div>
            <div class="buttons">
                <button class="clear" onclick="clearDisplay()">C</button>
                <button class="operator" onclick="appendOperator('/')">÷</button>
                <button class="operator" onclick="appendOperator('*')">×</button>
                <button class="operator" onclick="appendOperator('-')">-</button>
                <button class="number" onclick="appendNumber(7)">7</button>
                <button class="number" onclick="appendNumber(8)">8</button>
                <button class="number" onclick="appendNumber(9)">9</button>
                <button class="operator" onclick="appendOperator('+')">+</button>
                <button class="number" onclick="appendNumber(4)">4</button>
                <button class="number" onclick="appendNumber(5)">5</button>
                <button class="number" onclick="appendNumber(6)">6</button>
                <button class="equals" onclick="calculate()">=</button>
                <button class="number" onclick="appendNumber(1)">1</button>
                <button class="number" onclick="appendNumber(2)">2</button>
                <button class="number" onclick="appendNumber(3)">3</button>
                <button class="number" onclick="appendNumber(0)" style="grid-column: span 2;">0</button>
                <button class="number" onclick="appendDecimal()">.</button>
            </div>
        </div>

        <script>
            // Get the display element
            const display = document.getElementById('display');
            
            // Function to append a number to the display
            function appendNumber(number) {
                const currentValue = display.textContent;
                if (currentValue === '0') {
                    display.textContent = number;
                } else {
                    display.textContent += number;
                }
            }
            
            // Function to append an operator to the display
            function appendOperator(operator) {
                const currentValue = display.textContent;
                if (currentValue !== '0') {
                    display.textContent += operator;
                }
            }
            
            // Function to add a decimal point
            function appendDecimal() {
                const currentValue = display.textContent;
                if (!currentValue.includes('.')) {
                    display.textContent += '.';
                }
            }
            
            // Function to clear the display
            function clearDisplay() {
                display.textContent = '0';
            }
            
            // Function to calculate the result
            function calculate() {
                try {
                    // Use Function instead of eval for better safety
                    const result = Function('"use strict"; return (' + display.textContent + ')')();
                    display.textContent = result;
                } catch (error) {
                    display.textContent = 'Error';
                    setTimeout(() => {
                        display.textContent = '0';
                    }, 1000);
                }
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# If there is a frontend-new directory, mount it
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend-new")
if os.path.exists(frontend_dir):
    app.mount("/frontend", StaticFiles(directory=frontend_dir, html=True), name="frontend-static")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 

# Add these utility functions for JSON handling
def validate_ui_config(config: Dict[str, Any]) -> Optional[str]:
    """
    Validate that the UI configuration has the required structure.
    
    Args:
        config: The UI configuration to validate
        
    Returns:
        An error message if validation fails, None otherwise
    """
    if not isinstance(config, dict):
        return "Configuration must be a dictionary"
    
    # Check for required top-level keys
    required_keys = ["app", "layout", "components"]
    missing_keys = [key for key in required_keys if key not in config]
    if missing_keys:
        return f"Missing required keys: {', '.join(missing_keys)}"
    
    # Check components structure
    components = config.get("components", [])
    if not isinstance(components, list):
        return "Components must be a list"
    
    # Validate each component has required fields
    for i, component in enumerate(components):
        if not isinstance(component, dict):
            return f"Component at index {i} must be a dictionary"
        
        # Check for required component fields
        comp_required_keys = ["id", "type"]
        comp_missing_keys = [key for key in comp_required_keys if key not in component]
        if comp_missing_keys:
            return f"Component at index {i} is missing required keys: {', '.join(comp_missing_keys)}"
    
    return None

def fix_json(json_str: str) -> Optional[str]:
    """
    Attempt to fix invalid JSON.
    
    Args:
        json_str: The JSON string to fix
        
    Returns:
        Fixed JSON string if successful, None otherwise
    """
    # Remove any leading/trailing whitespace
    json_str = json_str.strip()
    
    # Extract JSON if it's wrapped in markdown code blocks
    if "```json" in json_str:
        parts = json_str.split("```json")
        if len(parts) > 1:
            code_parts = parts[1].split("```")
            if code_parts:
                json_str = code_parts[0].strip()
    elif "```" in json_str:
        parts = json_str.split("```")
        if len(parts) > 1:
            json_str = parts[1].strip()
    
    # Try to find JSON object start and end
    json_start = json_str.find('{')
    json_end = json_str.rfind('}') + 1
    
    if json_start != -1 and json_end != -1 and json_end > json_start:
        return json_str[json_start:json_end]
    
    return None 

# --- Add Response Model for Generated Code ---
class GeneratedCodeResponse(BaseModel):
    component_code: Optional[str] = None
    error: Optional[str] = None
# --- End Response Model ---

@app.post("/api/generate", response_model=GeneratedCodeResponse) # Updated response model
async def generate_app(request: Dict[str, Any] = Body(...)):
    """
    Generate a React component code string based on a user request.
    Calls the updated component_service and returns the code or an error.
    """
    user_request = request.get("request", "")
    if not user_request:
        # Return error using the response model
        return GeneratedCodeResponse(error="Request text is required") 
    
    # Generate component code string (or None on error)
    # component_service.generate_app_config now returns Optional[str]
    component_code_string = component_service.generate_app_config(user_request)
    
    # Check the result and return appropriate response
    if component_code_string:
        return GeneratedCodeResponse(component_code=component_code_string)
    else:
        # If component_service returned None, it means an error occurred during generation/extraction
        return GeneratedCodeResponse(error="Failed to generate component code. Check backend logs for details.")

@app.get("/api/app/config") # This endpoint likely needs removal or complete rethink
async def get_app_config():
    """
    Get the current app configuration.
    NOTE: This is likely deprecated as we now generate code strings, not configs.
    """
    # global current_app_config
    # if current_app_config is None:
    #     raise HTTPException(status_code=404, detail="No app configuration available")
    # return current_app_config
    # Returning an error or empty state as the concept of a single global config is removed
    raise HTTPException(status_code=404, detail="Endpoint /api/app/config is deprecated. Generate code via /api/generate.")

@app.get("/reset-app")
async def reset_app():
    """
    Reset the app and regenerate it with proper button handlers.
    """
    # Create a basic calculator app with working buttons
    app_config = {
        "app": {
            "name": "Fixed Calculator",
            "description": "A calculator with working buttons",
            "theme": "light"
        },
        "layout": {
            "type": "singlepage",
            "regions": ["header", "main", "footer"]
        },
        "components": [
            {
                "id": "calculator-title",
                "type": "text",
                "region": "header",
                "properties": {
                    "content": "Calculator App"
                },
                "styles": {
                    "fontSize": "24px",
                    "fontWeight": "bold",
                    "textAlign": "center",
                    "padding": "20px",
                    "color": "#333"
                }
            },
            {
                "id": "calculator-container",
                "type": "container",
                "region": "main",
                "styles": {
                    "maxWidth": "300px",
                    "margin": "0 auto",
                    "padding": "15px",
                    "backgroundColor": "#f5f5f5",
                    "borderRadius": "8px",
                    "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"
                },
                "children": [
                    {
                        "id": "display",
                        "type": "text",
                        "properties": {
                            "content": "0"
                        },
                        "styles": {
                            "width": "100%",
                            "padding": "15px",
                            "marginBottom": "15px",
                            "backgroundColor": "#fff",
                            "border": "1px solid #ddd",
                            "borderRadius": "4px",
                            "fontSize": "24px",
                            "textAlign": "right",
                            "fontFamily": "monospace"
                        }
                    },
                    {
                        "id": "keypad",
                        "type": "container",
                        "styles": {
                            "display": "grid",
                            "gridTemplateColumns": "repeat(4, 1fr)",
                            "gap": "10px"
                        },
                        "children": [
                            {
                                "id": "btn-clear",
                                "type": "button",
                                "properties": {
                                    "text": "C"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#ff6347",
                                    "color": "white",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { $m('#display').setText('0'); } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-divide",
                                "type": "button",
                                "properties": {
                                    "text": "÷"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#4CAF50",
                                    "color": "white",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText !== '0') { display.setText(currentText + '/'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-multiply",
                                "type": "button",
                                "properties": {
                                    "text": "×"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#4CAF50",
                                    "color": "white",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText !== '0') { display.setText(currentText + '*'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-subtract",
                                "type": "button",
                                "properties": {
                                    "text": "-"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#4CAF50",
                                    "color": "white",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); display.setText(currentText + '-'); } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-7",
                                "type": "button",
                                "properties": {
                                    "text": "7"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('7'); } else { display.setText(currentText + '7'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-8",
                                "type": "button",
                                "properties": {
                                    "text": "8"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('8'); } else { display.setText(currentText + '8'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-9",
                                "type": "button",
                                "properties": {
                                    "text": "9"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('9'); } else { display.setText(currentText + '9'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-add",
                                "type": "button",
                                "properties": {
                                    "text": "+"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#4CAF50",
                                    "color": "white",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); display.setText(currentText + '+'); } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-4",
                                "type": "button",
                                "properties": {
                                    "text": "4"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('4'); } else { display.setText(currentText + '4'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-5",
                                "type": "button",
                                "properties": {
                                    "text": "5"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('5'); } else { display.setText(currentText + '5'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-6",
                                "type": "button",
                                "properties": {
                                    "text": "6"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('6'); } else { display.setText(currentText + '6'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-equals",
                                "type": "button",
                                "properties": {
                                    "text": "="
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#2196F3",
                                    "color": "white",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer",
                                    "gridRow": "span 2"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const expression = display.getText(); try { const result = Function('\"use strict\"; return (' + expression + ')')(); display.setText(String(result)); } catch(calcError) { display.setText('Error'); setTimeout(() => display.setText('0'), 1000); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-1",
                                "type": "button",
                                "properties": {
                                    "text": "1"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('1'); } else { display.setText(currentText + '1'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-2",
                                "type": "button",
                                "properties": {
                                    "text": "2"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('2'); } else { display.setText(currentText + '2'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-3",
                                "type": "button",
                                "properties": {
                                    "text": "3"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('3'); } else { display.setText(currentText + '3'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-0",
                                "type": "button",
                                "properties": {
                                    "text": "0"
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer",
                                    "gridColumn": "span 2"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (currentText === '0') { display.setText('0'); } else { display.setText(currentText + '0'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            },
                            {
                                "id": "btn-decimal",
                                "type": "button",
                                "properties": {
                                    "text": "."
                                },
                                "styles": {
                                    "padding": "15px",
                                    "backgroundColor": "#e0e0e0",
                                    "border": "none",
                                    "borderRadius": "4px",
                                    "fontSize": "18px",
                                    "cursor": "pointer"
                                },
                                "events": {
                                    "click": {
                                        "code": "function(event, $m) { try { const display = $m('#display'); const currentText = display.getText(); if (!currentText.includes('.')) { display.setText(currentText + '.'); } } catch(error) { console.error('Error:', error); } }",
                                        "affectedComponents": ["display"]
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "id": "footer-text",
                "type": "text",
                "region": "footer",
                "properties": {
                    "content": "© 2023 Calculator App"
                },
                "styles": {
                    "textAlign": "center",
                    "padding": "20px",
                    "color": "#777",
                    "fontSize": "14px"
                }
            }
        ]
    }
    
    # Set as current app config
    global current_app_config
    current_app_config = app_config
    
    return {"status": "success", "message": "App reset with working calculator"} 

# Add the GeminiStructuredRequest model
class GeminiStructuredRequest(BaseModel):
    prompt: str
    schema: Dict[str, Any]

@app.post("/gemini-structured-output", response_model=Dict[str, Any])
async def gemini_structured_output(
    request: GeminiStructuredRequest,
    current_user: User = Depends(get_current_active_user)
):
    if not client or not genai_types:
        raise HTTPException(status_code=503, detail="Gemini client not available")
    try:
        print(f"Gemini structured output request: {request.prompt}")
        print(f"Schema: {json.dumps(request.schema, indent=2)}")
        
        # Use the client with GenerateContentConfig
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=request.schema # Pass schema dict directly (still might have issues?)
        )
        response = client.models.generate_content(
            model="models/gemini-2.0-flash", # Use appropriate model
            contents=request.prompt,
            generation_config=config
        )
        result = json.loads(response.text)
        return {"result": result, "status": "success"}
    except Exception as e:
        # ... (error handling)
        print(f"Error in gemini_structured_output: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class GeminiDataRequest(BaseModel):
    data_description: str
    schema: Dict[str, Any]
    temperature: float = 0.2

@app.post("/gemini-grounded-data", response_model=Dict[str, Any])
async def gemini_grounded_data(
    request: GeminiDataRequest,
    current_user: User = Depends(get_current_active_user)
):
    if not client or not genai_types:
        raise HTTPException(status_code=503, detail="Gemini client not available")
        
    # ... (logic to determine use_search_grounding - this needs client methods)
    # Let's simplify and assume search is available if client exists for now
    use_search_grounding = bool(client)
    
    try:
        if use_search_grounding:
            print("Using Google Search grounding for data retrieval")
            # ... (enhanced_search_prompt setup)
            # Use client.models.generate_content without specific schema config for grounding
            response = client.models.generate_content(
                model="models/gemini-2.0-flash",
                contents=enhanced_search_prompt
                # Grounding might be implicit or need tool config - check SDK docs
            )
            # ... (Parse response text, handle potential errors)
            raw_text = response.text.strip()
            # ... (JSON extraction logic)
            result = json.loads(raw_text)
            # ... (Set grounding_metadata)
        else:
            print("Using standard generation (no grounding)")
            # ... (cleaned_schema setup - maybe remove if problematic)
            config = genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=request.schema # Pass provided schema
            )
            response = client.models.generate_content(
                model="models/gemini-1.5-flash", # Use appropriate model
                contents=enhanced_prompt,
                generation_config=config
            )
            # ... (Parse response text)
            raw_text = response.text.strip()
            result = json.loads(raw_text)
            # ... (Set grounding_metadata)

        return {"result": result, "grounding_metadata": grounding_metadata, "status": "success"}
        
    except Exception as e:
        # ... (error handling)
        print(f"Error in gemini_grounded_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper function to extract grounding metadata from a response
def extract_grounding_metadata(response):
    grounding_metadata = {
        "sources": []
    }
    
    try:
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                sources = []
                
                # Try different API structures to find source information
                # Structure 1: Web search results
                if hasattr(candidate.grounding_metadata, 'web_search_results'):
                    for result in candidate.grounding_metadata.web_search_results:
                        sources.append({
                            'uri': result.uri if hasattr(result, 'uri') else result.url if hasattr(result, 'url') else '',
                            'title': result.title if hasattr(result, 'title') else ''
                        })
                
                # Structure 2: Grounding chunks with web information
                elif hasattr(candidate.grounding_metadata, 'grounding_chunks'):
                    for chunk in candidate.grounding_metadata.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            sources.append({
                                'uri': chunk.web.uri if hasattr(chunk.web, 'uri') else '',
                                'title': chunk.web.title if hasattr(chunk.web, 'title') else ''
                            })
                
                # Structure 3: Search entry point
                elif hasattr(candidate.grounding_metadata, 'search_entry_point'):
                    entry_point = candidate.grounding_metadata.search_entry_point
                    if hasattr(entry_point, 'rendered_content') and entry_point.rendered_content:
                        # Just create a single source entry for the search entry point
                        sources.append({
                            'uri': 'Google Search',
                            'title': 'Search Results'
                        })
                
                if sources:
                    grounding_metadata["sources"] = sources
    except Exception as e:
        print(f"Error extracting grounding metadata: {str(e)}")
    
    # If no sources were found, provide a default source
    if not grounding_metadata["sources"]:
        grounding_metadata["sources"] = [
            {
                'uri': 'https://ai.google.dev/gemini-api',
                'title': 'Generated with Gemini API'
            }
        ]
    
    return grounding_metadata

# Refactored /api/search
@app.post("/api/search")
async def search_endpoint(request_data: dict = Body(...)):
    if not client:
        raise HTTPException(status_code=503, detail="Gemini client not available")
        
    query = request_data.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="No query provided.")
        
    try:
        # component_service is already refactored to use the client
        response_text = component_service.generate_search_response(query)
        return JSONResponse(status_code=200, content={"result": response_text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

# --- Add ManualConfigRequest Model --- 
class ManualConfigRequest(BaseModel):
    config: Dict[str, Any]
# --- End Model --- 

# --- Add New Manual Load Endpoint --- 
@app.post("/load-config-manual", response_model=Dict[str, Any])
async def load_config_manual(
    request: ManualConfigRequest, # Use the new model
    current_user: User = Depends(get_current_active_user) # Authenticate
):
    """
    Load and process a manually provided UI configuration JSON, skipping AI generation.
    """
    print("Received request for /load-config-manual endpoint")
    raw_config = request.config

    if not raw_config or not isinstance(raw_config, dict):
        raise HTTPException(status_code=400, detail="Invalid or empty configuration provided in the request body.")

    try:
        # Use the component_service to process the raw config
        # Provide a placeholder user request string as it's not available here
        processed_config = component_service._process_app_config(raw_config, "Manually loaded configuration")

        # Create a unique ID for this configuration instance
        config_id = str(uuid.uuid4())
        now = datetime.utcnow()

        print(f"Successfully processed manually loaded config with {len(processed_config.get('components', []))} components")

        # Return the processed configuration
        return {
            "id": config_id,
            "config": processed_config
        }

    except Exception as e:
        print(f"Error processing manual config: {e}")
        traceback.print_exc() # Log the full error for debugging
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process the provided configuration: {str(e)}"
        )
# --- End New Endpoint --- 

# NEW: Request model for component modification
class ModifyComponentRequest(BaseModel):
    prompt: str # The modification instruction
    current_code: str # The existing component code string

# NEW Endpoint for Modifying Component UI
@app.post("/api/modify-component", response_model=Dict[str, Any])
async def modify_component_ui(
    request: ModifyComponentRequest,
    current_user: User = Depends(get_current_active_user) # Reuse authentication
):
    print("Received request for /api/modify-component endpoint")
    if not request.prompt or not request.current_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both modification prompt and current code are required."
        )
        
    # Call a *new* method in component_service to handle modification
    # This method needs to be created in service.py
    modified_code_string = component_service.modify_app_config(
        modification_prompt=request.prompt,
        current_code=request.current_code
    )
    
    if modified_code_string:
        print(f"Successfully modified component code string starting with: {modified_code_string[:100]}...")
        return {
            "component_code": modified_code_string,
            "error": None
        }
    else:
        print("Error: Failed to modify component code string.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to modify component code. Check backend logs."
        ) 

# NEW: Model for the full code generation response
class FullCodeResponse(BaseModel):
    component_code: Optional[str] = None
    error: Optional[str] = None

# NEW: Model for the request, only needs prompt
class PromptRequest(BaseModel):
    prompt: str

# NEW: Endpoint for generating full, runnable component code
@app.post("/api/generate-full-component", response_model=FullCodeResponse)
async def generate_full_component(request: PromptRequest):
    """Generates a complete, runnable React component file (.tsx)."""
    logger.info(f"Received request for /api/generate-full-component with prompt: {request.prompt[:100]}...")
    try:
        full_code = component_service.generate_full_component_code(request.prompt)
        if full_code:
            logger.info("Successfully generated full component code for /api/generate-full-component.")
            return FullCodeResponse(component_code=full_code)
        else:
            logger.error("Full code generation failed for /api/generate-full-component.")
            return FullCodeResponse(error="Failed to generate full component code. AI might have encountered an issue.")
    except Exception as e:
        logger.exception(f"Exception in /api/generate-full-component endpoint: {e}")
        return FullCodeResponse(error=f"Server error during full code generation: {e}") 