# Visualization Components

This directory contains the visualization components for the Morpheo framework. These components provide a versatile way to display data in various formats.

## Components

### 1. Map Component

The Map component uses OpenStreetMap with Leaflet to display geographic information. It's a free and open-source alternative to Google Maps.

**Features:**
- Displays markers at specific locations
- Supports zoom and pan controls
- Provides event handling for map interactions
- Customizable styling options
- Responsive design that works across devices

**Usage Example:**
```jsx
<Map 
  center={{ lat: 41.3851, lng: 2.1734 }} // Barcelona
  zoom={13}
  markers={[
    { position: { lat: 41.3851, lng: 2.1734 }, title: "Barcelona" }
  ]}
  handleEvent={(eventType, payload) => console.log(eventType, payload)}
/>
```

### 2. Chart Component

The Chart component uses Chart.js to create various types of data visualizations.

**Features:**
- Supports multiple chart types: bar, line, pie, doughnut, area, scatter
- Customizable colors, labels, and styles
- Responsive design
- Animation support
- Legend and title options

**Usage Example:**
```jsx
<Chart 
  type="bar"
  data={{
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    series: [
      {
        label: "Revenue",
        data: [50, 60, 70, 180, 190]
      }
    ]
  }}
  title="Monthly Revenue"
  xAxisLabel="Month"
  yAxisLabel="Revenue ($)"
/>
```

### 3. DataTable Component

The DataTable component displays tabular data with various features.

**Features:**
- Sortable columns
- Filterable data
- Pagination support
- Row selection
- Customizable styling

**Usage Example:**
```jsx
<DataTable 
  columns={[
    { field: "id", headerName: "ID", sortable: true },
    { field: "name", headerName: "Name", sortable: true, filterable: true },
    { field: "age", headerName: "Age", sortable: true },
    { field: "email", headerName: "Email", sortable: true, filterable: true }
  ]}
  data={[
    { id: 1, name: "John Doe", age: 30, email: "john@example.com" },
    { id: 2, name: "Jane Smith", age: 25, email: "jane@example.com" }
  ]}
  pageSizeOptions={[5, 10, 25]}
/>
```

## Implementation Notes

1. The Map component uses Leaflet instead of Google Maps to avoid API costs and limitations.
2. All components extend the BaseComponentProps interface to maintain consistency.
3. Components are designed to be customizable while providing sensible defaults.
4. Error states and loading indicators are included for better user experience. 