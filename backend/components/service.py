"""
Component-Based UI Generation Service

This module provides services for component-based UI generation.
It uses AI (Gemini or OpenAI) to compose components into a complete UI based on user requirements.
The service no longer relies on templates, instead fully embracing AI-driven component configuration.
"""

import json
import os
import datetime
import re
import time
import random
import logging
import sys
from typing import Dict, List, Any, Optional, Tuple, Union, AsyncIterator, AsyncGenerator

from dotenv import load_dotenv
import traceback
import asyncio
import base64
import io # Add io import

# --- Remove environment diagnostics ---
# print(f"DEBUG: Running Python executable: {sys.executable}")
# print(f"DEBUG: Python Path (sys.path): {sys.path}")
# --- End environment diagnostics ---

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Restore necessary google imports ---
from google.api_core import exceptions as core_exceptions # If needed for specific error handling
import google.genai as genai
from google.genai.types import Part, Blob, GenerationConfig, GenerateContentResponse, Tool, GoogleSearch, File as GeminiSDKFile
from google.ai import generativelanguage as glm # Keep for now, might be needed elsewhere?

# Add GeminiFile type hint if needed, or use Any for now
# from google.generativeai.types import File as GeminiFile 

class ComponentService:
    """
    Service for AI-driven component-based UI generation using the NEW google.genai SDK.
    Uses standard top-level imports.
    """
    
    def __init__(self):
        """Initializes the ComponentService, creating the API client.
           Configuration (API key) is expected to be handled globally (in main.py).
        """
        self.error_count = 0 
        try:
            self.client = genai.Client() # Instantiate the client
            logger.info("google-genai client created successfully in ComponentService.")
        except Exception as e:
            logger.error(f"Failed to create google-genai client in ComponentService: {e}", exc_info=True)
            self.client = None # Ensure client is None on failure
            
        # Configuration is handled globally in main.py
        # print("ComponentService initialized.") 
            
    
    async def _call_gemini_api(self, contents: Union[str, List[Union[str, Dict[str, Any]]]], **kwargs) -> AsyncIterator[str]:
        """Calls the Gemini API with the given contents, using top-level imported objects/types."""
        # --- REMOVED Check for required injected objects/types --- 
        
        # --- Use top-level imports directly --- 
        # Local references for convenience (using stored types/modules) - REMOVED
        # genai = self._genai 
        # Part = self._Part
        # Blob = self._Blob
        # GenerationConfig = self._GenerationConfig
        # GenerativeModel = self._GenerativeModel 
        # glm = self._glm 

        # --- REMOVED ALL INTERNAL IMPORTS --- 
        
        func_start_time = time.perf_counter()
        
        # Log original contents type/length
        if isinstance(contents, str) or isinstance(contents, list):
            print(f"Calling Gemini API with initial contents length: {len(contents)}")
        else:
            print(f"Calling Gemini API with initial contents of type: {type(contents).__name__}")
        
        # Initial prompt logging remains synchronous (log the raw incoming contents)
        log_dir = os.path.dirname("gemini_request_log.txt")
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        try:
            with open("gemini_request_log.txt", "a", encoding="utf-8") as f:
                f.write(f"\nRequest Time: {datetime.datetime.now()}\n")
                f.write(f"Contents (Raw Incoming): ") # Corrected spacing
                f.write(str(contents))
                f.write("\n--- End of Raw Contents ---\n\n")
        except Exception as log_e:
            print(f"Error writing initial contents to log: {log_e}")
        
        # --- BEGIN REVISED TRANSFORMATION for Multimodal Input & SDK File Objects ---
        processed_contents = []
        is_multimodal_or_files_api = False

        if isinstance(contents, str):
            processed_contents.append(contents)
        elif isinstance(contents, list) and len(contents) > 0:
            # First element is usually the text prompt
            if isinstance(contents[0], str):
                processed_contents.append(contents[0])
            else:
                logger.error(f"First element in 'contents' list is not a string: {type(contents[0])}. This may cause issues.")
                # Attempt to stringify and add it, or handle error more gracefully
                try:
                    processed_contents.append(str(contents[0]))
                    logger.warning(f"Attempted to cast non-string first element to string.")
                except Exception as cast_err:
                    logger.error(f"Could not cast non-string first element to string: {cast_err}. Yielding error.")
                    yield "<!-- ERROR: Malformed input - first part of content list must be a string prompt. -->"
                    return

            # Process subsequent elements in the list
            for item in contents[1:]:
                if isinstance(item, dict) and 'mime_type' in item and 'data' in item:
                    # This is the old structure for inline data (e.g., from data URLs for image/video/audio tools)
                    try:
                        logger.info(f"Transforming inline media dict (MIME: {item['mime_type']}) to Part object.")
                        processed_contents.append(Part(inline_data=Blob(mime_type=item['mime_type'], data=item['data'])))
                        is_multimodal_or_files_api = True
                    except Exception as transform_e:
                        logger.error(f"Error transforming inline media dict to Part: {transform_e}", exc_info=True)
                        yield f"<!-- ERROR: Failed to transform inline media content: {transform_e} -->"
                        return # Stop processing this request
                
                # Use isinstance check with the imported GeminiSDKFile type
                elif isinstance(item, GeminiSDKFile):
                    logger.info(f"Appending Gemini SDK File object '{item.name}' directly to processed_contents.")
                    processed_contents.append(item) # Append SDK File object as is
                    is_multimodal_or_files_api = True
                else:
                    logger.warning(f"Unsupported item type ({type(item)}) in 'contents' list after the initial prompt. Skipping this item: {str(item)[:100]}...")
        
        elif contents is None: # Handle if original contents is None
            logger.error("'contents' cannot be None for AI call.")
            yield "<!-- ERROR: Input contents for AI call cannot be None. -->"
            return
        else: # Not a string, not a list, or an empty list that didn't get populated correctly by caller
            logger.error(f"Unsupported 'contents' type for AI call: {type(contents)}. Must be string or list of [str, File/Dict]. Trying to cast to string.")
            try:
                processed_contents.append(str(contents))
                logger.warning(f"Attempted to cast unsupported 'contents' type to string.")
            except Exception as cast_err:
                logger.error(f"Could not cast unsupported 'contents' type to string: {cast_err}. Yielding error.")
                yield f"<!-- ERROR: Unsupported input contents type: {type(contents)} and failed to cast to string. -->"
                return

        # Final check on processed_contents before API call
        if not processed_contents or not isinstance(processed_contents[0], str) or not processed_contents[0].strip():
            # If after all processing, there's no content, or the first part isn't a non-empty string. 
            # This indicates a fundamental issue with how contents were assembled or processed.
            logger.error(f"Processed_contents is empty or does not start with a valid string prompt. Processed: {str(processed_contents)[:200]}...")
            yield "<!-- ERROR: Invalid processed contents for AI call - missing or invalid prompt. -->"
            return
        
        # --- END REVISED TRANSFORMATION ---
        
        api_duration = 0.0
        api_call_start_time = 0.0
        full_response = "" # Initialize variable to accumulate the full response

        try:
            # --- Check if client was initialized --- 
            if not self.client:
                 logger.error("Gemini client not initialized in ComponentService. Cannot call API.")
                 yield "<!-- ERROR: Gemini client failed to initialize -->"
                 return
                 
            # --- Model name --- 
            model_name = "gemini-2.0-flash" # TODO: Make configurable
            logger.info(f"Using Gemini model: {model_name}")

            # --- Grounding Configuration (using google.genai.types) ---
            tools = None
            enable_grounding = kwargs.get('enable_grounding', False)
            if enable_grounding:
                logger.info("Grounding with Google Search ENABLED for this call.")
                # Use the types imported from google.genai.types
                try: 
                    # Correct tool creation using google.genai.types
                    google_search_tool = Tool(google_search=GoogleSearch())
                    tools = [google_search_tool]
                    logger.info("Successfully created grounding tool using google.genai.types.Tool/GoogleSearch.")
                except Exception as tool_e:
                     logger.error(f"Error creating grounding tool with google.genai.types: {tool_e}", exc_info=True)
                     tools = None # Ensure tools is None on error
            # --- End Grounding Configuration ---

            # --- Use the imported GenerationConfig TYPE --- 
            config = GenerationConfig(
                temperature=0.7, 
                # Add other config params as needed
            )

            api_call_start_time = time.perf_counter()
            stream_end_time = api_call_start_time

            # --- GenerationConfig dictionary --- 
            api_config_dict = {
                 "temperature": 0.7 
            }
            # Add tools to the config dictionary if they exist
            if tools:
                api_config_dict["tools"] = tools
            
            # --- Use client's async streaming method --- 
            logger.info(f"Calling client.aio.models.generate_content_stream with model: {model_name}, grounding: {enable_grounding and tools is not None}")
            
            api_kwargs = {
                 "model": model_name,
                 "contents": processed_contents, 
                 "config": api_config_dict # Pass the config dict containing tools
            }
            # REMOVED: Conditionally adding tools directly to api_kwargs
            # if tools:
            #     api_kwargs["tools"] = tools 
                
            response_stream = await self.client.aio.models.generate_content_stream(**api_kwargs)

            # Iterate asynchronously using async for
            async for chunk in response_stream: 
                # Check chunk structure based on new SDK (might not have candidates)
                try: 
                    if hasattr(chunk, 'text'):
                        text_chunk = chunk.text
                        # --- Attempt to further break down large text_chunks ---
                        if len(text_chunk) > 256: # If a single text_chunk from SDK is large
                            logger.info(f"SDK yielded large text_chunk ({len(text_chunk)} bytes). Breaking it down.")
                            sub_chunk_size = 128
                            for i in range(0, len(text_chunk), sub_chunk_size):
                                sub_segment = text_chunk[i:i+sub_chunk_size]
                                full_response += sub_segment
                                yield sub_segment
                                await asyncio.sleep(0) # Tiny sleep to encourage flushing
                        else: # If chunk is already small, yield as is
                            full_response += text_chunk 
                            yield text_chunk 
                            await asyncio.sleep(0) # Tiny sleep here too for consistency
                        # --- End breakdown ---
                    elif hasattr(chunk, 'prompt_feedback') and chunk.prompt_feedback and chunk.prompt_feedback.block_reason:
                         # Handle potential blocking
                         logger.error(f"Stream chunk blocked. Reason: {chunk.prompt_feedback.block_reason}")
                         # Optionally yield an error comment or continue silently
                         # yield f"<!-- ERROR: Content blocked by API ({chunk.prompt_feedback.block_reason}) -->"
                         continue
                    else:
                        # Log unexpected chunk structure for debugging
                        logger.warning(f"Stream chunk missing expected 'text' attribute or block reason. Chunk: {chunk}")
                        
                # Update exception handling for new SDK if necessary
                # The specific exception types might change (e.g., BlockedPromptException)
                except Exception as stream_parse_e: 
                    logger.error(f"Error processing yielded stream chunk: {stream_parse_e}")
                    continue

            stream_end_time = time.perf_counter()
            api_duration = stream_end_time - api_call_start_time
            logger.info(f"Gemini API stream processing finished successfully in {api_duration:.4f} seconds.")

        except core_exceptions.InvalidArgument as e:
             logger.error(f"Gemini API Invalid Argument Error: {e}")
             raise 
        except core_exceptions.GoogleAPIError as e:
             logger.error(f"Gemini API Error: {e}")
             raise 
        except json.JSONDecodeError as json_err: 
             logger.error(f"JSONDecodeError occurred during stream iteration: {json_err}")
             raise 
        except Exception as e:
            # Check if it's a specific SDK exception we should handle differently
            logger.error(f"An unexpected error occurred during Gemini API call/stream: {e}", exc_info=True)
            raise 
        finally:
            func_end_time = time.perf_counter()
            total_duration = func_end_time - func_start_time
            try:
                with open("gemini_request_log.txt", "a", encoding="utf-8") as f:
                    # Log the complete accumulated response
                    f.write(f"Response (Full):\n{full_response}\n\n") 
                    f.write("\n--- Timing Details ---\n")
                    f.write(f"Total function duration: {total_duration:.4f} seconds\n")
                    f.write(f"Gemini API call/stream duration: {api_duration:.4f} seconds\n")
                    f.write("--- End of Request ---\n\n")
            except Exception as log_e:
                print(f"Error writing final details to log: {log_e}")
    
    # --- MODIFY THE RETRY WRAPPER FUNCTION ---
    async def _call_gemini_with_retry(self, contents: Union[str, List[Union[str, Dict[str, Any]]]], max_retries: int = 1, delay: int = 1, **kwargs) -> AsyncIterator[str]:
        """
        Calls the Gemini API with retry logic, supporting multimodal contents and kwargs (for grounding).
        Yields chunks from the successful attempt or an error message after max retries.
        """
        last_exception = None
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Gemini API call attempt {attempt + 1}/{max_retries + 1} (kwargs: {kwargs})")
                async for chunk in self._call_gemini_api(contents, **kwargs):
                    yield chunk
                
                logger.info(f"Gemini API call attempt {attempt + 1} successful.")
                return # Exit successfully
                
            # CATCH json.JSONDecodeError directly for retry
            except json.JSONDecodeError as json_err:
                last_exception = json_err
                logger.warning(f"Attempt {attempt + 1} failed due to specific stream decode error: {json_err}")
                if attempt < max_retries:
                    logger.info(f"Retrying in {delay} second(s)...")
                    await asyncio.sleep(delay)
                    continue # Go to next attempt
                else:
                    logger.error("Max retries reached for stream decode error.")
                    yield f"<!-- ERROR: Failed to generate content after {max_retries + 1} attempts due to stream corruption. -->"
                    return # Exit after final failure

            except Exception as e:
                # Catch other exceptions (ConnectionError, GoogleAPIError, etc.) 
                # --- Check if this generic exception looks like our specific JSON decode error ---
                if "Expecting property name enclosed in double quotes" in str(e):
                    last_exception = e
                    logger.warning(f"Attempt {attempt + 1} failed due to likely stream decode error (caught as {type(e).__name__}): {e}")
                    if attempt < max_retries:
                        logger.info(f"Retrying in {delay} second(s)...")
                        await asyncio.sleep(delay)
                        continue # Go to next attempt
                    else:
                        logger.error("Max retries reached for likely stream decode error.")
                        yield f"<!-- ERROR: Failed to generate content after {max_retries + 1} attempts due to stream corruption. -->"
                        return # Exit after final failure
                else:
                     # Treat other exceptions as truly unrecoverable
                     logger.error(f"Unrecoverable error during Gemini call attempt {attempt + 1}: {e}", exc_info=True)
                     yield f"<!-- ERROR: Unrecoverable error during generation: {e} -->"
                     return # Exit on unrecoverable error
        
        # This part should ideally not be reached if logic above is correct, but as a fallback:
        if last_exception:
             yield f"<!-- ERROR: Failed to generate content after {max_retries + 1} attempts. Last error: {last_exception} -->"
    
    def _create_full_code_prompt(self, user_request: str) -> str:
        """
        Creates the prompt for the AI to generate a complete, self-contained HTML file 
        using standard Web Components, HTML, CSS, and vanilla JavaScript.
        
        Args:
            user_request: The user's request text.
            
        Returns:
            The final prompt string to send to the AI.
        """
        prompt_template = ""
        template_path = ""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Use the template specifically for Web Components
            template_path = os.path.join(current_dir, '..', 'gemini_prompt_template_wc.md')
            with open(template_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"ERROR: Web Component Prompt template not found at {template_path}. Using basic fallback.")
            # Basic fallback instructions for HTML/WC generation
            prompt_template = (
                "You are an expert AI assistant specializing in modern, accessible web development using standard technologies.\n"
                "\n"
                "Generate a COMPLETE, runnable, self-contained HTML file (.html) that fulfills the user request below.\n"
                "\n"
                "ABSOLUTE REQUIREMENTS:\n"
                "\n"
                "0.  **No Placeholders or Excuses:** Attempt the full implementation. Do NOT output placeholder UIs or messages stating the task is too complex.\n"
                "1.  **DOCTYPE & HTML Structure:** Start with `<!DOCTYPE html>` and include `<html>`, `<head>`, and `<body>` tags.\n"
                "2.  **Styling:** Use standard CSS within `<style>` tags in the `<head>`. \n"
                "    Optionally, you can use Tailwind CSS classes IF you include the Tailwind CDN script in the `<head>`: `<script src=\"https://cdn.tailwindcss.com\"></script>`. \n"
                "    Prioritize clean, responsive design.\n"
                "3.  **Structure & Interactivity:** Use standard HTML elements. For reusable UI parts and complex logic, DEFINE and USE **Standard Web Components** (using `customElements.define`, `<template>`, and vanilla JavaScript classes extending `HTMLElement`).\n"
                "4.  **JavaScript:** Prioritize vanilla JS within `<script>` tags for basic interactivity. \n"
                "    - Use standard DOM APIs (`getElementById`, `querySelector`, `addEventListener`, etc.).\n"
                "    - **External Libraries:** For complex features (e.g., 3D graphics, advanced charting), you **MUST** actively use well-known external JavaScript libraries. **Use Import Maps** in the `<head>` when using ES Module libraries (like Three.js). Define the library (e.g., `\"three\"`) and addon paths (e.g., `\"three/addons/\"`) mapping to reliable CDN URLs (e.g., from cdnjs, jsdelivr, using `.module.js` files). Remove the `<script src=...>` tags for mapped libraries. In your `<script type=\"module\">`, use `import * as THREE from 'three';` and `import { OrbitControls } from 'three/addons/controls/OrbitControls.js';`. You **MUST** use libraries for complex tasks where vanilla JS is impractical. \n"
                "5.  **Self-Contained:** The final output MUST be a SINGLE HTML file. No external CSS files (other than Tailwind CDN). External JavaScript libraries are permissible if included via CDN `<script>` tags or referenced via Import Maps. \n"
                "6.  **Output Format:** Return ONLY the raw HTML code. NO markdown formatting (like ```html ... ```), explanations, or comments outside the code itself.\n"
                "7.  **Print Optimization:** Include print-specific CSS rules (`@media print`) to optimize the layout for printing or saving as PDF. Hide non-essential interactive elements (like buttons, input forms), ensure content fits standard paper sizes (like A4/Letter) with appropriate margins, use high-contrast text (e.g., black text on a white background regardless of screen theme), and manage page breaks appropriately (`page-break-before`, `page-break-after`, `page-break-inside: avoid`) for long content.\n"
            )

        # Construct the final prompt 
        final_prompt = (
            f"{prompt_template}\n\n"
            f"## User Request:\n\n"
            f"```text\n{user_request}\n```\n\n"
            f"## Full HTML Output (Remember: Complete, self-contained HTML with CSS and Vanilla JS/Web Components):\n"
            # AI generates the HTML starting from <!DOCTYPE html>...
        )

        logger.info("Created prompt for FULL standalone HTML/Web Component generation.")
        return final_prompt
    
    async def generate_full_component_code(self, user_request: str, enable_grounding: bool = False) -> AsyncIterator[str]:
        """
        Generates a complete, runnable HTML file string (using Web Components)
        based on a user prompt, yielding chunks as they arrive from the API.
        
        Args:
            user_request: A description of the application the user wants to create.
            enable_grounding: Whether to enable Google Search grounding.
            
        Yields:
            String chunks of the generated HTML.
        """
        logger.info(f"Starting ASYNC generation for: {user_request[:50]}... (Grounding: {enable_grounding})")
        prompt: str = ""
        full_response = "" # To capture full response for logging
        success = False # Track success for logging

        # Step 1: Create the prompt (sync operation)
        prompt = self._create_full_code_prompt(user_request)
        if not prompt:
            logger.error("Full HTML/WC prompt creation failed (template likely missing).")
            self.error_count += 1
            yield "<!-- ERROR: Prompt creation failed -->" # Yield error directly
            return # Exit early

        # Step 2: Call the streaming API via the RETRY WRAPPER
        logger.info("Calling _call_gemini_with_retry for full code generation")
        stream_successful = True # Assume success unless error occurs during streaming
        try:
            async for chunk in self._call_gemini_with_retry(prompt, enable_grounding=enable_grounding):
                if "<!-- ERROR:" in chunk: 
                    stream_successful = False
                full_response += chunk
                yield chunk
        except Exception as e:
            logger.error(f"Unexpected error iterating over retry wrapper stream: {e}", exc_info=True)
            yield f"<!-- ERROR: Unexpected error processing stream: {e} -->"
            stream_successful = False
            
        if stream_successful:
             logger.info("Finished yielding chunks from _call_gemini_with_retry.")
             self.error_count = 0 
             success = True 
        else:
             logger.error("Stream processing finished with errors signaled by the retry wrapper.")
             self.error_count += 1
             success = False
             
        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "type": "generation",
            "user_request": user_request,
            "prompt_preview": (prompt[:200] + '...') if prompt else "(Prompt creation failed)",
            "response_preview": (full_response[:200] + '...') if full_response else "(Empty/Failed)",
            "status": "Success" if success else "Failure",
        }
        try:
            with open("morpheo_generation_log.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as log_err:
            logger.error(f"Failed to write structured log for generation: {log_err}")

    def _create_modification_prompt(self, modification_request: str, current_html: str) -> str:
        """
        Creates the prompt for the AI to modify an existing HTML file 
        using standard Web Components, HTML, CSS, and vanilla JavaScript.
        
        Args:
            modification_request: The user's modification instructions.
            current_html: The current HTML code string.
            
        Returns:
            The final prompt string to send to the AI.
        """
        base_prompt_template = "" # Re-initialize for safety
        template_path = ""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            template_path = os.path.join(current_dir, '..', 'gemini_prompt_template_wc.md')
            with open(template_path, "r", encoding="utf-8") as f:
                # Read the core generation rules from the existing template
                base_prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"ERROR: Web Component Prompt template not found at {template_path}. Using basic fallback for modification.")
            # Keep a basic fallback, but we'll augment it below
            base_prompt_template = (
                "You are an expert AI assistant specializing in modern, accessible web development using standard technologies.\n"
                "\n"
                "ABSOLUTE REQUIREMENTS (Apply these to the modification):\n"
                "\n"
                "1.  **DOCTYPE & HTML Structure:** Ensure the final output is a complete HTML file starting with `<!DOCTYPE html>`.\n"
                "2.  **Styling:** Use standard CSS within `<style>` tags OR Tailwind CSS classes (assuming CDN is present). Prioritize clean, responsive design.\n"
                "3.  **Structure & Interactivity:** Use standard HTML and **Standard Web Components** (customElements.define, template, vanilla JS classes extending HTMLElement) for UI parts and logic.\n"
                "4.  **JavaScript:** All JavaScript MUST be vanilla JS. Use standard DOM APIs. NO external libraries/frameworks (except optional Tailwind CDN).\n"
            )

        # --- Modification-Specific Instructions (Prepended for Emphasis) ---
        modification_prefix = (
            "**IMPORTANT: THIS IS A MODIFICATION TASK, NOT A GENERATION TASK.**\n"
            "Your goal is to **MODIFY** the provided **EXISTING HTML CODE** based *only* on the **USER MODIFICATION REQUEST**.\n"
            "**DO NOT REWRITE THE ENTIRE FILE.** Make only the necessary incremental changes.\n"
            "Preserve the existing structure, styles, IDs, classes, and JavaScript logic unless the request explicitly asks to change them.\n"
            "\n"
            "**Handling API Calls (`window.morpheoApi.call`):**\n"
            "- If the user request implies changing the *type of information* received from an API (e.g., asking for descriptions instead of a list, summaries instead of raw data), **first try modifying the `prompt` parameter within the relevant `window.morpheoApi.call` function** in the JavaScript to match the user's desired output. \n"
            "- Do *not* change how the JavaScript *processes* the API response unless the request *also* specifies how to handle a potentially different response format. Assume the basic response structure remains similar unless told otherwise.\n"
            "- Do *not* invent new API endpoints or assume backend changes.\n"
            "\n"
            "Output the *entire* modified HTML file, ensuring it remains valid and runnable.\n"
            "--- USER MODIFICATION REQUEST ---\n"
            f"{modification_request}\n"
            "\n"
            "--- EXISTING HTML CODE TO MODIFY ---\n"
            f"{current_html}\n"
            "\n"
            "--- FULL MODIFIED HTML CODE (Your Output - Remember: Modify, don't rewrite!) ---"
        )
        
        # Combine the modification prefix with the base rules (which might be redundant now but kept for safety)
        final_prompt = modification_prefix + "\n\n--- GENERAL REQUIREMENTS (Apply to modification) ---\n" + base_prompt_template
        
        # Log the first few chars for debugging if needed
        # logger.debug(f"Modification Prompt Start: {final_prompt[:500]}") 
        
        return final_prompt

    async def modify_full_component_code(self, modification_request: str, current_html: str, enable_grounding: bool = False) -> AsyncIterator[str]:
        """
        Modifies an existing HTML file string (using Web Components)
        based on user instructions, yielding chunks as they arrive.
        
        Args:
            modification_request: The user's modification instructions.
            current_html: The current HTML code string.
            enable_grounding: Whether to enable Google Search grounding.
            
        Yields:
            String chunks of the modified HTML.
        """
        logger.info(f"Starting ASYNC modification for: {modification_request[:50]}... (Grounding: {enable_grounding})")
        prompt: str = ""
        full_response = "" # To capture full response for logging
        success = False # Track success

        # Step 1: Create the modification prompt (sync operation)
        prompt = self._create_modification_prompt(modification_request, current_html)
        if not prompt:
            logger.error("Modification prompt creation failed (template likely missing).")
            self.error_count += 1
            yield "<!-- ERROR: Modification prompt creation failed -->"
            return

        # Step 2: Call the streaming API via the RETRY WRAPPER
        logger.info("Calling _call_gemini_with_retry for modification")
        stream_successful = True
        try:
            async for chunk in self._call_gemini_with_retry(prompt, enable_grounding=enable_grounding):
                 if "<!-- ERROR:" in chunk:
                     stream_successful = False
                 full_response += chunk
                 yield chunk
        except Exception as e:
            logger.error(f"Unexpected error iterating over retry wrapper stream during modification: {e}", exc_info=True)
            yield f"<!-- ERROR: Unexpected error processing modification stream: {e} -->"
            stream_successful = False

        if stream_successful:
             logger.info("Finished yielding modification chunks from _call_gemini_with_retry.")
             self.error_count = 0
             success = True
        else:
             logger.error("Modification stream processing finished with errors signaled by the retry wrapper.")
             self.error_count += 1
             success = False
             
        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "type": "modification",
            "modification_request": modification_request,
            "prompt_preview": (prompt[:200] + '...') if prompt else "(Prompt creation failed)",
            "response_preview": (full_response[:200] + '...') if full_response else "(Empty/Failed)",
            "status": "Success" if success else "Failure",
        }
        try:
            with open("morpheo_generation_log.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as log_err:
            logger.error(f"Failed to write structured log for modification: {log_err}")

    # --- NEW Image Generation Method ---
    async def generate_image(self, prompt: str) -> Dict[str, Optional[str]]:
        """Generates an image using the experimental Gemini image generation model."""
        logger.info(f"Starting image generation (Gemini experimental) for prompt: {prompt[:50]}...")
        
        if not self.client:
            logger.error("Gemini client not initialized in ComponentService. Cannot generate image.")
            return {"error": "Image generation client failed to initialize"}
            
        # Use the experimental Gemini model for image generation
        model_name = "gemini-2.0-flash-exp"
        # Configuration to request only image output
        # Need to ensure GenerateContentConfig is imported from google.genai.types
        try:
             config = genai.types.GenerateContentConfig(
                 response_modalities=['TEXT', 'IMAGE'] # CORRECTED: Must include TEXT and IMAGE
             )
             logger.info("Configured GenerateContentConfig with response_modalities: ['TEXT', 'IMAGE']")
        except AttributeError:
             logger.error("Failed to find genai.types.GenerateContentConfig. Make sure google-genai SDK is up-to-date and imported correctly.")
             return {"error": "Internal server configuration error for image generation."}
        
        try:
            logger.info(f"Calling client.aio.models.generate_content with model: {model_name} for image generation")
            # Call generate_content, not generate_images
            response = await self.client.aio.models.generate_content(
                model=model_name,
                contents=prompt, # Pass the prompt string as contents
                config=config # Pass the config requesting image modality
            )
            
            # Process the response to find the image data
            image_part = None
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith('image/'):
                        image_part = part
                        break # Found the first image part
            
            if image_part:
                image_bytes = image_part.inline_data.data
                mime_type = image_part.inline_data.mime_type
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                data_url = f"data:{mime_type};base64,{base64_image}"
                logger.info(f"Successfully generated and encoded image using {model_name}.")
                return {"imageDataUrl": data_url}
            else:
                # Log if no image part was found (or if response was blocked/empty)
                logger.warning(f"{model_name} call completed but returned no image part. Response: {response}")
                # Check for blocking reasons
                block_reason = None
                if response.prompt_feedback and response.prompt_feedback.block_reason:
                    block_reason = response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason.name
                    logger.error(f"Image generation blocked. Reason: {block_reason}")
                    return {"error": f"Image generation blocked due to safety reasons: {block_reason}"}
                return {"error": "Image generation failed to produce an image part."}
                
        except Exception as e:
            logger.error(f"An unexpected error occurred during {model_name} API call: {e}", exc_info=True)
            # Check if it's an invalid argument error specifically mentioning the model
            if isinstance(e, core_exceptions.InvalidArgument) and model_name in str(e):
                 return {"error": f"Model '{model_name}' may not be available or does not support image generation. Error: {e}"}
            return {"error": f"Image generation failed due to API error: {e}"}
    # --- End REVISED Image Generation Method ---

    # --- NEW Video Analysis Method (Inline Data Approach) ---
    async def analyze_video_from_bytes(self, prompt: str, video_bytes: bytes, mime_type: str) -> AsyncIterator[str]:
        """Analyzes a video provided as bytes using inline data with Gemini."""
        logger.info(f"Starting video analysis from bytes (INLINE DATA) ({len(video_bytes)} bytes, type: {mime_type}), prompt: {prompt[:50]}...")

        if not self.client:
            logger.error("Gemini client not initialized. Cannot analyze video.")
            yield "<!-- ERROR: Gemini client failed to initialize -->"
            return

        # 2. Generate content using inline video data
        api_duration = 0.0
        api_call_start_time = 0.0
        full_response = "" 

        try:
            # Model selection (ensure it supports video)
            model_name = "gemini-2.0-flash" 
            logger.info(f"Using Gemini model for video analysis: {model_name}")

            # Configuration
            api_config_dict = {
                "temperature": 0.2
            }

            # Construct contents: prompt (string) and inline video data (Part/Blob)
            # Ensure Part and Blob are imported/available
            try:
                 video_contents = [
                     prompt, 
                     Part(inline_data=Blob(data=video_bytes, mime_type=mime_type))
                 ]
                 logger.info(f"Constructed inline video contents (prompt + Part/Blob)")
            except NameError as ne:
                 logger.error(f"NameError constructing inline contents: {ne}. Ensure Part/Blob are imported.")
                 yield f"<!-- ERROR: Internal setup error constructing request ({ne}) -->"
                 return
            except Exception as const_e:
                 logger.error(f"Error constructing inline contents: {const_e}", exc_info=True)
                 yield f"<!-- ERROR: Internal setup error constructing request ({const_e}) -->"
                 return

            api_call_start_time = time.perf_counter()
            
            # Use client's async streaming method directly with inline data
            logger.info(f"Calling client.aio.models.generate_content_stream with inline video data...")
            response_stream = await self.client.aio.models.generate_content_stream(
                model=model_name, # Pass model name string
                contents=video_contents, # Pass the list with inline data Part
                config=api_config_dict # Pass config dictionary
            )

            # Iterate asynchronously
            async for chunk in response_stream:
                try:
                    if hasattr(chunk, 'text'):
                        text_chunk = chunk.text
                        full_response += text_chunk
                        yield text_chunk
                    elif hasattr(chunk, 'prompt_feedback') and chunk.prompt_feedback and chunk.prompt_feedback.block_reason:
                         logger.error(f"Video analysis stream chunk blocked. Reason: {chunk.prompt_feedback.block_reason}")
                         continue # Or yield error message
                    # else: Log unexpected chunk?

                except Exception as stream_parse_e:
                    logger.error(f"Error processing video analysis stream chunk: {stream_parse_e}")
                    continue

            stream_end_time = time.perf_counter()
            api_duration = stream_end_time - api_call_start_time
            logger.info(f"Gemini video analysis stream (inline data) finished successfully in {api_duration:.4f} seconds.")

        except Exception as e:
            logger.error(f"An unexpected error occurred during Gemini video analysis call/stream (inline data): {e}", exc_info=True)
            yield f"<!-- ERROR: Failed during video analysis generation: {e} -->"
        finally:
            # Log full response etc. (Consider logging video details too)
            try:
                with open("gemini_request_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"\n--- Video Analysis (Inline Data) ({datetime.datetime.now()}) ---\n")
                    f.write(f"Prompt: {prompt}\n")
                    f.write(f"Video Mime Type: {mime_type}\n")
                    f.write(f"Video Size (bytes): {len(video_bytes)}\n")
                    # No uploaded file URI to log
                    f.write(f"Response (Full):\n{full_response}\n") 
                    # No upload duration to log
                    f.write(f"API Stream Duration: {api_duration:.4f}s\n")
                    f.write("--- End of Video Analysis (Inline Data) ---\n\n")
            except Exception as log_e:
                print(f"Error writing video analysis details to log: {log_e}")
    # --- End REVISED Video Analysis Method ---

    # --- NEW Audio Analysis Method (Inline Data Approach) ---
    async def analyze_audio_from_bytes(self, prompt: str, audio_bytes: bytes, mime_type: str) -> AsyncIterator[str]:
        """Analyzes audio provided as bytes using inline data with Gemini."""
        logger.info(f"Starting audio analysis from bytes (INLINE DATA) ({len(audio_bytes)} bytes, type: {mime_type}), prompt: {prompt[:50]}...")

        if not self.client:
            logger.error("Gemini client not initialized. Cannot analyze audio.")
            yield "<!-- ERROR: Gemini client failed to initialize -->"
            return

        # Generate content using inline audio data
        api_duration = 0.0
        api_call_start_time = 0.0
        full_response = "" 

        try:
            # Model selection (ensure it supports audio - likely the same multimodal model)
            model_name = "gemini-2.0-flash" 
            logger.info(f"Using Gemini model for audio analysis: {model_name}")

            # Configuration
            api_config_dict = {
                "temperature": 0.2 # Adjust if needed for audio tasks
            }

            # Construct contents: prompt (string) and inline audio data (Part/Blob)
            try:
                 audio_contents = [
                     prompt, 
                     Part(inline_data=Blob(data=audio_bytes, mime_type=mime_type))
                 ]
                 logger.info(f"Constructed inline audio contents (prompt + Part/Blob)")
            except NameError as ne:
                 logger.error(f"NameError constructing inline contents: {ne}. Ensure Part/Blob are imported.")
                 yield f"<!-- ERROR: Internal setup error constructing request ({ne}) -->"
                 return
            except Exception as const_e:
                 logger.error(f"Error constructing inline contents: {const_e}", exc_info=True)
                 yield f"<!-- ERROR: Internal setup error constructing request ({const_e}) -->"
                 return

            api_call_start_time = time.perf_counter()
            
            # Use client's async streaming method directly with inline data
            logger.info(f"Calling client.aio.models.generate_content_stream with inline audio data...")
            response_stream = await self.client.aio.models.generate_content_stream(
                model=model_name, # Pass model name string
                contents=audio_contents, # Pass the list with inline data Part
                config=api_config_dict # Pass config dictionary
            )

            # Iterate asynchronously
            async for chunk in response_stream:
                try:
                    if hasattr(chunk, 'text'):
                        text_chunk = chunk.text
                        full_response += text_chunk
                        yield text_chunk
                    elif hasattr(chunk, 'prompt_feedback') and chunk.prompt_feedback and chunk.prompt_feedback.block_reason:
                         logger.error(f"Audio analysis stream chunk blocked. Reason: {chunk.prompt_feedback.block_reason}")
                         continue 
                except Exception as stream_parse_e:
                    logger.error(f"Error processing audio analysis stream chunk: {stream_parse_e}")
                    continue

            stream_end_time = time.perf_counter()
            api_duration = stream_end_time - api_call_start_time
            logger.info(f"Gemini audio analysis stream (inline data) finished successfully in {api_duration:.4f} seconds.")

        except Exception as e:
            logger.error(f"An unexpected error occurred during Gemini audio analysis call/stream (inline data): {e}", exc_info=True)
            yield f"<!-- ERROR: Failed during audio analysis generation: {e} -->"
        finally:
            # Log full response etc.
            try:
                with open("gemini_request_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"\n--- Audio Analysis (Inline Data) ({datetime.datetime.now()}) ---\n")
                    f.write(f"Prompt: {prompt}\n")
                    f.write(f"Audio Mime Type: {mime_type}\n")
                    f.write(f"Audio Size (bytes): {len(audio_bytes)}\n")
                    f.write(f"Response (Full):\n{full_response}\n") 
                    f.write(f"API Stream Duration: {api_duration:.4f}s\n")
                    f.write("--- End of Audio Analysis (Inline Data) ---\n\n")
            except Exception as log_e:
                print(f"Error writing audio analysis details to log: {log_e}")
    # --- End NEW Audio Analysis Method ---

    # --- NEW Suggestion Prompt Method --- 
    def _create_suggestion_prompt(self, current_html: str) -> str:
        """Creates a prompt to ask the AI for modification suggestions."""
        # Use f-string for easier multi-line definition and interpolation
        prompt = f"""You are a super friendly and patient creative helper, like a fun teacher explaining things to a young child who is excited to build their first webpage! Forget all technical jargon.

Take a look at this HTML code. Now, can you dream up 3-5 cool and simple ideas to make it even more awesome? 

**VERY, VERY IMPORTANT: Pretend you're talking to a 6-year-old.** Use tiny words. Focus on what fun new thing they can SEE or DO. No big computer words allowed! Keep it short, super easy, and exciting!

Think about:
*   Adding a fun clicky thing? Or something that wiggles or pops up?
*   Making it easier for everyone to see and use, like bigger buttons or brighter colors if needed?
*   Making it look extra neat and tidy?
*   Little surprises that would make someone smile when they use it.

**Format your response ONLY as a numbered list. Each idea should be one short, simple sentence.**

Example of how to talk (pretend this is for a simple drawing app):
1.  What if you could click a button and the whole drawing turns sparkly for a second?
2.  Let's make the crayon colors much bigger so they are easy to tap!
3.  Maybe add a silly sound when you finish drawing a picture!
4.  Could we add a button that clears the drawing with a funny 'whoosh' sound?

--- 
HTML to Analyze:
```html
{current_html}
```

---
Your Super Simple and Fun Ideas (Numbered List Only, tiny words, one sentence each):
"""
        return prompt

    # --- NEW Suggestion Service Method --- 
    async def suggest_modifications(self, current_html: str) -> List[str]:
        """Calls the AI to get modification suggestions for the given HTML."""
        logger.info(f"Requesting modification suggestions for HTML (length: {len(current_html)})...")
        prompt = self._create_suggestion_prompt(current_html)
        suggestions = []

        if not self.client:
            logger.error("Gemini client not initialized. Cannot get suggestions.")
            return ["Error: AI client not available."]

        try:
            # Use the standard generate_content for a non-streaming response
            # We'll use the retry wrapper but expect only one result chunk essentially
            full_response = ""
            # Use _call_gemini_api directly for non-streaming, parse response
            # We need the non-async generate_content or adapt _call_gemini_api
            # Let's adapt _call_gemini_api to handle non-streaming internally or make a sync version?
            # For now, let's assume _call_gemini_with_retry returns the full string if stream=False (needs change)
            # OR aggregate the stream here.
            
            # Aggregate stream approach:
            async for chunk in self._call_gemini_with_retry(prompt, max_retries=1): 
                 if "<!-- ERROR:" in chunk:
                    logger.error(f"Error signaled during suggestion generation: {chunk}")
                    raise Exception(f"AI error during suggestion generation: {chunk}")
                 full_response += chunk
            
            # Ensure the full response is processed *after* the loop finishes
            if not full_response:
                logger.warning("Received empty response from AI for suggestions.")
                return ["No suggestions available at this time."]

            logger.info(f"Raw suggestion response received (length: {len(full_response)})")
            
            # Parse the numbered list (simple regex approach)
            raw_suggestions = re.findall(r"^\d+\.\s+(.*)", full_response, re.MULTILINE)
            suggestions = [s.strip() for s in raw_suggestions if s.strip()]
            
            if not suggestions:
                logger.warning("Could not parse numbered list from suggestion response.")
                logger.debug(f"Failed to parse suggestions from: {full_response}") # Log raw response on failure
                return ["No suggestions available at this time."] 

            logger.info(f"Parsed {len(suggestions)} suggestions.")
            return suggestions
        
        except Exception as e:
            logger.exception(f"Error getting modification suggestions: {e}")
            return [f"Error generating suggestions: {e}"]

    # --- New method for UI generation with files ---
    def _read_prompt_template(self) -> str:
        """Helper to read the main prompt template."""
        # This path assumes service.py is in backend/components/ and template is in backend/
        template_path = os.path.join(os.path.dirname(__file__), "..", "gemini_prompt_template_wc.md")
        try:
            with open(template_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template file not found at {template_path}")
            return "<!-- ERROR: Prompt template file not found. Cannot generate UI. -->"
        except Exception as e:
            logger.error(f"Error reading prompt template file {template_path}: {e}")
            return f"<!-- ERROR: Could not read prompt template: {e} -->"

    # --- NEW: Security Scanning and Correction ---
    def _scan_for_unsafe_patterns(self, html_content: str) -> List[str]:
        """Scans HTML content for potentially unsafe patterns."""
        issues_found = [] 
        # Regex to find eval\s*\( (eval followed by optional spaces and opening parenthesis)
        if re.search(r"eval\s*\(", html_content, re.IGNORECASE):
            issues_found.append("Detected use of 'eval()'.")
        
        # Regex to find very long base64 strings (e.g., > 1KB) inside <script> tags
        # This looks for data:[mime_type];base64,[A-Za-z0-9+/=]{1000,}
        # It specifically looks for it *within* <script>...</script> blocks
        script_pattern = r"<script[^>]*>(.*?)</script>"
        long_base64_pattern = r"data:[a-zA-Z0-9\/\.\+\-]*;base64,([A-Za-z0-9\+\/\=]{1024,})"

        for match in re.finditer(script_pattern, html_content, re.DOTALL | re.IGNORECASE):
            script_content = match.group(1)
            if re.search(long_base64_pattern, script_content):
                issues_found.append("Detected excessively long Base64 string embedded in a script tag. This is often for audio or large data and should be avoided. Use Web Audio API for simple sounds or ensure media is appropriately linked, not embedded in scripts.")
                # No need to find all instances, one is enough to trigger correction for this type.
                break

        # Add other security checks here as needed
        return issues_found

    def _create_security_correction_prompt(
        self,
        original_full_prompt: str, # The very first prompt from the user to the generation service
        original_html_response: str, # The AI's first unsafe response
        issues_detected: List[str]
    ) -> str:
        """Creates a prompt to ask the AI to correct its previous unsafe response."""
        issues_string = "\n".join([f"- {issue}" for issue in issues_detected])
        # Construct a new prompt for the AI to correct itself.
        # It's crucial to give it the original request and its problematic response.
        correction_prompt = (
            f"Your previous HTML generation attempt had some security/best-practice issues. "
            f"Please review your previous response and the original user request, then regenerate the HTML, fixing the identified problems.\n\n"
            f"The following issues were detected in your previous HTML output:\n"
            f"{issues_string}\n\n"
            f"Specific guidance for correction:\n"
            f"- If 'eval()' was used: REMOVE ALL USES OF 'eval()'. If it was for mathematical expressions, you MUST implement a JavaScript function to parse and compute the result (e.g., using shunting-yard or similar, or for very simple cases, `new Function('return ' + expressionString)()` as a last resort). DO NOT simply comment out 'eval'. Rewrite the logic to be safe. Do not mention 'eval' in comments."
            f"- If an excessively long Base64 string was embedded in a script (often for audio/data): REMOVE the embedded Base64 string. If it was for a simple sound, use the Web Audio API (`AudioContext`) to generate a tone programmatically. For other large data, this embedding method is inappropriate. Do not simply comment it out. Find an alternative, standards-compliant way to achieve the original goal without embedding large data directly in scripts.\n"
            f"- Adhere STRICTLY to all original formatting and generation rules, especially regarding NO MARKDOWN and PURE HTML output.\n\n"
            f"Original User Request was:\n---BEGIN ORIGINAL USER REQUEST---\n{original_full_prompt}\n---END ORIGINAL USER REQUEST---\n\n"
            f"Your Previous (Problematic) HTML Output was:\n---BEGIN PREVIOUS HTML OUTPUT---\n{original_html_response}\n---END PREVIOUS HTML OUTPUT---\n\n"
            f"Now, provide the new, corrected, FULL HTML output. REMEMBER: PURE HTML ONLY, starting with <!DOCTYPE html> and ending with </html>."
        )
        return correction_prompt

    async def generate_ui_from_prompt_and_files(
        self,
        text_prompt: str,
        uploaded_files_info: List[Dict[str, Any]],
        gemini_file_objects: List[Any], # List of Gemini SDK File objects (e.g., from client.files.upload)
        user: Any, # Assuming User model from main.py (or a relevant part of it)
        enable_grounding: bool = False
    ):
        logger.info(f"generate_ui_from_prompt_and_files called by user '{user.username if hasattr(user, 'username') and user.username else 'Unknown'}'.")
        logger.info(f"Text prompt (first 200 chars): {text_prompt[:200]}...")
        logger.info(f"Number of uploaded_files_info entries: {len(uploaded_files_info)}")
        logger.info(f"Number of Gemini SDK file objects passed: {len(gemini_file_objects)}")

        files_json_array = []
        for file_info in uploaded_files_info:
            file_obj = {
                "id": file_info.get("id", file_info.get("name")),
                "name": file_info.get("name"),
                "mime_type": file_info.get("mime_type"),
                "size": file_info.get("size"),
            }
            if file_info.get("gemini_uri"):
                file_obj["gemini_uri"] = file_info["gemini_uri"]
            if file_info.get("content_data_url"):
                file_obj["content_data_url"] = file_info["content_data_url"]
            if file_info.get("text_content"):
                file_obj["text_content"] = file_info["text_content"]
            files_json_array.append(file_obj)
        files_json_str = json.dumps(files_json_array, indent=2)
        files_context_string = f"\n\n--- Uploaded Files Information (Context for AI) ---\n// uploaded_files:\n{files_json_str}\n--- End Uploaded Files Information ---\n"

        combined_user_request_with_file_context = f"{text_prompt}\n{files_context_string}"

        main_textual_prompt_part = self._create_full_code_prompt(combined_user_request_with_file_context)
        gemini_api_contents = [main_textual_prompt_part]
        if gemini_file_objects:
            for sdk_file_obj in gemini_file_objects:
                gemini_api_contents.append(sdk_file_obj)
        logger.info(f"Constructed Gemini API contents for initial generation. Main text part length: {len(main_textual_prompt_part)}, Number of SDK file objects: {len(gemini_file_objects)}")

        # --- MODIFIED FOR STREAMING BEFORE SECURITY SCAN ---
        full_initial_html_for_scan = ""
        initial_generation_failed = False

        # Phase 1: Stream the initial generation and accumulate for scan
        logger.info("Phase 1: Streaming initial generation and accumulating for security scan.")
        # yield "<!-- MORPHEO_INITIAL_STREAM_START -->" # Frontend may not need this if it starts on first chunk

        async for chunk in self._call_gemini_with_retry(
            contents=gemini_api_contents,
            enable_grounding=enable_grounding
        ):
            if "<!-- ERROR:" in chunk:
                initial_generation_failed = True
                logger.error(f"Initial generation failed or returned an error during stream: {chunk}")
                full_initial_html_for_scan += chunk 
                yield chunk 
                break 

            full_initial_html_for_scan += chunk
            yield chunk 
            # The asyncio.sleep(0) is already in _call_gemini_api for its sub-chunks.
            # Adding another one here might be redundant or slightly alter pacing.
            # Let's rely on the sleeps in _call_gemini_api.

        # yield "<!-- MORPHEO_INITIAL_STREAM_END -->" # Frontend can detect stream end by server closing connection

        if initial_generation_failed:
            logger.error("Initial generation phase ended with an error. Skipping security checks.")
            return

        # Phase 2: Security Scan and Correction (if needed) - This part sends signals *after* initial stream.
        logger.info("Phase 2: Performing security scan on accumulated initial HTML.")
        detected_issues = self._scan_for_unsafe_patterns(full_initial_html_for_scan)
        
        if detected_issues:
            logger.info(f"Unsafe patterns found. Issues: {detected_issues}. Attempting correction.")
            yield "<!-- MORPHEO_SECURITY_CORRECTION_START -->"
            
            corrected_html_accumulator = ""
            correction_prompt_text = self._create_security_correction_prompt(main_textual_prompt_part, full_initial_html_for_scan, detected_issues)
            correction_api_contents = [correction_prompt_text]

            correction_failed = False
            async for correction_chunk in self._call_gemini_with_retry(
                contents=correction_api_contents,
                enable_grounding=False
            ):
                if "<!-- ERROR:" in correction_chunk:
                    correction_failed = True
                    logger.error(f"Security correction call failed or returned an error during stream: {correction_chunk}")
                    # corrected_html_accumulator += correction_chunk # Don't accumulate error if we're not sending it
                    yield correction_chunk # Yield error from correction attempt
                    break
                corrected_html_accumulator += correction_chunk
            
            if correction_failed:
                logger.error("Correction phase failed. Original (potentially unsafe) streamed content remains on client.")
                yield "<!-- MORPHEO_SECURITY_CORRECTION_FAILED_AI_ERROR -->"
            else:
                final_issues_after_correction = self._scan_for_unsafe_patterns(corrected_html_accumulator)
                if not final_issues_after_correction:
                    logger.info("Security correction successful. No unsafe patterns found in corrected code.")
                    # Signal frontend to replace its content.
                    yield "<!-- MORPHEO_REPLACE_WITH_CORRECTED_START -->"
                    corrected_chunk_size = 128 
                    for i in range(0, len(corrected_html_accumulator), corrected_chunk_size):
                        yield corrected_html_accumulator[i:i+corrected_chunk_size]
                        await asyncio.sleep(0) # Ensure chunks are flushed for the replacement stream
                    yield "<!-- MORPHEO_REPLACE_WITH_CORRECTED_END -->"
                else:
                    logger.warning(f"Security correction attempted, but issues persist: {final_issues_after_correction}. Original streamed content remains on client.")
                    warning_message = f"<!-- MORPHEO_SECURITY_WARNING: Automated correction attempted, but issues may persist in the already streamed content: {', '.join(final_issues_after_correction)} -->"
                    yield warning_message
            
            yield "<!-- MORPHEO_SECURITY_CORRECTION_END -->"
        else:
            logger.info("No security issues detected in initial generation.")
            # Optionally send: yield "<!-- MORPHEO_SECURITY_CHECKS_PASSED -->"

        # --- END MODIFICATION FOR STREAMING BEFORE SECURITY SCAN ---

    async def modify_ui_from_prompt_and_files(
        self,
        modification_prompt: str,
        current_html: str,
        uploaded_files_info: List[Dict[str, Any]],
        gemini_file_objects: List[Any], # List of Gemini SDK File objects
        user: Any, 
        enable_grounding: bool = False
    ) -> AsyncGenerator[str, None]:
        logger.info(f"modify_ui_from_prompt_and_files called by user '{user.username if hasattr(user, 'username') and user.username else 'Unknown'}'.")
        logger.info(f"Modification prompt (first 200 chars): {modification_prompt[:200]}...")
        logger.info(f"Number of uploaded_files_info entries: {len(uploaded_files_info)}")
        logger.info(f"Number of Gemini SDK file objects passed: {len(gemini_file_objects)}")

        # Prepare file information string for the prompt context
        uploaded_files_summary = "// uploaded_files:\n"
        if uploaded_files_info:
             try:
                 file_info_json = json.dumps(uploaded_files_info, indent=2)
                 uploaded_files_summary += file_info_json
             except Exception as e:
                 logger.error(f"Error converting file info to JSON: {e}")
                 uploaded_files_summary += "[Error processing file details]"
        else:
             uploaded_files_summary += "[]"

        # --- MODIFICATION START ---
        # Combine the user's modification prompt with the file context
        combined_modification_request = f"{modification_prompt}\n\n--- Uploaded Files Information (Context for AI) ---\n{uploaded_files_summary}\n--- End Uploaded Files Information ---"

        # Use the correct prompt creation method for modifications
        full_prompt_text = self._create_modification_prompt(
            modification_request=combined_modification_request, # Pass the combined text
            current_html=current_html
        )
        # --- MODIFICATION END ---

        # Prepare the 'contents' list for the Gemini API call
        contents_for_api: List[Union[str, Any]] = [full_prompt_text]
        if gemini_file_objects:
            contents_for_api.extend(gemini_file_objects)
        
        logger.info(f"Constructed Gemini API contents for modification. Main text part length: {len(full_prompt_text)}, Number of SDK file objects: {len(gemini_file_objects)}")

        # --- MODIFIED FOR SECURITY SCAN AND CORRECTION (mirroring generation flow) ---
        full_initial_modified_html_for_scan = ""
        initial_modification_failed = False

        # Phase 1: Stream the initial modification and accumulate for scan
        logger.info("Phase 1 (Modification): Streaming initial modification and accumulating for security scan.")
        
        async for chunk in self._call_gemini_with_retry(
            contents=contents_for_api,
            enable_grounding=enable_grounding
        ):
            if "<!-- ERROR:" in chunk:
                initial_modification_failed = True
                logger.error(f"Initial modification failed or returned an error during stream: {chunk}")
                full_initial_modified_html_for_scan += chunk
                yield chunk
                break
            
            full_initial_modified_html_for_scan += chunk
            yield chunk
            # asyncio.sleep(0) is in _call_gemini_api

        if initial_modification_failed:
            logger.error("Initial modification phase ended with an error. Skipping security checks.")
            return

        # Phase 2: Security Scan and Correction (if needed)
        logger.info("Phase 2 (Modification): Performing security scan on accumulated initial modified HTML.")
        detected_issues = self._scan_for_unsafe_patterns(full_initial_modified_html_for_scan)

        if detected_issues:
            logger.info(f"Unsafe patterns found in modification. Issues: {detected_issues}. Attempting correction.")
            yield "<!-- MORPHEO_SECURITY_CORRECTION_START -->"
            
            corrected_html_accumulator = ""
            # Use the same correction prompt creation logic
            correction_prompt_text = self._create_security_correction_prompt(main_textual_prompt_part, full_initial_modified_html_for_scan, detected_issues)
            # For modifications, the correction is just text-based, no extra files needed.
            correction_api_contents = [correction_prompt_text] 

            correction_failed = False
            async for correction_chunk in self._call_gemini_with_retry(
                contents=correction_api_contents, # Pass the simple list with correction prompt
                enable_grounding=False # Grounding usually not needed for correction
            ):
                if "<!-- ERROR:" in correction_chunk:
                    correction_failed = True
                    logger.error(f"Security correction call (for modification) failed or returned an error: {correction_chunk}")
                    yield correction_chunk 
                    break
                corrected_html_accumulator += correction_chunk
            
            if correction_failed:
                logger.error("Correction phase (for modification) failed. Original (potentially unsafe) streamed modification remains.")
                yield "<!-- MORPHEO_SECURITY_CORRECTION_FAILED_AI_ERROR -->"
            else:
                final_issues_after_correction = self._scan_for_unsafe_patterns(corrected_html_accumulator)
                if not final_issues_after_correction:
                    logger.info("Security correction successful for modification.")
                    yield "<!-- MORPHEO_REPLACE_WITH_CORRECTED_START -->"
                    corrected_chunk_size = 128
                    for i in range(0, len(corrected_html_accumulator), corrected_chunk_size):
                        yield corrected_html_accumulator[i:i+corrected_chunk_size]
                        await asyncio.sleep(0) 
                    yield "<!-- MORPHEO_REPLACE_WITH_CORRECTED_END -->"
                else:
                    logger.warning(f"Security correction attempted for modification, but issues persist: {final_issues_after_correction}.")
                    warning_message = f"<!-- MORPHEO_SECURITY_WARNING: Automated correction attempted for modification, but issues may persist: {', '.join(final_issues_after_correction)} -->"
                    yield warning_message
            
            yield "<!-- MORPHEO_SECURITY_CORRECTION_END -->"
        else:
            logger.info("No security issues detected in initial modification.")
            # Optionally: yield "<!-- MORPHEO_SECURITY_CHECKS_PASSED_MODIFICATION -->"
        
        logger.info("Finished yielding modification chunks (with potential security correction).")
        # --- END SECURITY SCAN AND CORRECTION FOR MODIFICATION ---

def ensure_prompt_template_exists(template_path: str, fallback_content: str):
    """Checks if a prompt template file exists, creates it with fallback content if not."""
    if not os.path.exists(template_path):
        logger.warning(f"Prompt template not found at {template_path}. Creating with basic fallback content.")
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(template_path), exist_ok=True)
            with open(template_path, "w", encoding="utf-8") as f:
                f.write(fallback_content)
            logger.info(f"Successfully created prompt template: {template_path}")
        except Exception as e:
            logger.error(f"Failed to create prompt template file at {template_path}: {e}")

# Ensure the new Web Component prompt template exists on startup
wc_template_fallback = (
    "You are an expert AI assistant specializing in modern, accessible web development using standard technologies.\n"
    "\n"
    "Generate a COMPLETE, runnable, self-contained HTML file (.html) that fulfills the user request below.\n"
    "\n"
    "ABSOLUTE REQUIREMENTS:\n"
    "\n"
    "0.  **No Placeholders or Excuses:** Attempt the full implementation. Do NOT output placeholder UIs or messages stating the task is too complex.\n"
    "1.  **DOCTYPE & HTML Structure:** Start with `<!DOCTYPE html>` and include `<html>`, `<head>`, and `<body>` tags.\n"
    "2.  **Styling:** Use standard CSS within `<style>` tags in the `<head>`. \n"
    "    Optionally, you can use Tailwind CSS classes IF you include the Tailwind CDN script in the `<head>`: `<script src=\"https://cdn.tailwindcss.com\"></script>`. \n"
    "    Prioritize clean, responsive design.\n"
    "3.  **Structure & Interactivity:** Use standard HTML elements. For reusable UI parts and complex logic, DEFINE and USE **Standard Web Components** (using `customElements.define`, `<template>`, and vanilla JavaScript classes extending `HTMLElement`).\n"
    "4.  **JavaScript:** Prioritize vanilla JS within `<script>` tags for basic interactivity. \n"
    "    - Use standard DOM APIs (`getElementById`, `querySelector`, `addEventListener`, etc.).\n"
    "    - **External Libraries:** For complex features (e.g., 3D graphics, advanced charting), you **MUST** actively use well-known external JavaScript libraries. **Use Import Maps** in the `<head>` when using ES Module libraries (like Three.js). Define the library (e.g., `\"three\"`) and addon paths (e.g., `\"three/addons/\"`) mapping to reliable CDN URLs (e.g., from cdnjs, jsdelivr, using `.module.js` files). Remove the `<script src=...>` tags for mapped libraries. In your `<script type=\"module\">`, use `import * as THREE from 'three';` and `import { OrbitControls } from 'three/addons/controls/OrbitControls.js';`. You **MUST** use libraries for complex tasks where vanilla JS is impractical. \n"
    "5.  **Self-Contained:** The final output MUST be a SINGLE HTML file. No external CSS files (other than Tailwind CDN). External JavaScript libraries are permissible if included via CDN `<script>` tags or referenced via Import Maps. \n"
    "6.  **Output Format:** Return ONLY the raw HTML code. NO markdown formatting (like ```html ... ```), explanations, or comments outside the code itself.\n"
    "7.  **Print Optimization:** Include print-specific CSS rules (`@media print`) to optimize the layout for printing or saving as PDF. Hide non-essential interactive elements (like buttons, input forms), ensure content fits standard paper sizes (like A4/Letter) with appropriate margins, use high-contrast text (e.g., black text on a white background regardless of screen theme), and manage page breaks appropriately (`page-break-before`, `page-break-after`, `page-break-inside: avoid`) for long content.\n"
)
wc_template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gemini_prompt_template_wc.md')
ensure_prompt_template_exists(wc_template_path, wc_template_fallback)