# --- Add back FastAPI and related imports ---
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query, Body, File, UploadFile, Header, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import List, Dict, Any, Optional, Tuple
# --- End added imports ---

import openai
import os
from dotenv import load_dotenv
import json
import uuid
from passlib.context import CryptContext
from openai import OpenAI
import copy
import sys

# --- Remove path forcing code --- 
# import site
# import platform
# 
# # Construct the expected path to site-packages within the venv
# # Assumes standard venv layout
# venv_path = os.path.dirname(sys.executable) # .../venv/Scripts
# if platform.system() == "Windows":
#     site_packages_path = os.path.join(venv_path, '../', 'Lib', 'site-packages')
# else:
#     # Linux/macOS might be lib/pythonX.Y/site-packages
#     # This might need adjustment based on the exact Linux/macOS structure
#     python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"
#     site_packages_path = os.path.join(venv_path, '../', 'lib', python_version, 'site-packages')
# 
# # Normalize path for comparison
# site_packages_path = os.path.normpath(site_packages_path)
# 
# # Check if it exists and insert it at the beginning if not already there
# if os.path.exists(site_packages_path) and site_packages_path not in [os.path.normpath(p) for p in sys.path]:
#     sys.path.insert(0, site_packages_path)
#     print(f"DEBUG (main.py): Inserted venv site-packages at sys.path[0]: {site_packages_path}")
#     print(f"DEBUG (main.py): Updated sys.path: {sys.path}")
# else:
#     print(f"DEBUG (main.py): Venv site-packages already in sys.path or not found: {site_packages_path}")
# --- End removed path forcing ---

# --- Standard Library Imports (Moved back to top) ---
import traceback 
import re
import time
import asyncio
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import logging
import requests
import shutil
import mimetypes
import base64

# --- Remove previous environment diagnostics ---
# print(f"DEBUG (main.py): Running Python executable: {sys.executable}")
# print(f"DEBUG (main.py): Python Path (sys.path) BEFORE google.genai import: {sys.path}")
# --- End environment diagnostics ---

# Import Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, auth
# --- ADD Firestore Import ---
from google.cloud import firestore
# --- END Firestore Import ---

# --- DEBUG: Print sys.path before google imports ---
import sys
print(f"DEBUG (main.py entry): sys.path = {sys.path}")
# --- END DEBUG ---

# Import Gemini library using the new SDK pattern
# --- Use direct top-level imports --- 
from google import genai
from google.genai.types import Part, Blob, GenerationConfig
# from google.generativeai import GenerativeModel # REMOVED - Not used directly here
from google.ai import generativelanguage as glm
# --- End direct imports ---

# --- Configure GenAI globally here ---
try:
    if genai:
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            print("DEBUG (main.py): google.genai configured successfully.")
        else:
            print("Warning (main.py): GOOGLE_API_KEY not set, google.genai configuration skipped.")
    else:
        print("DEBUG (main.py): google.genai module not imported, configuration skipped.")
except Exception as config_e:
    print(f"ERROR (main.py): Failed to configure google.genai: {config_e}")
# --- End GenAI Configuration ---

# --- Component Service Class Import AFTER Google Imports ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from components.service import ComponentService # Import the CLASS

# --- Simple Instantiation ---
component_service_instance = ComponentService()

# Set up logging (basic configuration)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__) # Get a logger instance for this module

# Load environment variables
load_dotenv()

# --- Firebase Admin SDK Initialization ---
# Only use GOOGLE_APPLICATION_CREDENTIALS_JSON for credentials
try:
    firebase_creds_json_str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    cred = None

    if firebase_creds_json_str:
        logger.info("Found GOOGLE_APPLICATION_CREDENTIALS_JSON. Initializing Firebase from JSON string.")
        try:
            firebase_creds_dict = json.loads(firebase_creds_json_str)
            cred = credentials.Certificate(firebase_creds_dict)
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: {json_err}", exc_info=True)
            raise Exception(f"Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON: {json_err}")
        except Exception as cert_err:
            logger.error(f"Failed to create certificate from JSON credentials: {cert_err}", exc_info=True)
            raise Exception(f"Could not create Firebase credentials from JSON: {cert_err}")
    else:
        error_message = "GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set. Firebase Admin SDK cannot be initialized."
        logger.error(error_message)
        raise FileNotFoundError(error_message)

    if not firebase_admin._apps: # Check if already initialized
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully.")
    else:
        logger.info("Firebase Admin SDK already initialized.")

except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin SDK: {e}", exc_info=True)
    raise # Re-raise the exception to make it clear initialization failed
# --- End Firebase Admin SDK Initialization ---

# --- Initialize Firestore Client ---
# Needs GOOGLE_APPLICATION_CREDENTIALS to be set
db = None
try:
    db = firestore.Client()
    logger.info("Firestore client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Firestore client: {e}", exc_info=True)
    # App might still run but saving/loading will fail
# --- End Firestore Client Initialization ---

# --- Add aiofiles, os, base64, tempfile if not already comprehensively imported at top ---
import os # Often already there
import base64 # Often already there
import tempfile # For TemporaryDirectory
import uuid # For unique IDs if needed beyond Gemini's
# Ensure aiofiles is imported if not already:
# import aiofiles # This might be better placed with other async libraries or system libs

# Initialize FastAPI app
app = FastAPI(title="Morpheo - AI-Powered Dynamic UI Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://morpheo.vercel.app"],  # Explicitly allow your frontend origin
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
    uid: Optional[str] = None

class UserInDB(User):
    hashed_password: Optional[str] = None

class PromptRequest(BaseModel):
    prompt: str

class ModifyCodeRequest(BaseModel):
    modification_prompt: str
    current_html: str

# --- NEW Model for Image Generation ---
class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1)

# --- NEW Models for Saving/Loading Generations ---
class SaveGenerationRequest(BaseModel):
    prompt: str
    htmlContent: str
    name: Optional[str] = None # Optional name from user

class GenerationInfo(BaseModel): # For listing generations
    id: str
    name: str
    prompt_preview: str # Just the first few characters
    createdAt: datetime

class GenerationDetail(GenerationInfo): # For fetching a single generation
    prompt: str
    htmlContent: str

# --- Models for Suggest Modifications --- 
class SuggestModificationsRequest(BaseModel):
    current_html: str = Field(..., min_length=10) # Require some HTML

class SuggestModificationsResponse(BaseModel):
    suggestions: List[str]
# --- End Suggest Modifications Models --- 

# Configuration constants for file handling (can be defined at the top or in a config module)
MAX_FILE_SIZE_FOR_DATA_URL = 2 * 1024 * 1024  # 2MB for data URL embedding
MAX_FILE_SIZE_FOR_TEXT_CONTENT = 100 * 1024 # 100KB for direct text content inclusion

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

# Security functions
# Remove verify_password and get_password_hash if /token endpoint is removed
# def verify_password(plain_password, hashed_password):
#     return pwd_context.verify(plain_password, hashed_password)
# 
# def get_password_hash(password):
#     return pwd_context.hash(password)

# Adapt get_user to potentially fetch from Firebase or a local cache/DB
def get_user(uid: str):
    try:
        firebase_user = auth.get_user(uid)
        user_data = {
            "uid": firebase_user.uid,
            "email": firebase_user.email,
            "full_name": firebase_user.display_name,
            "disabled": firebase_user.disabled,
            "username": firebase_user.email or firebase_user.uid
        }
        return UserInDB(**user_data)
    except auth.UserNotFoundError:
        logger.warning(f"User with UID {uid} not found in Firebase.")
        return None
    except Exception as e:
        logger.error(f"Error fetching user {uid} from Firebase: {e}")
        return None

# Remove authenticate_user as it relies on username/password and the fake_db
# def authenticate_user(fake_db, username: str, password: str):
#     user = get_user(username) # This would fail as get_user now expects UID
#     if not user:
#         return None
#     # Need to decide how password verification works if keeping this flow
#     # if not verify_password(password, user.hashed_password):
#     #     return None
#     # return user 
#     return None # Mark as removed/non-functional

# Remove create_access_token if /token endpoint is removed
# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    # ... (implementation)

# --- CORRECTED: get_current_user using Firebase Admin SDK --- 
async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if authorization is None:
        logger.warning("Missing Authorization header")
        raise credentials_exception

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            logger.warning(f"Invalid authorization scheme: {scheme}")
            raise credentials_exception
        
        logger.info(f"Attempting to verify Firebase ID token...")
        # Ensure firebase_admin is initialized and auth is available
        if not firebase_admin._apps:
             logger.error("Firebase Admin SDK not initialized. Cannot verify token.")
             raise credentials_exception # Or a more specific 500 error
             
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        logger.info(f"Firebase token verified successfully for UID: {uid}")

    except ValueError:
        logger.warning("Malformed Authorization header")
        raise credentials_exception
    except auth.InvalidIdTokenError as e:
        logger.error(f"Invalid Firebase ID Token: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Error verifying Firebase ID token: {e}", exc_info=True)
        raise credentials_exception

    if uid is None:
        logger.error("UID not found in decoded Firebase token")
        raise credentials_exception

    # Assuming get_user function fetches user details based on UID
    user = get_user(uid)
    if user is None:
        logger.error(f"User corresponding to UID {uid} not found.")
        # If user not found in our DB/cache even after valid token, 
        # maybe create a user record here or handle appropriately.
        # For now, treat as unauthorized access to the application layer.
        raise credentials_exception

    if user.disabled:
        logger.warning(f"User {uid} is disabled.")
        raise HTTPException(status_code=400, detail="Inactive user")

    logger.info(f"Authenticated user: {user.email or user.uid}")
    return user

# Routes
# REMOVE /token endpoint entirely as auth is handled by Firebase
# @app.post("/token", response_model=Token)
# async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
#     user = authenticate_user(fake_users_db, form_data.username, form_data.password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": user.username}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

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

# --- Comment out the frontend static file mounting --- 
# # If there is a frontend-new directory, mount it
# frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend-new")
# if os.path.exists(frontend_dir):
#     app.mount("/frontend", StaticFiles(directory=frontend_dir, html=True), name="frontend-static")
# --- End Comment out ---

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 

@app.post("/api/generate-full-code")
async def generate_full_code_endpoint(request: PromptRequest, current_user: User = Depends(get_current_user)):
    """Generates the full, self-contained HTML file using Web Components via streaming."""
    logger.info(f"Received STREAMING request for /api/generate-full-code from user: {current_user.username}")
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    try:
        # --- Check for grounding keywords --- 
        grounding_keywords = ["search", "current", "latest", "news", "real-time", "live data", "stock price", "weather"]
        enable_grounding = any(keyword in request.prompt.lower() for keyword in grounding_keywords)
        if enable_grounding:
            logger.info("Grounding keyword detected in generation request. Enabling grounding.")
        else:
             logger.info("No grounding keyword detected in generation request.")

        # Get the async generator from the service, passing the flag
        content_stream = component_service_instance.generate_full_component_code(
            request.prompt,
            enable_grounding=enable_grounding # Pass the flag
        )
        # Return a StreamingResponse
        return StreamingResponse(content_stream, media_type="text/event-stream")

    except Exception as e:
        # Handle exceptions during the setup before streaming starts
        logger.exception(f"An unexpected error occurred setting up streaming generation: {e}")
        # Return an error response immediately if setup fails
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error during stream setup: {str(e)}"}
        )

@app.post("/api/modify-full-code")
async def modify_full_code_endpoint(request: ModifyCodeRequest, current_user: User = Depends(get_current_user)):
    """Modifies an existing HTML file string based on user instructions via streaming."""
    logger.info(f"Received STREAMING request for /api/modify-full-code from user: {current_user.username}")
    if not request.modification_prompt:
        raise HTTPException(status_code=400, detail="Modification prompt cannot be empty.")
    if not request.current_html:
        raise HTTPException(status_code=400, detail="Current HTML code cannot be empty.")

    try:
        # --- Check for grounding keywords --- 
        grounding_keywords = ["search", "current", "latest", "news", "real-time", "live data", "stock price", "weather"]
        # Check in the modification request itself
        enable_grounding = any(keyword in request.modification_prompt.lower() for keyword in grounding_keywords)
        if enable_grounding:
            logger.info("Grounding keyword detected in modification request. Enabling grounding.")
        else:
             logger.info("No grounding keyword detected in modification request.")

        # Get the async generator from the service, passing the flag
        content_stream = component_service_instance.modify_full_component_code(
            modification_request=request.modification_prompt,
            current_html=request.current_html,
            enable_grounding=enable_grounding # Pass the flag
        )
        # Return a StreamingResponse
        return StreamingResponse(content_stream, media_type="text/event-stream")

    except Exception as e:
        logger.exception(f"An unexpected error occurred setting up streaming modification: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error during stream setup: {str(e)}"}
        )

# --- NEW Chat Models ---
class ChatMessage(BaseModel):
    role: str # Typically "user" or "model"
    parts: List[Dict[str, str]] # Gemini format: [{"text": "message content"}]

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[ChatMessage]] = None # Optional history

# --- NEW Chat Endpoint ---
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    """Handles multi-turn chat requests using Gemini."""
    logger.info(f"Received request for /api/chat from user: {current_user.username}")

    # 1. Construct the conversation history in the format Gemini expects
    gemini_history = []
    if request.history:
        # Validate history structure (simple check)
        for msg in request.history:
            if msg.role not in ["user", "model"] or not isinstance(msg.parts, list) or not all("text" in part for part in msg.parts):
                 logger.error(f"Invalid chat history format received: {msg}")
                 raise HTTPException(status_code=400, detail="Invalid chat history format.")
            gemini_history.append(msg.dict()) # Convert Pydantic model to dict

    # Add the new user message
    gemini_history.append({"role": "user", "parts": [{"text": request.message}]})

    full_response = ""
    error_message = None

    try:
        # 3. Call Gemini via the component service's retry wrapper
        logger.info(f"Calling component_service for chat with structured history (length: {len(gemini_history)}) and GROUNDING ENABLED")
        async for chunk in component_service_instance._call_gemini_with_retry(gemini_history, enable_grounding=True):
            if "<!-- ERROR:" in chunk:
                logger.error(f"Gemini wrapper signaled error during chat: {chunk}")
                error_match = re.search(r"<!-- ERROR: (.*) -->", chunk)
                error_message = error_match.group(1) if error_match else "Failed to get chat response due to API error."
                break
            full_response += chunk

        if error_message:
            raise HTTPException(status_code=500, detail=error_message)

        if not full_response.strip():
            logger.warning("Gemini returned an empty chat response.")
            # Return an empty response instead of erroring for chat
            return {"response": ""}

        # 4. Return the successful response
        logger.info(f"Successfully generated chat response (length: {len(full_response)}).")
        # The frontend will need to add this response to the history with role 'model'
        return {"response": full_response.strip()}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"An unexpected error occurred during chat processing: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during chat: {str(e)}")
# --- End NEW Chat Endpoint ---

# --- NEW JSON Request Models for Media Analysis ---
class ImageAnalysisJSONRequest(BaseModel):
    prompt: Optional[str] = None # Make prompt optional, default to None
    fileDataUrl: str = Field(..., min_length=10) # Basic length check

class VideoAnalysisJSONRequest(BaseModel):
    prompt: Optional[str] = None # Make prompt optional
    fileDataUrl: str = Field(..., min_length=10)

class AudioAnalysisJSONRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    fileDataUrl: str = Field(..., min_length=10)
# --- End NEW JSON Request Models ---

# --- Re-added Image Tool Endpoint ---
@app.post("/api/image-tool")
async def image_tool_endpoint(
    request: ImageAnalysisJSONRequest, # Reuse model from before
    current_user: User = Depends(get_current_user)
):
    """Handles image analysis requests from generated applications."""
    # Use provided prompt or a default if none/empty
    effective_prompt = request.prompt if request.prompt else "Describe this image."
    logger.info(f"Received JSON request for /api/image-tool from user: {current_user.username}, prompt: '{effective_prompt[:50]}...'")

    # 1. Parse Data URL (Copied from previous implementation)
    try:
        header, encoded_data = request.fileDataUrl.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        image_data = base64.b64decode(encoded_data)
        logger.info(f"Decoded image data: {len(image_data)} bytes, mime_type: {mime_type}")
    except (ValueError, IndexError, base64.binascii.Error) as e:
        logger.error(f"Invalid fileDataUrl format received: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid fileDataUrl format: {e}")

    # 2. Validate file type (Copied from previous implementation)
    allowed_mime_types = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
    if mime_type not in allowed_mime_types:
        logger.warning(f"User {current_user.username} provided invalid data URL type: {mime_type}")
        raise HTTPException(status_code=400, detail=f"Invalid file type from data URL: {mime_type}. Allowed types: {', '.join(allowed_mime_types)}")

    full_response = ""
    error_message = None

    try:
        # 3. Construct contents for ComponentService (multimodal analysis)
        gemini_contents = [
            effective_prompt, # Use the effective prompt
            {"mime_type": mime_type, "data": image_data} # Simple dict for service
        ]

        # 4. Call ComponentService's _call_gemini_with_retry for analysis
        logger.info(f"Calling component_service for image analysis (prompt: '{effective_prompt[:30]}...', image: {len(image_data)} bytes)")
        # Pass the list directly to the service function
        async for chunk in component_service_instance._call_gemini_with_retry(gemini_contents):
            if "<!-- ERROR:" in chunk:
                logger.error(f"Gemini wrapper signaled error during image analysis: {chunk}")
                error_match = re.search(r"<!-- ERROR: (.*) -->", chunk)
                error_message = error_match.group(1) if error_match else "Failed to analyze image due to API error."
                break
            full_response += chunk

        if error_message:
            raise HTTPException(status_code=500, detail=error_message)

        if not full_response.strip():
            logger.warning("Gemini returned an empty analysis for the image.")
            return {"analysis": ""} # Return analysis field

        # 5. Return the successful analysis
        logger.info(f"Successfully generated image analysis (length: {len(full_response)}).")
        return {"analysis": full_response.strip()} # Return analysis field

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"An unexpected error occurred during image analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during image analysis: {str(e)}")
# --- End Re-added Image Tool Endpoint ---

# --- NEW Image Generation Endpoint ---
@app.post("/api/generate-image")
async def generate_image_endpoint(
    request: ImageGenerationRequest, 
    current_user: User = Depends(get_current_user)
):
    """Handles image generation requests using the component service."""
    logger.info(f"Received request for /api/generate-image from user: {current_user.username}, prompt: '{request.prompt[:50]}...'")

    if not request.prompt:
        # Although the model has min_length=1, double-check
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    try:
        # Call the service method
        result = await component_service_instance.generate_image(request.prompt)

        # Check the result from the service
        if "error" in result and result["error"]:
            logger.error(f"Image generation failed for user {current_user.username}: {result['error']}")
            # Return a specific error status code if needed, e.g., 500 or 503
            raise HTTPException(status_code=500, detail=f"Image generation failed: {result['error']}")
        elif "imageDataUrl" in result and result["imageDataUrl"]:
            logger.info(f"Successfully generated image for user {current_user.username}.")
            return {"imageDataUrl": result["imageDataUrl"]}
        else:
            # Should not happen if service guarantees one or the other
            logger.error(f"Image generation returned unexpected result for user {current_user.username}: {result}")
            raise HTTPException(status_code=500, detail="Image generation returned an unexpected result.")

    except HTTPException as http_exc:
        # Re-raise HTTPException to keep FastAPI handling
        raise http_exc
    except Exception as e:
        logger.exception(f"An unexpected error occurred during image generation endpoint processing: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during image generation: {str(e)}")
# --- End NEW Image Generation Endpoint ---

# --- NEW Video Analysis Endpoint (Data URL approach) ---
@app.post("/api/video-tool")
async def video_tool_endpoint(
    request: VideoAnalysisJSONRequest, 
    current_user: User = Depends(get_current_user)
):
    """Handles video analysis requests using data URLs and the File API."""
    effective_prompt = request.prompt if request.prompt else "Describe this video in detail."
    logger.info(f"Received JSON request for /api/video-tool from user: {current_user.username}, prompt: '{effective_prompt[:50]}...'")

    # 1. Parse Data URL
    try:
        header, encoded_data = request.fileDataUrl.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        video_data = base64.b64decode(encoded_data)
        logger.info(f"Decoded video data: {len(video_data)} bytes, mime_type: {mime_type}")
    except (ValueError, IndexError, base64.binascii.Error) as e:
        logger.error(f"Invalid fileDataUrl format for video: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid fileDataUrl format: {e}")

    # 2. Validate MIME type (adjust allowed types for video)
    # Example list, refine based on expected video types
    allowed_mime_types = [
        "video/mp4", "video/mpeg", "video/mov", "video/avi", 
        "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp"
    ]
    if mime_type not in allowed_mime_types:
        logger.warning(f"User {current_user.username} provided invalid video data URL type: {mime_type}")
        raise HTTPException(status_code=400, detail=f"Invalid file type from data URL: {mime_type}. Allowed types: {', '.join(allowed_mime_types)}")

    # 3. Call the service method (async streaming)
    try:
        content_stream = component_service_instance.analyze_video_from_bytes(
            prompt=effective_prompt,
            video_bytes=video_data,
            mime_type=mime_type
        )
        
        # --- Consume the stream and return JSON --- 
        full_analysis = ""
        async for chunk in content_stream:
            if "<!-- ERROR:" in chunk:
                logger.error(f"Video analysis service signaled error: {chunk}")
                error_match = re.search(r"<!-- ERROR: (.*) -->", chunk)
                error_message = error_match.group(1) if error_match else "Video analysis failed."
                raise HTTPException(status_code=500, detail=error_message)
            full_analysis += chunk
        
        logger.info(f"Successfully collected video analysis (length: {len(full_analysis)}). Returning JSON.")
        return JSONResponse(content={"analysis": full_analysis.strip()})
        # --- End JSON response section ---

    except HTTPException as http_exc:
        # Re-raise HTTPException if service raises one (e.g., init failure) or if we raise one above
        raise http_exc
    except Exception as e:
        # Handle exceptions during the setup before streaming starts
        logger.exception(f"An unexpected error occurred setting up video analysis stream: {e}")
        # Return an error response immediately
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error during video analysis setup: {str(e)}"}
        )
# --- End NEW Video Analysis Endpoint ---

# --- NEW Audio Analysis Endpoint (Data URL approach) ---
@app.post("/api/audio-tool")
async def audio_tool_endpoint(
    request: AudioAnalysisJSONRequest, 
    current_user: User = Depends(get_current_user)
):
    """Handles audio analysis requests using data URLs and inline data."""
    logger.info(f"Received JSON request for /api/audio-tool from user: {current_user.username}, prompt: '{request.prompt[:50]}...'")

    # 1. Parse Data URL
    try:
        header, encoded_data = request.fileDataUrl.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        audio_data = base64.b64decode(encoded_data)
        logger.info(f"Decoded audio data: {len(audio_data)} bytes, mime_type: {mime_type}")
    except (ValueError, IndexError, base64.binascii.Error) as e:
        logger.error(f"Invalid fileDataUrl format for audio: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid fileDataUrl format: {e}")

    # 2. Validate MIME type (add allowed audio types)
    allowed_mime_types = [
        "audio/mpeg", "audio/mp3", # MP3
        "audio/wav", "audio/x-wav", # WAV
        "audio/ogg", # OGG Vorbis
        "audio/aac", # AAC
        "audio/flac", "audio/x-flac", # FLAC
        "audio/amr", # AMR (often mobile)
        "audio/aiff", # AIFF
        # Add others as needed based on Gemini supported types
    ]
    if mime_type not in allowed_mime_types:
        logger.warning(f"User {current_user.username} provided invalid audio data URL type: {mime_type}")
        raise HTTPException(status_code=400, detail=f"Invalid file type from data URL: {mime_type}. Allowed types: {', '.join(allowed_mime_types)}")

    # 3. Call the service method and return JSON response
    try:
        content_stream = component_service_instance.analyze_audio_from_bytes(
            prompt=request.prompt,
            audio_bytes=audio_data,
            mime_type=mime_type
        )
        
        # Consume the stream and return JSON
        full_analysis = ""
        async for chunk in content_stream:
            if "<!-- ERROR:" in chunk:
                logger.error(f"Audio analysis service signaled error: {chunk}")
                error_match = re.search(r"<!-- ERROR: (.*) -->", chunk)
                error_message = error_match.group(1) if error_match else "Audio analysis failed."
                raise HTTPException(status_code=500, detail=error_message)
            full_analysis += chunk
        
        logger.info(f"Successfully collected audio analysis (length: {len(full_analysis)}). Returning JSON.")
        return JSONResponse(content={"analysis": full_analysis.strip()})

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"An unexpected error occurred setting up/processing audio analysis stream: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error during audio analysis: {str(e)}"}
        )
# --- End NEW Audio Analysis Endpoint ---

# --- NEW Generation Management Endpoints ---

@app.post("/api/save-generation", status_code=status.HTTP_201_CREATED, response_model=GenerationInfo)
async def save_generation(
    request: SaveGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    """Saves a generated HTML snippet and its prompt for the user."""
    if not db:
        raise HTTPException(status_code=503, detail="Firestore service not available.")

    generation_name = request.name if request.name else f"Generation - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    prompt_preview = (request.prompt[:100] + '...') if len(request.prompt) > 100 else request.prompt

    try:
        # Prepare data for Firestore
        generation_data = {
            "userId": current_user.uid,
            "prompt": request.prompt,
            "htmlContent": request.htmlContent,
            "name": generation_name,
            "createdAt": firestore.SERVER_TIMESTAMP # Use server timestamp
        }

        # Add a new doc with auto-generated ID
        update_time, doc_ref = await asyncio.to_thread(
            db.collection("userGenerations").add,
            generation_data
        )

        logger.info(f"Saved generation {doc_ref.id} for user {current_user.uid}")

        # Return info about the saved generation
        # We need to fetch the server timestamp after saving, or approximate it
        # For simplicity now, we'll use client time for the response model
        return GenerationInfo(
            id=doc_ref.id,
            name=generation_name,
            prompt_preview=prompt_preview,
            createdAt=datetime.now() # Approximation for response
        )

    except Exception as e:
        logger.exception(f"Error saving generation for user {current_user.uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save generation.")

@app.get("/api/generations", response_model=List[GenerationInfo])
async def list_generations(
    current_user: User = Depends(get_current_user)
):
    """Lists saved generations for the current user."""
    if not db:
        raise HTTPException(status_code=503, detail="Firestore service not available.")

    generations_list = []
    try:
        # Query Firestore for generations belonging to the user, order by creation time
        docs_stream = await asyncio.to_thread(
            lambda: db.collection("userGenerations")
                       .where("userId", "==", current_user.uid)
                       .order_by("createdAt", direction=firestore.Query.DESCENDING)
                       .stream()
        )

        for doc in docs_stream:
            data = doc.to_dict()
            # Handle potential missing timestamp during fetch (though SERVER_TIMESTAMP should guarantee it)
            created_at = data.get("createdAt", datetime.now()) 
            if isinstance(created_at, datetime): # Ensure it's a datetime object
                 prompt_preview = (data.get("prompt", "")[:100] + '...') if len(data.get("prompt", "")) > 100 else data.get("prompt", "")
                 generations_list.append(GenerationInfo(
                     id=doc.id,
                     name=data.get("name", "Untitled Generation"),
                     prompt_preview=prompt_preview,
                     createdAt=created_at
                 ))
            else:
                logger.warning(f"Skipping generation {doc.id} due to unexpected createdAt type: {type(created_at)}")

        logger.info(f"Found {len(generations_list)} generations for user {current_user.uid}")
        return generations_list

    except Exception as e:
        logger.exception(f"Error listing generations for user {current_user.uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve generations.")

@app.get("/api/generations/{generation_id}", response_model=GenerationDetail)
async def get_generation_detail(
    generation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Gets the full details of a specific saved generation."""
    if not db:
        raise HTTPException(status_code=503, detail="Firestore service not available.")

    try:
        doc_ref = db.collection("userGenerations").document(generation_id)
        doc = await asyncio.to_thread(doc_ref.get)

        if not doc.exists:
            logger.warning(f"Generation {generation_id} not found for user {current_user.uid}")
            raise HTTPException(status_code=404, detail="Generation not found.")

        data = doc.to_dict()

        # Verify ownership
        if data.get("userId") != current_user.uid:
            logger.error(f"User {current_user.uid} attempted to access generation {generation_id} owned by {data.get('userId')}")
            raise HTTPException(status_code=403, detail="Not authorized to access this generation.")

        created_at = data.get("createdAt", datetime.now())
        if not isinstance(created_at, datetime):
             logger.warning(f"Generation {doc.id} has unexpected createdAt type: {type(created_at)}. Using current time.")
             created_at = datetime.now()

        prompt_preview = (data.get("prompt", "")[:100] + '...') if len(data.get("prompt", "")) > 100 else data.get("prompt", "")

        return GenerationDetail(
            id=doc.id,
            name=data.get("name", "Untitled Generation"),
            prompt_preview=prompt_preview,
            createdAt=created_at,
            prompt=data.get("prompt", ""),
            htmlContent=data.get("htmlContent", "")
        )

    except HTTPException as http_exc:
        raise http_exc # Re-raise specific HTTP exceptions
    except Exception as e:
        logger.exception(f"Error fetching generation {generation_id} for user {current_user.uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve generation details.")

# --- Add Delete Endpoint below get_generation_detail ---
@app.delete("/api/generations/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generation(
    generation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Deletes a specific saved generation after verifying ownership."""
    if not db:
        raise HTTPException(status_code=503, detail="Firestore service not available.")

    logger.info(f"Received DELETE request for generation {generation_id} from user {current_user.uid}")
    doc_ref = db.collection("userGenerations").document(generation_id)

    try:
        # First, get the document to verify ownership
        doc = await asyncio.to_thread(doc_ref.get)

        if not doc.exists:
            logger.warning(f"Attempt to delete non-existent generation {generation_id} by user {current_user.uid}")
            raise HTTPException(status_code=404, detail="Generation not found.")

        data = doc.to_dict()
        # Verify ownership
        if data.get("userId") != current_user.uid:
            logger.error(f"User {current_user.uid} attempted to DELETE generation {generation_id} owned by {data.get('userId')}")
            raise HTTPException(status_code=403, detail="Not authorized to delete this generation.")

        # If ownership is verified, proceed with deletion
        await asyncio.to_thread(doc_ref.delete)
        logger.info(f"Successfully deleted generation {generation_id} for user {current_user.uid}")
        # Return No Content status (FastAPI handles this based on status_code)
        return

    except HTTPException as http_exc:
        raise http_exc # Re-raise specific HTTP exceptions
    except Exception as e:
        logger.exception(f"Error deleting generation {generation_id} for user {current_user.uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete generation.")

# --- End Delete Endpoint ---

# --- NEW Suggest Modifications Endpoint --- 
@app.post("/api/suggest-modifications", response_model=SuggestModificationsResponse)
async def suggest_modifications_endpoint(
    request: SuggestModificationsRequest, 
    current_user: User = Depends(get_current_user)
): 
    """Analyzes the current HTML and suggests modifications."""
    logger.info(f"Received request for /api/suggest-modifications from user: {current_user.username}")

    if not request.current_html:
        raise HTTPException(status_code=400, detail="Current HTML content cannot be empty.")

    try:
        # Call the service method
        suggestions_list = await component_service_instance.suggest_modifications(request.current_html)

        # Check if the first suggestion indicates an error from the service
        if suggestions_list and suggestions_list[0].startswith("Error:"): 
            logger.error(f"Suggestion generation failed for user {current_user.username}: {suggestions_list[0]}")
            raise HTTPException(status_code=500, detail=suggestions_list[0])
        
        logger.info(f"Successfully generated {len(suggestions_list)} suggestions for user {current_user.username}.")
        return SuggestModificationsResponse(suggestions=suggestions_list)

    except HTTPException as http_exc:
        # Re-raise HTTPException to keep FastAPI handling
        raise http_exc
    except Exception as e:
        logger.exception(f"An unexpected error occurred during suggestions endpoint processing: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error generating suggestions: {str(e)}")
# --- End NEW Suggest Modifications Endpoint --- 

# --- NEW ENDPOINT FOR UI GENERATION WITH FILES ---
@app.post("/api/v2/generate-full-code-with-files")
async def generate_full_code_with_files_endpoint(
    prompt: str = Form(...),
    files: List[UploadFile] = File(default=[]), # Make files optional
    current_user: User = Depends(get_current_user)
):
    logger.info(f"User '{current_user.username}' called /api/v2/generate-full-code-with-files with prompt and {len(files)} files.")

    processed_files_metadata = []
    gemini_sdk_file_objects = [] # To hold file objects for the Gemini SDK's generate_content

    if not os.getenv("GOOGLE_API_KEY"):
        logger.error("GOOGLE_API_KEY not configured. Cannot use Gemini Files API for uploads if needed.")
        # Allow proceeding if all files are small enough for data URI / text content,
        # but log a warning. The service layer will ultimately decide if Files API is essential.
        # For now, we prepare as much as possible.
        # raise HTTPException(status_code=500, detail="AI service not configured for file uploads.")

    gemini_client = None
    try:
        if os.getenv("GOOGLE_API_KEY"): # Only initialize client if API key is available
            gemini_client = genai.Client() # Assumes genai.configure() has been called
            if not gemini_client:
                 logger.warning("Failed to initialize Gemini Client, Files API uploads will not be possible.")
        else:
            logger.warning("GOOGLE_API_KEY not set. Gemini Files API uploads will not be possible.")
    except Exception as e:
        logger.error(f"Error initializing Gemini Client: {e}. Files API uploads will not be possible.")
        gemini_client = None # Ensure client is None if init fails

    with tempfile.TemporaryDirectory() as temp_dir:
        for uploaded_file in files:
            if not uploaded_file.filename:
                logger.warning("Skipping file without a filename.")
                continue

            metadata = {
                "id": uploaded_file.filename, # Default ID, will be overridden by Gemini file ID if uploaded
                "name": uploaded_file.filename,
                "mime_type": uploaded_file.content_type,
                "size": uploaded_file.size,
                "gemini_uri": None,
                "content_data_url": None,
                "text_content": None,
            }
            
            # Read file content once
            file_bytes = None
            try:
                file_bytes = await uploaded_file.read()
                await uploaded_file.seek(0) # Reset stream position if it needs to be read again (e.g. by aiofiles)
            except Exception as read_exc:
                logger.error(f"Failed to read content for file {uploaded_file.filename}: {read_exc}", exc_info=True)
                await uploaded_file.close()
                continue # Skip this file

            try:
                is_text_file_type = uploaded_file.content_type and \
                                   (uploaded_file.content_type.startswith("text/") or \
                                    uploaded_file.content_type == "application/json" or \
                                    uploaded_file.content_type == "application/csv" or \
                                    uploaded_file.content_type == "text/markdown") # More specific for markdown

                is_media_file_type = uploaded_file.content_type and \
                                     (uploaded_file.content_type.startswith("image/") or \
                                      uploaded_file.content_type.startswith("video/"))

                if is_media_file_type and uploaded_file.size < MAX_FILE_SIZE_FOR_DATA_URL:
                    b64_encoded_content = base64.b64encode(file_bytes).decode("utf-8")
                    metadata["content_data_url"] = f"data:{uploaded_file.content_type};base64,{b64_encoded_content}"
                    logger.info(f"Processed file '{uploaded_file.filename}' as data URL.")

                elif is_text_file_type and uploaded_file.size < MAX_FILE_SIZE_FOR_TEXT_CONTENT:
                    try:
                        metadata["text_content"] = file_bytes.decode("utf-8")
                        logger.info(f"Processed file '{uploaded_file.filename}' as direct text content.")
                    except UnicodeDecodeError:
                        logger.warning(f"Could not decode file '{uploaded_file.filename}' as UTF-8 text. Treating as binary for Files API if needed.")
                        if not gemini_client:
                           logger.error(f"Cannot process binary-like text file '{uploaded_file.filename}' as no Gemini client for Files API.")
                           continue 
                        pass # Let it fall to the 'else' for Files API

                if gemini_client and not metadata["content_data_url"] and not metadata["text_content"]:
                    temp_local_filename = f"{uuid.uuid4().hex}-{uploaded_file.filename}"
                    temp_local_path = os.path.join(temp_dir, temp_local_filename)
                    with open(temp_local_path, 'wb') as temp_f:
                        temp_f.write(file_bytes)
                    logger.info(f"Attempting to upload '{uploaded_file.filename}' to Gemini Files API from path: {temp_local_path}")
                    gemini_uploaded_file_obj = gemini_client.files.upload(
                        path=temp_local_path,
                        display_name=uploaded_file.filename,
                        mime_type=uploaded_file.content_type
                    )
                    if gemini_uploaded_file_obj:
                        metadata["id"] = gemini_uploaded_file_obj.name
                        metadata["gemini_uri"] = gemini_uploaded_file_obj.uri
                        gemini_sdk_file_objects.append(gemini_uploaded_file_obj)
                        logger.info(f"Uploaded '{uploaded_file.filename}' to Gemini Files API. ID: {gemini_uploaded_file_obj.name}, URI: {gemini_uploaded_file_obj.uri}")
                    else:
                        logger.error(f"Failed to upload '{uploaded_file.filename}' to Gemini Files API (upload returned None). Skipping.")
                        continue
                elif not metadata["content_data_url"] and not metadata["text_content"]:
                    logger.warning(f"File '{uploaded_file.filename}' was not converted to data URI or text, and Gemini client is not available for Files API upload. Skipping.")
                    continue

            except Exception as e:
                logger.error(f"Error processing file {uploaded_file.filename}: {e}", exc_info=True)
                continue
            finally:
                await uploaded_file.close()

            processed_files_metadata.append(metadata)
    
    try:
        logger.info(f"Calling component service for UI generation. Prompt: '{prompt[:100]}...', {len(processed_files_metadata)} files processed, {len(gemini_sdk_file_objects)} for Gemini Files API.")
        content_stream = component_service_instance.generate_ui_from_prompt_and_files(
            text_prompt=prompt,
            uploaded_files_info=processed_files_metadata,
            gemini_file_objects=gemini_sdk_file_objects,
            user=current_user
        )
        if gemini_client:
            for sdk_file_obj in gemini_sdk_file_objects:
                try:
                    logger.info(f"Attempting to delete file {sdk_file_obj.name} from Gemini Files API.")
                    gemini_client.files.delete(name=sdk_file_obj.name)
                except Exception as del_e:
                    logger.error(f"Failed to delete file {sdk_file_obj.name} from Gemini Files API: {del_e}", exc_info=True)
        return StreamingResponse(content_stream, media_type="text/event-stream")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Critical error during UI generation with files for user '{current_user.username}': {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"An unexpected error occurred during UI generation: {str(e)}"}
        )

# --- NEW ENDPOINT FOR MODIFICATION WITH FILES ---
@app.post("/api/v2/modify-full-code-with-files")
async def modify_full_code_with_files_endpoint(
    modification_prompt: str = Form(...),
    current_html: str = Form(...),
    files: List[UploadFile] = File(default=[]), # Make files optional
    current_user: User = Depends(get_current_user)
):
    logger.info(f"User '{current_user.username}' called /api/v2/modify-full-code-with-files with modification prompt and {len(files)} files.")

    processed_files_metadata = []
    gemini_sdk_file_objects = [] # To hold file objects for the Gemini SDK's generate_content

    if not os.getenv("GOOGLE_API_KEY"):
        logger.error("GOOGLE_API_KEY not set for file upload processing.")
        raise HTTPException(status_code=500, detail="Server configuration error related to file processing.")

    try:
        for file in files:
            file_content = await file.read()
            file_size = len(file_content)
            mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
            file_info = {
                "id": None, # Will be set if uploaded to Gemini Files API
                "name": file.filename,
                "mime_type": mime_type,
                "size": file_size,
                "gemini_uri": None,
                "content_data_url": None,
                "text_content": None
            }

            logger.debug(f"Processing uploaded file for modification: {file.filename}, Type: {mime_type}, Size: {file_size}")

            # Decide how to process based on type and size
            is_text = mime_type and ('text/' in mime_type or mime_type in ['application/json', 'application/csv'])
            is_embeddable_media = mime_type and ('image/' in mime_type or 'video/' in mime_type)
            
            # SMALL TEXT FILES: Include content directly
            if is_text and file_size < 50 * 1024: # e.g., < 50KB
                try:
                    file_info["text_content"] = file_content.decode('utf-8')
                    file_info["id"] = file.filename # Use filename as ID if not using Files API
                    logger.debug(f"Included text content for {file.filename}")
                except UnicodeDecodeError:
                    logger.warning(f"Could not decode file {file.filename} as UTF-8 text, skipping text_content.")
                    # Fallback to Gemini API upload if needed or just pass metadata
                    # Pass basic info without text_content if decoding fails
                    pass # Metadata already contains basic info
            
            # SMALL/MEDIUM MEDIA: Include as data URL
            elif is_embeddable_media and file_size < 5 * 1024 * 1024: # e.g., < 5MB
                base64_encoded_data = base64.b64encode(file_content).decode('utf-8')
                file_info["content_data_url"] = f"data:{mime_type};base64,{base64_encoded_data}"
                file_info["id"] = file.filename # Use filename as ID if not using Files API
                logger.debug(f"Included data URL for {file.filename}")
            
            # OTHER/LARGE FILES: Upload to Gemini Files API (requires genai configured)
            else:
                try:
                    logger.debug(f"Attempting to upload {file.filename} ({mime_type}) to Gemini Files API...")
                    # Ensure genai is initialized (ideally done globally)
                    if not component_service_instance.genai_configured:
                         component_service_instance.configure_genai() # Make sure it's configured
                    
                    uploaded_file = component_service_instance.upload_file(file.filename, file_content, mime_type)
                    if uploaded_file:
                        file_info["gemini_uri"] = uploaded_file.uri
                        file_info["id"] = uploaded_file.name # Use the Gemini file ID (e.g., files/xxxx)
                        gemini_sdk_file_objects.append(uploaded_file) # Keep the SDK object
                        logger.info(f"Successfully uploaded {file.filename} to Gemini Files API. URI: {uploaded_file.uri}")
                    else:
                        logger.warning(f"Failed to upload {file.filename} to Gemini Files API, genai.upload_file returned None.")
                        # Fallback: only include basic metadata without URI/ID/object
                        pass
                except Exception as e:
                    logger.error(f"Error uploading file {file.filename} to Gemini Files API: {e}", exc_info=True)
                    # Fallback: only include basic metadata without URI/ID/object
                    pass 

            processed_files_metadata.append(file_info)

        # Call the new service method for modification with files
        logger.info(f"Calling service modification method. Mod Prompt: {modification_prompt[:50]}..., {len(processed_files_metadata)} files processed, {len(gemini_sdk_file_objects)} for Gemini Files API.")
        async def stream_generator(): # Define the async generator locally
            try:
                async for chunk in component_service_instance.modify_ui_from_prompt_and_files(
                    modification_prompt=modification_prompt,
                    current_html=current_html,
                    uploaded_files_info=processed_files_metadata,
                    gemini_file_objects=gemini_sdk_file_objects,
                    user=current_user,
                    enable_grounding=False # Or determine based on prompt
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"Error during modification streaming: {e}", exc_info=True)
                error_html = f'<!-- ERROR: An internal error occurred during modification: {str(e).replace("-", "--")} -->'
                yield error_html # Signal error to frontend within the stream
            finally:
                # Cleanup Gemini files if needed (optional, depends on lifecycle)
                if gemini_sdk_file_objects:
                    logger.info(f"Request completed. Consider deleting {len(gemini_sdk_file_objects)} uploaded Gemini files.")
                    # Example cleanup (implement delete logic in service if needed)
                    # for sdk_file in gemini_sdk_file_objects:
                    #    try:
                    #        component_service_instance.delete_file(sdk_file.name)
                    #        logger.info(f"Deleted Gemini file: {sdk_file.name}")
                    #    except Exception as del_e:
                    #        logger.error(f"Error deleting Gemini file {sdk_file.name}: {del_e}")

        return StreamingResponse(stream_generator(), media_type="text/html")

    except Exception as e:
        logger.error(f"Error processing file uploads or calling modification service: {e}", exc_info=True)
        # Return a JSON response for general errors during setup/file processing
        return JSONResponse(
            status_code=500,
            content={"detail": f"An internal error occurred: {str(e)}"}
        )

# --- END NEW ENDPOINT ---


# --- Static files mounting (ensure it's after all route definitions if it matters for overlap) ---
# Mount static files if you have a 'static' directory in 'backend' for JS, CSS, images
# ... existing code ...
# --- Remove verify_password and get_password_hash if /token endpoint is removed
# def verify_password(plain_password, hashed_password):
#     return pwd_context.verify(plain_password, hashed_password)
# 
# def get_password_hash(password):
#     return pwd_context.hash(password)


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    #we need code here
    pass