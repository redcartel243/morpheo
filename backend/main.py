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
import google.generativeai as genai

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
client = OpenAI(api_key=openai_api_key)

# Gemini API configuration
gemini_api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)

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

# Replace the generate_ui_config function with a version that leverages Google's Gemini API
async def generate_ui_config(prompt: str, style_preferences: Optional[Dict[str, Any]] = None):
    """
    Generate UI configuration based on user prompt using either OpenAI's GPT or Google's Gemini
    """
    try:
        # Create a log file
        with open("openai_request_log.txt", "w", encoding="utf-8") as log_file:
            log_file.write(f"Prompt: {prompt}\n")
            log_file.write(f"Style preferences: {json.dumps(style_preferences or {}, indent=2)}\n\n")
        
        # Create the system message (to be used as a prefix in Gemini)
        system_message = """You are an expert UI developer who creates complete, functional UI configurations based on user requests.
Your task is to generate a UI configuration that implements the functionality exactly as described or implied by the user.

The UI configuration should include:
1. Components: All necessary UI components with appropriate properties, styles, and event handlers
2. Layout: The layout structure for organizing components
3. Theme: Visual styling including colors, typography, and spacing
4. Functionality: Application-specific logic and behavior

IMPORTANT: We use an EVENT-SOURCED approach for state management. Instead of individual event handlers for each component, implement a single "stateReducer" function in the eventHandlers object.

The stateReducer function:
1. Takes (state, event) as parameters
2. Identifies components by componentId from event.payload
3. Returns a new state object without modifying the original state
4. Handles all possible events (click, change, etc.) for all components

Components should have empty event objects as actual handling happens in the stateReducer.

External Services Integration:
When the user request implies the need for external data (weather, stocks, maps, news, etc.):
1. Include appropriate API configuration in the stateReducer's initial state
2. Add fetch logic in the stateReducer to handle data loading and refreshing
3. Implement error handling for API failures
4. Add loading states for components that display external data
5. Use mock data for initial rendering before API data is available

Your response must be a complete, valid JSON object with no additional text.
        """
        
        # Keep the user message simple to let the model interpret the full prompt
        user_message = f"""
        I need you to create a complete, functional UI with this exact description: {prompt}
        
        Make this UI fully functional and ready to use. Include all necessary components, styles, and implement the functionality using the event-sourced architecture with a single stateReducer function.
        
        Remember: The goal is to create a UI that looks and works EXACTLY as I've imagined it, with no details overlooked or changed.

        IMPORTANT: Your response MUST be a complete, valid JSON object. Do not include any text before or after the JSON.
        
        CRITICAL: Use the event-sourced architecture with a single stateReducer function that handles all events based on component IDs.

        END OF RESPONSE MARKER: Please include "End of Response" at the end of your JSON response to confirm completion.
        """
        
        print("Calling Gemini API...")
        
        with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
            log_file.write("System message + User message for Gemini:\n")
            log_file.write(system_message + "\n\n" + user_message)
            log_file.write("\n\n")
        
        # Maximum number of retries
        max_retries = 3
        retry_count = 0
        success = False
        ui_config = None
        
        while retry_count < max_retries and not success:
            try:
                # Call Gemini API
                model = genai.GenerativeModel(model_name="gemini-2.0-flash")
                response = model.generate_content(
                    system_message + "\n\n" + user_message,
                )
                
                print(f"Gemini API response received (attempt {retry_count + 1})")
                
                with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                    log_file.write(f"Gemini API response received (attempt {retry_count + 1})\n\n")
                
                # Get the raw response text
                json_str = response.text
                with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                    log_file.write("Response:\n")
                    log_file.write(json_str)
                    log_file.write("\n\n")
                    
                # Check if the end-of-response marker is present
                if "End of Response" not in json_str:
                    print("Warning: End of Response marker not found. Response may be incomplete.")
                    with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                        log_file.write("Warning: End of Response marker not found. Response may be incomplete.\n\n")
                
                try:
                    # First attempt: try parsing exactly as provided
                    ui_config = json.loads(json_str)
                    success = True
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {e}")
                    # Try to repair the JSON if it's malformed
                    repaired_json = attempt_json_repair(json_str)
                    if repaired_json:
                        try:
                            ui_config = json.loads(repaired_json)
                            success = True
                            print("Successfully repaired and parsed JSON")
                        except json.JSONDecodeError:
                            print("Still couldn't parse JSON after repair attempt")
                
                # If still not successful, try to extract partial JSON
                if not success:
                    extracted_json = extract_partial_json(json_str)
                    if extracted_json:
                        try:
                            ui_config = json.loads(extracted_json)
                            success = True
                            print("Successfully extracted and parsed partial JSON")
                        except json.JSONDecodeError:
                            print("Couldn't parse extracted JSON")
                    
                # If we've reached the retry limit and still haven't succeeded, fall back to a basic template
                if not success and retry_count == max_retries - 1:
                    ui_config = create_error_ui(prompt)
                    success = True
                    print("Used fallback error UI template")
                        
                retry_count += 1
                
                # Wait briefly before retrying
                if not success and retry_count < max_retries:
                    await asyncio.sleep(1)  # Short delay between retries
            except Exception as ex:
                print(f"Exception during API call: {ex}")
                retry_count += 1
        
        # If we have a valid UI config, process it
        if success and ui_config:
            print(f"Successfully parsed JSON. Components count: {len(ui_config.get('components', []))}")
            
            # Ensure the UI config has all required fields
            if "components" not in ui_config or not isinstance(ui_config["components"], list):
                ui_config["components"] = []
            
            if "layout" not in ui_config or not isinstance(ui_config["layout"], dict):
                ui_config["layout"] = {"type": "flex", "config": {}}
            
            if "theme" not in ui_config or not isinstance(ui_config["theme"], dict):
                ui_config["theme"] = {"colors": {}, "typography": {}, "spacing": {}}
            
            if "functionality" not in ui_config or not isinstance(ui_config["functionality"], dict):
                ui_config["functionality"] = {"type": "default", "config": {}}
                
            if "eventHandlers" not in ui_config or not isinstance(ui_config["eventHandlers"], dict):
                ui_config["eventHandlers"] = {}
            
            # Add default event handlers if they don't exist
            default_event_handlers = {
                # Generic handlers
                "handleButtonClick": "function(event, state, setState) { console.log('Button clicked', event.target.value); }",
                "handleInputChange": "function(event, state, setState) { setState({ ...state, value: event.target.value }); }",
                "handleCheckboxToggle": "function(event, state, setState) { setState({ ...state, checked: !state.checked }); }",
                "handleSelectChange": "function(event, state, setState) { setState({ ...state, selectedOption: event.target.value }); }",
                "handleTextareaChange": "function(event, state, setState) { setState({ ...state, value: event.target.value }); }",
                "handleFormSubmit": "function(event, state, setState) { event.preventDefault(); console.log('Form submitted with value:', state.value); }",
                "handleNavigation": "function(event, state, setState) { const page = event.target.dataset.page; console.log('Navigating to page:', page); }",
                "handleRadioChange": "function(event, state, setState) { setState({ ...state, selectedValue: event.target.value }); }",
                "handleColorChange": "function(event, state, setState) { setState({ ...state, currentColor: event.target.value }); }",
                "handleRangeChange": "function(event, state, setState) { setState({ ...state, currentSize: parseInt(event.target.value) }); }",
                "handleFileChange": "function(event, state, setState) { const file = event.target.files[0]; console.log('File selected:', file); }",
                "handleOpenModal": "function(event, state, setState) { setState({ ...state, isModalOpen: true }); }",
                "handleCloseModal": "function(event, state, setState) { setState({ ...state, isModalOpen: false }); }"
            }
            
            # Add functionality-specific event handlers based on the functionality type
            functionality_type = ui_config.get("functionality", {}).get("type", "default")
            
            if functionality_type == "calculator":
                default_event_handlers["handleNumberInput"] = """function(event, state, setState) { 
                    const buttonValue = event.target.value || event.target.innerText; 
                    if (buttonValue === 'C') { 
                        setState({ ...state, calculatorValue: '0' }); 
                    } else if (buttonValue === '=') { 
                        try { 
                            // Safely evaluate the expression
                            const expr = state.calculatorValue;
                            // Only allow digits, decimal points, and basic operators
                            if (!/^[0-9+\\-*/.()]+$/.test(expr)) {
                                setState({ ...state, calculatorValue: 'Error' });
                                return;
                            }
                            const result = Function('"use strict"; return (' + expr + ')')();
                            setState({ ...state, calculatorValue: String(result) }); 
                        } catch (e) { 
                            setState({ ...state, calculatorValue: 'Error' }); 
                        } 
                    } else { 
                        const newValue = state.calculatorValue === '0' ? buttonValue : state.calculatorValue + buttonValue; 
                        setState({ ...state, calculatorValue: newValue }); 
                    } 
                }"""
            
            elif functionality_type == "todo":
                default_event_handlers["handleAddTodo"] = """function(event, state, setState) { 
                    if (state.value.trim()) { 
                        const newTodo = { id: Date.now().toString(), text: state.value, completed: false }; 
                        setState({ ...state, todos: [...state.todos, newTodo], value: '' }); 
                    } 
                }"""
                default_event_handlers["handleToggleTodo"] = """function(event, state, setState) { 
                    const todoId = event.target.dataset.id; 
                    const updatedTodos = state.todos.map(todo => 
                        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
                    ); 
                    setState({ ...state, todos: updatedTodos }); 
                }"""
                default_event_handlers["handleDeleteTodo"] = """function(event, state, setState) { 
                    const todoId = event.target.dataset.id; 
                    const filteredTodos = state.todos.filter(todo => todo.id !== todoId); 
                    setState({ ...state, todos: filteredTodos }); 
                }"""
            
            elif functionality_type == "canvas":
                default_event_handlers["handleStartDrawing"] = """function(event, state, setState) { 
                    const canvas = event.target; 
                    const rect = canvas.getBoundingClientRect(); 
                    const x = event.clientX - rect.left; 
                    const y = event.clientY - rect.top; 
                    const ctx = canvas.getContext('2d'); 
                    ctx.beginPath(); 
                    ctx.moveTo(x, y); 
                    setState({ ...state, isDrawing: true }); 
                }"""
                default_event_handlers["handleDraw"] = """function(event, state, setState) { 
                    if (!state.isDrawing) return; 
                    const canvas = event.target; 
                    const ctx = canvas.getContext('2d'); 
                    const rect = canvas.getBoundingClientRect(); 
                    const x = event.clientX - rect.left; 
                    const y = event.clientY - rect.top; 
                    ctx.lineTo(x, y); 
                    ctx.strokeStyle = state.currentColor; 
                    ctx.lineWidth = state.currentSize; 
                    ctx.stroke(); 
                }"""
                default_event_handlers["handleStopDrawing"] = """function(event, state, setState) { 
                    setState({ ...state, isDrawing: false }); 
                }"""
            
            # Add default event handlers to the UI config if they don't exist
            for handler_name, handler_code in default_event_handlers.items():
                if handler_name not in ui_config["eventHandlers"]:
                    ui_config["eventHandlers"][handler_name] = handler_code
            
            # Ensure each component has all required fields
            for component in ui_config["components"]:
                if "id" not in component or not component["id"]:
                    component["id"] = f"component-{uuid.uuid4()}"
                
                if "type" not in component or not component["type"]:
                    component["type"] = "container"
                
                if "props" not in component or not isinstance(component["props"], dict):
                    component["props"] = {}
                
                if "children" not in component or not isinstance(component["children"], list):
                    component["children"] = []
                
                if "styles" not in component or not isinstance(component["styles"], dict):
                    component["styles"] = {}
                
                if "events" not in component or not isinstance(component["events"], dict):
                    component["events"] = {}
                
                # Recursively ensure all children have required fields
                def ensure_children_fields(children):
                    for i in range(len(children)):
                        # Check if the child is a string or other non-dict type
                        if not isinstance(children[i], dict):
                            # Convert string/primitive children to proper component objects
                            children[i] = {
                                "type": "text",
                                "id": f"component-{uuid.uuid4()}",
                                "props": {
                                    "text": str(children[i])
                                },
                                "children": [],
                                "styles": {},
                                "events": {}
                            }
                            continue
                        
                        child = children[i]
                        if "id" not in child or not child["id"]:
                            child["id"] = f"component-{uuid.uuid4()}"
                        
                        if "type" not in child or not child["type"]:
                            child["type"] = "container"
                        
                        if "props" not in child or not isinstance(child["props"], dict):
                            child["props"] = {}
                        
                        if "children" not in child or not isinstance(child["children"], list):
                            child["children"] = []
                        
                        if "styles" not in child or not isinstance(child["styles"], dict):
                            child["styles"] = {}
                        
                        if "events" not in child or not isinstance(child["events"], dict):
                            child["events"] = {}
                        
                        if child["children"]:
                            ensure_children_fields(child["children"])
                
                if component["children"]:
                    ensure_children_fields(component["children"])
            
            # Add basic event handlers for interactive components if missing
            for component in ui_config["components"]:
                add_default_event_handlers(component, ui_config["eventHandlers"])
                
                # Process children recursively
                def process_children_events(children):
                    for child in children:
                        if isinstance(child, dict):
                            add_default_event_handlers(child, ui_config["eventHandlers"])
                            if child.get("children"):
                                process_children_events(child["children"])
                
                if component.get("children"):
                    process_children_events(component["children"])
            
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("Final UI config:\n")
                log_file.write(json.dumps(ui_config, indent=2, ensure_ascii=False))
                log_file.write("\n\n")
            
            # Add a check for the end-of-response marker
            if "End of Response" not in json_str:
                print("Warning: End of Response marker not found. Response may be incomplete.")
                # Optionally, handle this case by retrying or logging the issue
            
            return ui_config
        else:
            # If we couldn't get a valid UI config after all retries
            error_message = "Failed to generate a valid UI configuration after multiple attempts"
            print(error_message)
            
            with open("openai_error_log.txt", "a", encoding="utf-8") as error_file:
                error_file.write(f"{error_message}\n\n")
            
            # Return a default error UI
            return create_error_ui(prompt, error_message)
        
    except Exception as e:
        print(f"Error generating UI config: {str(e)}")
        traceback_str = traceback.format_exc()
        print(traceback_str)
        
        with open("openai_error_log.txt", "w", encoding="utf-8") as error_file:
            error_file.write(f"Error generating UI config: {str(e)}\n\n")
            error_file.write(traceback_str)
        
        # Return a default error UI
        return create_error_ui(prompt, str(e))

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
    """
    Generate UI configuration based on user prompt
    """
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
    """
    Generate UI configuration based on user prompt using the component-based approach 
    """
    try:
        # Generate app configuration using the component service
        app_config = component_service.generate_app_config(request.prompt)
        # Save the configuration
        config_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        ui_config_record = UIConfig(
            id=config_id,
            user_id=current_user.username,
            name=f"UI from {now.strftime('%Y-%m-%d %H:%M')} (Component)",
            description=request.prompt,
            config=app_config,
            created_at=now,
            updated_at=now
        )
        
        ui_configs_db[config_id] = ui_config_record.dict()
        
        return {
            "id": config_id,
            "config": app_config
        }
    except Exception as e:
        print(f"Error generating component-based UI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating component-based UI: {str(e)}"
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

@app.post("/api/generate")
async def generate_app(request: Dict[str, Any] = Body(...)):
    """
    Generate an app configuration based on a user request.
    """
    user_request = request.get("request", "")
    if not user_request:
        raise HTTPException(status_code=400, detail="Request text is required")
    
    # Generate app configuration
    app_config = component_service.generate_app_config(user_request)
    
    # Store the configuration globally
    global current_app_config
    current_app_config = app_config
    
    return app_config

@app.get("/api/app/config")
async def get_app_config():
    """
    Get the current app configuration.
    """
    global current_app_config
    if current_app_config is None:
        raise HTTPException(status_code=404, detail="No app configuration available")
    
    return current_app_config

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