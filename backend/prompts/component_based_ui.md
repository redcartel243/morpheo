## Component-Based UI Generation

Generate a complete UI configuration for the requested app type. The configuration should be in JSON format and include the following components:

1. app - Basic app information (name, description)
2. layout - Layout structure with regions
3. components - UI components that make up the interface
4. theme (optional) - Custom theme settings

Make sure the configuration is well-structured and follows best practices for component-based architecture.

### Component Types
The application supports these component types:

#### Basic Components:
- text: Display text content (headings, paragraphs)
- button: Interactive button elements
- text-input: Text input fields
- checkbox: Checkbox input elements
- image: Image display

#### Layout Components:
- container/div: Generic container elements
- card: Card container with optional title
- grid: Grid layout with configurable columns
- list: List of items with various styles

#### Visualization Components:
- chart: Data visualization with various chart types (bar, line, pie, etc.)
- datatable: Interactive data tables with sorting and filtering
- map: Interactive map component with markers and events

### Visualization Component Details

#### Map Component
The map component provides an interactive map with markers and event handling:

```json
{
  "id": "location-map",
  "type": "map",
  "region": "main",
  "properties": {
    "center": { "lat": 40.7128, "lng": -74.0060 }, // Initial center coordinates
    "zoom": 12, // Initial zoom level
    "markers": [ // Optional array of markers
      {
        "position": { "lat": 40.7128, "lng": -74.0060 },
        "title": "New York"
      }
    ],
    "interactive": true // Whether the map allows user interaction
  },
  "styles": {
    "height": "500px", // Map container height
    "borderRadius": "8px" // Optional styling
  },
  "events": {
    "mapMoved": {
      "action": "updateMapCenter",
      "params": {}
    },
    "mapZoomed": {
      "action": "updateMapZoom",
      "params": {}
    },
    "markerClicked": {
      "action": "selectLocation",
      "params": {}
    }
  }
}
```

#### Chart Component
The chart component visualizes data with various chart types:

```json
{
  "id": "data-chart",
  "type": "chart",
  "region": "main",
  "properties": {
    "type": "bar", // Chart type: bar, line, pie, doughnut, area, scatter
    "data": {
      "labels": ["Category 1", "Category 2", "Category 3"], 
      "series": [
        {
          "label": "Series 1",
          "data": [10, 20, 30],
          "backgroundColor": "#3b82f6"
        }
      ]
    },
    "title": "Sample Chart",
    "xAxisLabel": "Categories",
    "yAxisLabel": "Values",
    "showLegend": true
  },
  "styles": {
    "height": "400px",
    "width": "100%"
  }
}
```

#### DataTable Component
The datatable component provides an interactive data table:

```json
{
  "id": "data-table",
  "type": "datatable",
  "region": "main",
  "properties": {
    "data": [
      { "id": 1, "name": "Item 1", "value": 100 },
      { "id": 2, "name": "Item 2", "value": 200 }
    ],
    "columns": [
      { "field": "id", "headerName": "ID", "width": 70 },
      { "field": "name", "headerName": "Name", "width": 200 },
      { "field": "value", "headerName": "Value", "width": 100 }
    ],
    "pageSize": 10,
    "sortable": true,
    "filterable": true,
    "selectable": false
  },
  "styles": {
    "height": "400px",
    "width": "100%"
  }
}
```

### State Management

For state-driven components, use the following pattern for event handling:

```json
"events": {
  "onClick": {
    "action": "updateState",
    "params": {
      "key": "value"
    }
  }
}
```

No backend services are required - the application uses built-in state management.

Generate the complete configuration in valid JSON format. 