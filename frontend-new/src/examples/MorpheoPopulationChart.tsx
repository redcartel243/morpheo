import React, { useEffect, useState } from 'react';

/**
 * Morpheo Population Chart Component
 * 
 * A simple component that shows population comparison using the Morpheo component system
 */
const MorpheoPopulationChart: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Initialize the comparison chart when the component mounts
    if (!initialized) {
      // Get the DOM manipulation API from the window object
      const $m = (window as any).$m;
      
      if ($m) {
        console.log('Initializing Morpheo Population Chart');
        setInitialized(true);
        
        // Initialize app on first render
        setTimeout(() => {
          renderMorpheoPopulationApp();
        }, 100);
      }
    }
  }, [initialized]);
  
  return (
    <div id="morpheo-population-app" style={{ 
      width: '100%', 
      height: '600px',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {!initialized && <div>Loading chart...</div>}
    </div>
  );
};

// Function to render the Morpheo population comparison app
function renderMorpheoPopulationApp() {
  const appConfig = {
    "app": {
      "name": "Population Comparison",
      "description": "A chart comparing the population size of the US vs Europe.",
      "theme": "light"
    },
    "layout": {
      "type": "singlepage",
      "regions": [
        "header",
        "main",
        "footer"
      ]
    },
    "components": [
      {
        "id": "header-container",
        "type": "container",
        "region": "header",
        "styles": {
          "backgroundColor": "#f0f0f0",
          "padding": "20px",
          "textAlign": "center",
          "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"
        },
        "children": [
          {
            "id": "app-title",
            "type": "text",
            "properties": {
              "content": "US vs Europe Population Comparison"
            },
            "styles": {
              "fontSize": "24px",
              "fontWeight": "bold",
              "color": "#333"
            }
          }
        ]
      },
      {
        "id": "chart-container",
        "type": "container",
        "region": "main",
        "styles": {
          "display": "flex",
          "flexDirection": "column",
          "alignItems": "center",
          "padding": "20px"
        },
        "children": [
          {
            "id": "chart-title",
            "type": "text",
            "properties": {
              "content": "Population Sizes (Millions)"
            },
            "styles": {
              "fontSize": "20px",
              "marginBottom": "30px"
            }
          },
          {
            "id": "chart-bars",
            "type": "container",
            "styles": {
              "display": "flex",
              "alignItems": "flex-end",
              "justifyContent": "center",
              "width": "100%",
              "height": "400px",
              "padding": "20px"
            },
            "children": [
              {
                "id": "us-bar-container",
                "type": "container",
                "styles": {
                  "display": "flex",
                  "flexDirection": "column",
                  "alignItems": "center",
                  "marginRight": "40px"
                },
                "children": [
                  {
                    "id": "us-bar",
                    "type": "container",
                    "styles": {
                      "width": "100px",
                      "height": "330px",
                      "backgroundColor": "#4285f4",
                      "marginBottom": "10px",
                      "borderRadius": "5px",
                      "boxShadow": "0 2px 4px rgba(0,0,0,0.2)"
                    }
                  },
                  {
                    "id": "us-label",
                    "type": "text",
                    "properties": {
                      "content": "USA (331.9)"
                    },
                    "styles": {
                      "marginTop": "10px",
                      "fontWeight": "bold"
                    }
                  }
                ]
              },
              {
                "id": "europe-bar-container",
                "type": "container",
                "styles": {
                  "display": "flex",
                  "flexDirection": "column",
                  "alignItems": "center"
                },
                "children": [
                  {
                    "id": "europe-bar",
                    "type": "container",
                    "styles": {
                      "width": "100px",
                      "height": "750px",
                      "backgroundColor": "#34a853",
                      "marginBottom": "10px",
                      "borderRadius": "5px",
                      "boxShadow": "0 2px 4px rgba(0,0,0,0.2)"
                    }
                  },
                  {
                    "id": "europe-label",
                    "type": "text",
                    "properties": {
                      "content": "Europe (750.0)"
                    },
                    "styles": {
                      "marginTop": "10px",
                      "fontWeight": "bold"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "footer-container",
        "type": "container",
        "region": "footer",
        "styles": {
          "backgroundColor": "#f0f0f0",
          "padding": "10px",
          "textAlign": "center",
          "fontSize": "12px",
          "color": "#777",
          "marginTop": "20px"
        },
        "children": [
          {
            "id": "footer-text",
            "type": "text",
            "properties": {
              "content": "Data from 2023 - Population in millions"
            }
          }
        ]
      }
    ]
  };
  
  // Get the Morpheo API from window
  const $morpheo = (window as any).$morpheo;
  
  if ($morpheo) {
    // Render the application
    $morpheo.renderApp(appConfig, "#morpheo-population-app");
  } else {
    console.error('Morpheo API not found');
  }
}

export default MorpheoPopulationChart; 