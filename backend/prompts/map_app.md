## Map Application Generator

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
      "id": "location-map",
      "type": "map",
      "region": "main",
      "properties": {
        "center": { "lat": 41.3851, "lng": 2.1734 }, // Barcelona coordinates
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
        ]
      },
      "styles": {
        "height": "500px",
        "width": "100%",
        "borderRadius": "8px"
      },
      "events": {
        "mapMoved": {
          "action": "updateMapView",
          "params": {}
        },
        "markerClicked": {
          "action": "showLocationDetails",
          "params": {}
        }
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

Important requirements:
1. ALWAYS include the complete structure with app, layout, and components sections
2. DO NOT include any backend services or API configurations - our map component works with client-side state only
3. DO NOT use a div with an id of "map" - use the proper map component type with "type": "map"
4. Include coordinates for the requested location 
5. Add appropriate markers for key points of interest
6. Use map events for interactions with the UI
7. Include header and footer regions with appropriate text components

Remember to also include appropriate UI elements like search inputs or location lists that interact with the map through our state management system.

Generate the complete configuration in valid JSON format without any extra explanation. 