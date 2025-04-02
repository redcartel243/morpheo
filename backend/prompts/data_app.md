## Data-Driven Application Generator

Generate a complete data-driven application configuration using our component system. This template provides patterns for AI-driven data visualization, loading states, and filtering without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Data Application",
    "description": "Data-driven application with visualization and filtering",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "controls", "main", "footer"]
  },
  "components": [
    {
      "id": "app-title",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "Data Explorer",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "data-controls",
      "type": "container",
      "region": "controls",
      "styles": {
        "display": "flex",
        "gap": "15px",
        "justifyContent": "center",
        "flexWrap": "wrap",
        "padding": "10px",
        "backgroundColor": "#f5f5f5",
        "borderRadius": "8px",
        "marginBottom": "20px"
      },
      "children": [
        /* Filter and control components will go here */
      ]
    },
    {
      "id": "loading-indicator",
      "type": "container",
      "region": "main",
      "properties": {
        "visible": false
      },
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "justifyContent": "center",
        "padding": "40px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)",
        "minHeight": "200px"
      },
      "children": [
        {
          "id": "loading-spinner",
          "type": "container",
          "styles": {
            "width": "40px",
            "height": "40px",
            "border": "4px solid #f3f3f3",
            "borderTop": "4px solid #3498db",
            "borderRadius": "50%",
            "animation": "spin 1s linear infinite",
            "marginBottom": "15px"
          }
        },
        {
          "id": "loading-text",
          "type": "text",
          "properties": {
            "content": "Loading data...",
            "variant": "body1"
          },
          "styles": {
            "color": "#666"
          }
        }
      ]
    },
    {
      "id": "error-container",
      "type": "container",
      "region": "main",
      "properties": {
        "visible": false
      },
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "justifyContent": "center",
        "padding": "40px",
        "backgroundColor": "#fff9f9",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)",
        "border": "1px solid #ffdddd",
        "minHeight": "200px"
      },
      "children": [
        {
          "id": "error-icon",
          "type": "text",
          "properties": {
            "content": "⚠️",
            "variant": "h3"
          },
          "styles": {
            "fontSize": "48px",
            "marginBottom": "15px"
          }
        },
        {
          "id": "error-message",
          "type": "text",
          "properties": {
            "content": "An error occurred while loading data.",
            "variant": "body1"
          },
          "styles": {
            "color": "#d32f2f",
            "marginBottom": "15px",
            "textAlign": "center"
          }
        },
        {
          "id": "retry-button",
          "type": "button",
          "properties": {
            "text": "Retry"
          },
          "styles": {
            "padding": "8px 16px",
            "backgroundColor": "#f44336",
            "color": "white",
            "border": "none",
            "borderRadius": "4px",
            "cursor": "pointer"
          }
        }
      ]
    },
    {
      "id": "data-container",
      "type": "container",
      "region": "main",
      "properties": {
        "visible": false
      },
      "styles": {
        "padding": "20px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)",
        "minHeight": "400px"
      },
      "children": [
        /* Data visualization components will go here */
      ]
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Data Application",
        "variant": "body2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "fontSize": "0.8rem",
        "color": "#777"
      }
    }
  ]
}
```

### Functional Requirements

1. **Data Loading and Error States**:
   - Show loading indicators during data fetching processes
   - Handle and display error states with appropriate messages
   - Provide retry mechanisms for failed data operations
   - Toggle visibility between loading, error, and data containers

2. **Data Filtering and Manipulation**:
   - Implement filter controls based on data attributes
   - Apply sorting based on different data fields
   - Support pagination or infinite scrolling for large datasets
   - Enable searching across data properties

3. **Visualization Components**:
   - Render appropriate chart types based on data characteristics
   - Support multiple visualization modes (table, chart, card view)
   - Implement responsive visualizations that adapt to screen size
   - Enable user interaction with visualized data

### DOM Manipulation Patterns

For data-driven applications, implement these patterns:

```javascript
// Initialize data and UI state
"onLoad": {
  "code": "function(event, $m) {
    // Initialize data state with initial data, loading state, error state
    window.dataState = {
      data: [],
      filteredData: [],
      isLoading: false,
      error: null,
      filters: {
        category: 'all',
        sortBy: 'default',
        searchTerm: ''
      }
    };
    
    // Load initial data
    loadData($m);
  }"
}

// Simulated data loading function
"methods": {
  "loadData": {
    "code": "function loadData($m) {
      // Show loading state
      showLoadingState($m);
      
      // Simulate API call with setTimeout
      // In a real app, this would be a fetch call to an API
      setTimeout(function() {
        // Randomly succeed or fail for demonstration
        const shouldSucceed = Math.random() > 0.2;
        
        if (shouldSucceed) {
          // Simulated data response
          const responseData = [
            { id: 1, name: 'Product A', category: 'Electronics', value: 1200, trend: 'up' },
            { id: 2, name: 'Product B', category: 'Clothing', value: 800, trend: 'down' },
            { id: 3, name: 'Product C', category: 'Electronics', value: 1500, trend: 'up' },
            { id: 4, name: 'Product D', category: 'Home', value: 950, trend: 'stable' },
            { id: 5, name: 'Product E', category: 'Clothing', value: 650, trend: 'down' },
            { id: 6, name: 'Product F', category: 'Home', value: 1100, trend: 'up' }
          ];
          
          // Update data state
          window.dataState.data = responseData;
          window.dataState.filteredData = responseData;
          window.dataState.isLoading = false;
          window.dataState.error = null;
          
          // Update UI
          renderData($m);
        } else {
          // Simulate error
          window.dataState.isLoading = false;
          window.dataState.error = 'Failed to load data. Server returned an error.';
          
          // Show error state
          showErrorState($m);
        }
      }, 1500);
    }"
  },
  
  "showLoadingState": {
    "code": "function showLoadingState($m) {
      window.dataState.isLoading = true;
      
      // Hide data and error containers
      $m('#data-container').hide();
      $m('#error-container').hide();
      
      // Show loading container with animation
      $m('#loading-indicator').show();
      $m('#loading-spinner').animate({
        transform: ['rotate(0deg)', 'rotate(360deg)']
      }, {
        duration: 1000,
        iterations: Infinity
      });
    }"
  },
  
  "showErrorState": {
    "code": "function showErrorState($m) {
      // Hide loading and data containers
      $m('#loading-indicator').hide();
      $m('#data-container').hide();
      
      // Update error message
      $m('#error-message').setText(window.dataState.error || 'An unknown error occurred');
      
      // Show error container with animation
      $m('#error-container').show();
      $m('#error-container').animate({
        opacity: [0, 1],
        transform: ['translateY(-20px)', 'translateY(0)']
      }, {duration: 300});
    }"
  },
  
  "renderData": {
    "code": "function renderData($m) {
      // Hide loading and error containers
      $m('#loading-indicator').hide();
      $m('#error-container').hide();
      
      // Clear existing data visualization
      const dataContainer = $m('#data-container');
      
      // Remove all child elements except template elements
      while (dataContainer.firstChild) {
        if (!dataContainer.firstChild.classList.contains('template')) {
          dataContainer.removeChild(dataContainer.firstChild);
        } else {
          break;
        }
      }
      
      // Check if we have data to display
      if (window.dataState.filteredData.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '40px 20px';
        emptyState.innerHTML = '<div style=\"font-size: 48px; margin-bottom: 16px;\">📊</div>' +
                              '<h3 style=\"margin: 0 0 8px 0; color: #555;\">No data found</h3>' +
                              '<p style=\"margin: 0; color: #888;\">Try adjusting your filters or search criteria</p>';
        
        dataContainer.appendChild(emptyState);
      } else {
        // Create data visualization based on current data
        createDataVisualization($m, window.dataState.filteredData);
      }
      
      // Show data container with animation
      dataContainer.style.display = 'block';
      $m('#data-container').animate({
        opacity: [0, 1],
        transform: ['translateY(20px)', 'translateY(0)']
      }, {duration: 300});
    }"
  },
  
  "applyFilters": {
    "code": "function applyFilters($m) {
      const { data, filters } = window.dataState;
      let filtered = [...data];
      
      // Apply category filter
      if (filters.category !== 'all') {
        filtered = filtered.filter(item => item.category === filters.category);
      }
      
      // Apply search
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(item => 
          item.name.toLowerCase().includes(term) || 
          item.category.toLowerCase().includes(term)
        );
      }
      
      // Apply sorting
      if (filters.sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filters.sortBy === 'value-high') {
        filtered.sort((a, b) => b.value - a.value);
      } else if (filters.sortBy === 'value-low') {
        filtered.sort((a, b) => a.value - b.value);
      }
      
      // Update filtered data
      window.dataState.filteredData = filtered;
      
      // Re-render with filtered data
      renderData($m);
    }"
  }
}

// Event handler for filter controls
"onChange": {
  "code": "function(event, $m) {
    // Get selected category value
    const category = $m('#category-filter').getValue();
    
    // Update filter state
    window.dataState.filters.category = category;
    
    // Apply filters
    applyFilters($m);
    
    // Animate the data container to indicate change
    $m('#data-container').animate({
      backgroundColor: ['#fff', '#f8f9fa', '#fff']
    }, {duration: 500});
  }",
  "affectedComponents": ["data-container"]
}

// Event handler for retry button
"onClick": {
  "code": "function(event, $m) {
    // Retry loading data
    loadData($m);
    
    // Animate button press
    $m('#retry-button').setStyle('transform', 'scale(0.95)');
    setTimeout(() => {
      $m('#retry-button').setStyle('transform', 'scale(1)');
    }, 100);
  }",
  "affectedComponents": ["loading-indicator", "error-container", "data-container"]
}
```

### Data Visualization Examples

```javascript
// Example chart creation function
"createDataVisualization": {
  "code": "function createDataVisualization($m, data) {
    const container = document.getElementById('data-container');
    
    // Determine if we should show a chart or table based on data
    const shouldUseChart = data.length <= 10; // Arbitrary threshold
    
    if (shouldUseChart) {
      // Create chart container
      const chartContainer = document.createElement('div');
      chartContainer.id = 'chart-container';
      chartContainer.style.height = '400px';
      chartContainer.style.width = '100%';
      
      // In a real implementation, this would use a chart library
      // Here we'll create a simple bar chart with CSS
      
      // Calculate the maximum value for scaling
      const maxValue = Math.max(...data.map(item => item.value));
      
      // Create chart header
      const chartHeader = document.createElement('div');
      chartHeader.style.display = 'flex';
      chartHeader.style.justifyContent = 'space-between';
      chartHeader.style.padding = '0 10px 10px 10px';
      chartHeader.style.borderBottom = '1px solid #eee';
      chartHeader.style.marginBottom = '20px';
      
      const chartTitle = document.createElement('h3');
      chartTitle.textContent = 'Data Visualization';
      chartTitle.style.margin = '0';
      
      chartHeader.appendChild(chartTitle);
      
      // Create bars container
      const barsContainer = document.createElement('div');
      barsContainer.style.display = 'flex';
      barsContainer.style.alignItems = 'flex-end';
      barsContainer.style.height = '300px';
      barsContainer.style.padding = '20px 10px 0 10px';
      barsContainer.style.gap = '15px';
      
      // Create bars for each data point
      data.forEach(item => {
        const barWrapper = document.createElement('div');
        barWrapper.style.display = 'flex';
        barWrapper.style.flexDirection = 'column';
        barWrapper.style.alignItems = 'center';
        barWrapper.style.flex = '1';
        
        const barHeight = (item.value / maxValue) * 100;
        
        const bar = document.createElement('div');
        bar.style.width = '100%';
        bar.style.backgroundColor = item.trend === 'up' ? '#4CAF50' : 
                                   item.trend === 'down' ? '#f44336' : '#2196F3';
        bar.style.height = `${barHeight}%`;
        bar.style.transition = 'height 0.5s ease-in-out';
        bar.style.borderRadius = '4px 4px 0 0';
        bar.style.position = 'relative';
        
        // Add value tooltip on hover
        bar.title = `${item.name}: ${item.value}`;
        
        const label = document.createElement('div');
        label.textContent = item.name;
        label.style.marginTop = '8px';
        label.style.fontSize = '12px';
        label.style.textAlign = 'center';
        label.style.whiteSpace = 'nowrap';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.maxWidth = '100%';
        
        barWrapper.appendChild(bar);
        barWrapper.appendChild(label);
        barsContainer.appendChild(barWrapper);
      });
      
      // Add elements to chart container
      chartContainer.appendChild(chartHeader);
      chartContainer.appendChild(barsContainer);
      
      // Add chart to main container
      container.appendChild(chartContainer);
      
      // Animate chart bars in
      const bars = barsContainer.querySelectorAll('div > div:first-child');
      Array.from(bars).forEach((bar, index) => {
        const height = bar.style.height;
        bar.style.height = '0';
        setTimeout(() => {
          bar.style.height = height;
        }, 100 * index); // Stagger animation
      });
    } else {
      // Create table view for larger datasets
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      
      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      ['Name', 'Category', 'Value', 'Trend'].forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.padding = '12px 15px';
        th.style.textAlign = 'left';
        th.style.borderBottom = '2px solid #ddd';
        th.style.backgroundColor = '#f8f9fa';
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9';
        
        // Name cell
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        nameCell.style.padding = '12px 15px';
        nameCell.style.borderBottom = '1px solid #ddd';
        
        // Category cell
        const categoryCell = document.createElement('td');
        categoryCell.textContent = item.category;
        categoryCell.style.padding = '12px 15px';
        categoryCell.style.borderBottom = '1px solid #ddd';
        
        // Value cell
        const valueCell = document.createElement('td');
        valueCell.textContent = item.value;
        valueCell.style.padding = '12px 15px';
        valueCell.style.borderBottom = '1px solid #ddd';
        
        // Trend cell
        const trendCell = document.createElement('td');
        const trendIcon = document.createElement('span');
        trendIcon.textContent = item.trend === 'up' ? '↑' : 
                              item.trend === 'down' ? '↓' : '→';
        trendIcon.style.color = item.trend === 'up' ? '#4CAF50' : 
                              item.trend === 'down' ? '#f44336' : '#2196F3';
        trendIcon.style.fontWeight = 'bold';
        trendCell.appendChild(trendIcon);
        trendCell.style.padding = '12px 15px';
        trendCell.style.borderBottom = '1px solid #ddd';
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(categoryCell);
        row.appendChild(valueCell);
        row.appendChild(trendCell);
        
        // Add hover effect
        row.addEventListener('mouseover', function() {
          this.style.backgroundColor = '#f0f0f0';
        });
        row.addEventListener('mouseout', function() {
          this.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9';
        });
        
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      container.appendChild(table);
      
      // Animate table rows in
      const rows = tbody.querySelectorAll('tr');
      Array.from(rows).forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
          row.style.opacity = '1';
          row.style.transform = 'translateY(0)';
        }, 50 * index); // Stagger animation
      });
    }
  }"
}
```

Generate the complete configuration with data controls, visualizations, and appropriate loading/error states implemented through generic component manipulation and state management. 