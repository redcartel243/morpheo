## Map Application Generator

⚠️ **CRITICAL REQUIREMENT: YOU MUST USE THE DIRECT MAP COMPONENT IN YOUR RESPONSE** ⚠️

Generate a complete map-based application configuration using our built-in map component.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Map Application Name",
    "description": "Brief description of the map application",
    "theme": "custom"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "main", "footer"]
  },
  "components": [
    {
      "id": "header-title",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "Map Title Here",
        "variant": "h3"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px"
      }
    },
    {
      "id": "barcelona-map",
      "type": "map",
      "region": "main",
      "properties": {
        "center": { "lat": 41.3851, "lng": 2.1734 },
        "zoom": 13,
        "markers": [
          {
            "position": { "lat": 41.3851, "lng": 2.1734 },
            "title": "City Center"
          },
          {
            "position": { "lat": 41.4036, "lng": 2.1744 },
            "title": "Sagrada Familia"
          }
        ],
        "interactive": true
      },
      "styles": {
        "height": "500px",
        "width": "100%",
        "borderRadius": "8px"
      },
      "methods": {
        "onMarkerClick": "function(event, $m) { console.log('Marker clicked:', event.detail); }"
      }
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "Map data © 2023",
        "variant": "body2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "10px",
        "color": "#777"
      }
    }
  ]
}
```

### ⚠️ CRITICAL REQUIREMENTS - READ CAREFULLY: ⚠️

1. **DO NOT use a container with a placeholder text** element for the map. This approach WILL NOT WORK.
2. **YOU MUST include a direct map component** with type "map" in the components array.
3. **The map component MUST include** these properties:
   - center: Coordinates as {lat: number, lng: number}
   - zoom: A number between 1-20
   - markers: An array of marker objects with position and title
   - interactive: true

### INCORRECT APPROACH (DO NOT USE):
```json
"components": [
  {
    "id": "map-container", 
    "type": "container",
    "children": [
      {
        "id": "map-placeholder",
        "type": "text", 
        "properties": {"content": "Map will be loaded here"}
      }
    ]
  }
]
```

### CORRECT APPROACH (MUST USE):
```json
"components": [
  {
    "id": "barcelona-map",
    "type": "map",
    "properties": {
      "center": { "lat": 41.3851, "lng": 2.1734 },
      "zoom": 13,
      "markers": [
        {"position": { "lat": 41.3851, "lng": 2.1734 }, "title": "Barcelona Center"}
      ],
      "interactive": true
    }
  }
]
```

Remember to also include appropriate UI elements like search inputs or location lists that interact with the map through our state management system.

Generate the complete configuration in valid JSON format without any extra explanation. 