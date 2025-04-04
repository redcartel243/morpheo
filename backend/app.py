from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ai_integration import MapProcessorMiddleware

app = FastAPI()

# Import AI service - use try/except to handle potential import errors
try:
    from services.ai_service import AIService
    ai_service = AIService()
except ImportError:
    print("Warning: AIService import failed. Using dummy implementation.")
    # Dummy implementation for testing
    class AIService:
        def generate(self, prompt):
            return f"AI Service would process: {prompt}"
    ai_service = AIService()

# Import our map processing functions
try:
    from prompts.preprocess_map_prompt import preprocess_map_request
    from prompts.map_post_processor import fix_map_configuration
    MAP_PROCESSORS_AVAILABLE = True
except ImportError:
    print("Warning: Map processors not available. Map component fixes will be disabled.")
    MAP_PROCESSORS_AVAILABLE = False
    
    # Define dummy functions
    def preprocess_map_request(request_text):
        return request_text
        
    def fix_map_configuration(config_json):
        return config_json

class PromptRequest(BaseModel):
    prompt: str

@app.post("/api/generate")
async def generate(request: PromptRequest):
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        # Process prompt using the map processor middleware
        processed_prompt = MapProcessorMiddleware.process_prompt(request.prompt)
        
        # Generate response with AI service
        response = ai_service.generate(processed_prompt)
        
        # Process the response for map-related fixes
        processed_response = MapProcessorMiddleware.process_response(response)
        
        return {"response": processed_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 