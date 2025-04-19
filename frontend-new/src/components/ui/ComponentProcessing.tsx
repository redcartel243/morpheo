// Add code here only if file exists 

export function processComponentStructure(component: any): ComponentChild {
  // Ensure basic structure
  const processed: ComponentChild = {
    id: component.id || `comp-${Math.random().toString(36).substring(2, 9)}`,
    type: mapComponentType(component.type || 'container'),
    // Merge props and properties, giving 'properties' higher precedence
    properties: { ...(component.props || {}), ...(component.properties || {}) }, 
    // Ensure styles are always an object, merge if necessary
    styles: { ...(component.props?.style || {}), ...(component.styles || {}) },
    methods: component.methods || {},
    events: component.events || {},
    region: component.region,
    key: component.key || component.id || `comp-${Math.random().toString(36).substring(2, 9)}`
  };
  
  // Log the final processed component properties and styles
  console.log(`[ProcessComponentStructure] Final processed props for ${processed.id}:`, processed.properties);
  console.log(`[ProcessComponentStructure] Final processed styles for ${processed.id}:`, processed.styles);

  // Recursively process children if they exist
  if (Array.isArray(component.children)) {
    processed.children = component.children.map(child => 
      typeof child === 'string' ? child : processComponentStructure(child)
    );
  } else {
    processed.children = [];
  }

  return processed;
} 