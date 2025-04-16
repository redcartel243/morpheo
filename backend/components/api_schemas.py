# backend/components/api_schemas.py
# Simplified schemas for Gemini API to avoid recursion errors
# We will validate the actual response against the full schemas in schemas.py later.

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# --- Simplified Action/Method Schemas --- 
# Use Dict[str, Any] for actions within methods and IF blocks 
# to break the deep recursion for the API schema processor.

class ApiIfAction(BaseModel):
    # Simplified IF Action - expects lists of generic dicts for then/else
    type: str # Keep type loose for the API schema
    condition: Dict[str, Any] # Keep condition definition loose
    then: List[Dict[str, Any]] 
    else_branch: Optional[List[Dict[str, Any]]] = Field(None, alias='else')
    
class ApiComponentChild(BaseModel):
    id: str
    type: str
    region: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    styles: Optional[Dict[str, Any]] = None
    # Key change: Expect a list of generic dicts for actions
    methods: Optional[Dict[str, List[Dict[str, Any]]]] = None 
    children: Optional[List['ApiComponentChild']] = None # Still recursive here

class ApiAddComponentAction(BaseModel):
    # Simplified ADD_COMPONENT - references simplified child
    type: str
    parentId: str
    config: ApiComponentChild 
    assignIdTo: Optional[str] = None
    
# --- Main Configuration Structure (using simplified child) ---

class ApiAppComponent(BaseModel):
    name: str
    description: str
    theme: str

class ApiLayoutComponent(BaseModel):
    type: str
    regions: List[str]

class ApiAppConfig(BaseModel):
    app: ApiAppComponent
    layout: ApiLayoutComponent
    components: List[ApiComponentChild]

# Update forward references for the simplified recursive models
ApiComponentChild.model_rebuild()

print("Defined simplified Pydantic API schemas.") 