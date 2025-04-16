# backend/components/schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union, Literal

# --- Value Representation ---

class LiteralValue(BaseModel):
    type: Literal["LITERAL"]
    value: Union[str, int, float, bool, None]

class VariableValue(BaseModel):
    type: Literal["VARIABLE"]
    name: str

class ContextValue(BaseModel):
    type: Literal["CONTEXT"]
    path: Literal["selfId", "parentId", "event"]

class PropertyRefValue(BaseModel):
    type: Literal["PROPERTY_REF"]
    targetId: str
    propertyName: str
    
# Using EXPRESSION is discouraged due to security risks, but included for completeness if needed later.
# We might want to remove or strictly limit this.
# class ExpressionValue(BaseModel):
#     type: Literal["EXPRESSION"]
#     code: str # The JS expression string - USE WITH EXTREME CAUTION

# Union type for any valid value representation
Value = Union[
    LiteralValue, 
    VariableValue, 
    ContextValue, 
    PropertyRefValue, 
    # ExpressionValue # Excluded for now
    # Allow raw literals as well for simplicity? Might complicate schema enforcement.
    # str, int, float, bool, None 
]

# --- Condition Representation ---

class BaseCondition(BaseModel):
    # Base model for conditions, specific types inherit from this
    pass

class ComparisonCondition(BaseCondition):
    type: Literal["EQUALS", "NOT_EQUALS", "GREATER_THAN", "GREATER_THAN_EQUALS", "LESS_THAN", "LESS_THAN_EQUALS"]
    left: Value
    right: Value

class TruthyCondition(BaseCondition):
    type: Literal["TRUTHY"]
    value: Value
    
class FalsyCondition(BaseCondition):
    type: Literal["FALSY"]
    value: Value

class LogicalCondition(BaseCondition):
    type: Literal["AND", "OR"]
    conditions: List['Condition'] # Forward reference

class NotCondition(BaseCondition):
    type: Literal["NOT"]
    condition: 'Condition' # Forward reference
    
# Union type for any valid condition
Condition = Union[
    ComparisonCondition, 
    TruthyCondition,
    FalsyCondition,
    LogicalCondition, 
    NotCondition
]

# Update forward references for conditions within Logical/Not conditions
LogicalCondition.model_rebuild()
NotCondition.model_rebuild()


# --- Action Representation ---

class BaseAction(BaseModel):
    # Base model for actions
    pass

class GetPropertyAction(BaseAction):
    type: Literal["GET_PROPERTY"]
    targetId: str
    propertyName: str
    assignTo: str
    
class SetPropertyAction(BaseAction):
    type: Literal["SET_PROPERTY"]
    targetId: str
    propertyName: str
    value: Value

class GetEventDataAction(BaseAction):
    type: Literal["GET_EVENT_DATA"]
    path: str
    assignTo: str

class SetVariableAction(BaseAction):
    type: Literal["SET_VARIABLE"]
    variableName: str
    value: Value

class AddComponentAction(BaseAction):
    type: Literal["ADD_COMPONENT"]
    parentId: str
    config: 'ComponentChild' # Forward reference to the main component schema
    assignIdTo: Optional[str] = None

class RemoveComponentAction(BaseAction):
    type: Literal["REMOVE_COMPONENT"]
    targetId: Union[str, Value] # Can be a direct ID string or a value object resolving to one

class UpdateComponentAction(BaseAction):
    type: Literal["UPDATE_COMPONENT"]
    targetId: str
    updates: Dict[str, Any] # Keep simple for now, could be more specific (e.g., properties: Dict, styles: Dict)

class CallMethodAction(BaseAction):
    type: Literal["CALL_METHOD"]
    targetId: str
    methodName: str
    args: Optional[List[Value]] = None
    assignTo: Optional[str] = None # If method returns a value

class IfAction(BaseAction):
    type: Literal["IF"]
    condition: Condition
    then: List['Action'] # Forward reference to Action union
    else_branch: Optional[List['Action']] = Field(None, alias='else') # Allow 'else' as alias

class GenerateIdAction(BaseAction):
    type: Literal["GENERATE_ID"]
    assignTo: str

class LogAction(BaseAction):
    type: Literal["LOG"]
    message: Union[str, Value] # Can log a literal string or a resolved value

# Union type for any valid action
Action = Union[
    GetPropertyAction,
    SetPropertyAction,
    GetEventDataAction,
    SetVariableAction,
    AddComponentAction,
    RemoveComponentAction,
    UpdateComponentAction,
    CallMethodAction,
    IfAction,
    GenerateIdAction,
    LogAction
]

# --- Main Configuration Structure ---

class AppComponent(BaseModel):
    name: str
    description: str
    theme: str

class LayoutComponent(BaseModel):
    type: str
    regions: List[str]

class ComponentChild(BaseModel):
    id: str
    type: str
    region: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    styles: Optional[Dict[str, Any]] = None
    methods: Optional[Dict[str, List[Action]]] = None # Methods map to lists of IR Actions
    children: Optional[List['ComponentChild']] = None # Recursive definition

class AppConfig(BaseModel):
    app: AppComponent
    layout: LayoutComponent
    components: List[ComponentChild]

# Update forward references for recursive models
ComponentChild.model_rebuild()
AddComponentAction.model_rebuild() # Action referencing ComponentChild
IfAction.model_rebuild() # Action referencing Action

print("Defined Pydantic schemas for structured output.") 