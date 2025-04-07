# Creating Data Visualizations with Morpheo

This guide explains how to use Morpheo's data visualization components to create interactive charts and data grids.

## Available Components

Morpheo provides the following data visualization components:

### 1. LineChart
A line chart for visualizing time series or trend data.

```json
{
  "type": "linechart",
  "id": "salesTrendChart",
  "props": {
    "data": [
      { "name": "Jan", "value": 400 },
      { "name": "Feb", "value": 300 },
      { "name": "Mar", "value": 600 }
    ],
    "dataKey": "value",
    "xAxisKey": "name",
    "title": "Monthly Sales",
    "subtitle": "Sales trend over time",
    "lineColor": "#8884d8",
    "showGrid": true,
    "xAxisLabel": "Month",
    "yAxisLabel": "Sales ($)"
  }
}
```

### 2. BarChart
A bar chart for comparing data across categories.

```json
{
  "type": "barchart",
  "id": "productComparisonChart",
  "props": {
    "data": [
      { "category": "Product A", "sales": 120 },
      { "category": "Product B", "sales": 80 },
      { "category": "Product C", "sales": 200 }
    ],
    "dataKey": "sales",
    "xAxisKey": "category",
    "title": "Product Performance",
    "barColor": "#8884d8",
    "showLegend": true
  }
}
```

### 3. PieChart
A pie chart for showing proportions of a whole.

```json
{
  "type": "piechart",
  "id": "trafficSourcesChart",
  "props": {
    "data": [
      { "name": "Social Media", "value": 35 },
      { "name": "Direct Search", "value": 25 },
      { "name": "Email", "value": 20 },
      { "name": "Referral", "value": 15 },
      { "name": "Other", "value": 5 }
    ],
    "dataKey": "value",
    "nameKey": "name",
    "title": "Traffic Sources",
    "isDonut": true,
    "centerLabel": "Traffic"
  }
}
```

### 4. DataGrid
A data grid for displaying and interacting with tabular data.

```json
{
  "type": "datagrid",
  "id": "userDataGrid",
  "props": {
    "data": [
      { "id": 1, "name": "John Doe", "email": "john@example.com", "status": "Active" },
      { "id": 2, "name": "Jane Smith", "email": "jane@example.com", "status": "Inactive" }
    ],
    "columns": [
      { "field": "id", "headerName": "ID", "width": 70, "sortable": true },
      { "field": "name", "headerName": "Name", "width": 200, "sortable": true },
      { "field": "email", "headerName": "Email", "width": 250, "sortable": true },
      { "field": "status", "headerName": "Status", "width": 120, "sortable": true }
    ],
    "title": "User Data",
    "showPagination": true,
    "showSearch": true
  }
}
```

## Loading Data from External Sources

All visualization components can load data from external APIs:

```json
{
  "type": "linechart",
  "id": "stockPriceChart",
  "props": {
    "dataUrl": "https://api.example.com/stocks/AAPL/prices",
    "dataKey": "price",
    "xAxisKey": "date",
    "title": "AAPL Stock Price",
    "refreshInterval": 60000,
    "pollingEnabled": true
  }
}
```

## Creating Interactive Dashboards

Combine multiple visualization components to create interactive dashboards:

```json
{
  "type": "container",
  "id": "dashboardContainer",
  "props": {
    "className": "p-4 grid grid-cols-2 gap-4"
  },
  "children": [
    {
      "type": "container",
      "id": "chartSection",
      "props": {
        "className": "col-span-2 bg-white p-4 rounded shadow"
      },
      "children": [
        {
          "type": "text",
          "id": "dashboardTitle",
          "props": {
            "content": "Sales Dashboard",
            "className": "text-2xl font-bold mb-4"
          }
        },
        {
          "type": "linechart",
          "id": "revenueChart",
          "props": {
            "dataUrl": "https://api.example.com/company/revenue",
            "dataKey": "value",
            "xAxisKey": "month",
            "title": "Monthly Revenue",
            "height": 300
          }
        }
      ]
    },
    {
      "type": "piechart",
      "id": "salesDistributionChart",
      "props": {
        "dataUrl": "https://api.example.com/sales/distribution",
        "dataKey": "value",
        "nameKey": "category",
        "title": "Sales by Category",
        "height": 250
      }
    },
    {
      "type": "datagrid",
      "id": "topCustomersGrid",
      "props": {
        "dataUrl": "https://api.example.com/customers/top",
        "title": "Top Customers",
        "height": 250,
        "showPagination": true
      }
    }
  ]
}
```

## Best Practices

1. **Provide Meaningful Titles**: Always include descriptive titles and subtitles for your visualizations.

2. **Choose the Right Chart Type**:
   - Use line charts for time series data
   - Use bar charts for comparing categories
   - Use pie charts for showing proportions
   - Use data grids for detailed tabular data

3. **Responsive Design**: Charts automatically adapt to their containers, but you can specify width and height for better control.

4. **Color Schemes**: Use consistent color schemes across your visualizations for better user experience.

5. **Data Formatting**: Use appropriate data formatting for different types of data:
   - Currency: Use appropriate currency symbols
   - Percentages: Include % signs
   - Dates: Format dates consistently

6. **Interactivity**: Include legends, tooltips, and labels to make your visualizations interactive and informative.

7. **Data Updates**: For real-time data, use the `refreshInterval` and `pollingEnabled` properties to keep data fresh.

## Advanced Features

### Comparative Data

Show multiple data series in the same chart:

```json
{
  "type": "linechart",
  "id": "comparativeChart",
  "props": {
    "data": [
      { "month": "Jan", "current": 400, "previous": 300 },
      { "month": "Feb", "current": 500, "previous": 400 }
    ],
    "dataKey": "current",
    "secondaryDataKey": "previous",
    "xAxisKey": "month",
    "title": "Current vs Previous Year"
  }
}
```

### Custom Formatting

Apply custom formatting to data values:

```json
{
  "type": "barchart",
  "id": "revenueChart",
  "props": {
    "data": [...],
    "dataKey": "revenue",
    "xAxisKey": "product",
    "formatter": "$${value}k"
  }
}
```

### Event Handling

Handle click events on charts and data grids:

```json
{
  "type": "piechart",
  "id": "categoryChart",
  "props": {
    "data": [...],
    "enableActiveSegment": true
  },
  "events": {
    "onClick": "handleChartClick"
  },
  "methods": {
    "handleChartClick": "function(data, index) { console.log('Clicked on', data.name); }"
  }
}
```

Remember: All visualization components are designed to work with any data source and integrate seamlessly with other Morpheo components. 