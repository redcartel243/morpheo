## Weather Information Application Generator

Generate a complete weather information application using our component system. This template provides patterns for AI-driven weather data display without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Weather Information",
    "description": "Weather forecast display application",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "main", "forecast", "footer"]
  },
  "components": [
    {
      "id": "app-title",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "Weather Forecast",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "location-input-container",
      "type": "container",
      "region": "header",
      "styles": {
        "display": "flex",
        "justifyContent": "center",
        "gap": "10px",
        "marginBottom": "20px"
      },
      "children": [
        {
          "id": "location-input",
          "type": "input",
          "properties": {
            "placeholder": "Enter city name",
            "type": "text"
          },
          "styles": {
            "padding": "10px",
            "border": "1px solid #ddd",
            "borderRadius": "4px",
            "width": "250px"
          }
        },
        {
          "id": "search-button",
          "type": "button",
          "properties": {
            "text": "Search"
          },
          "styles": {
            "padding": "10px 15px",
            "backgroundColor": "#4CAF50",
            "color": "white",
            "border": "none",
            "borderRadius": "4px",
            "cursor": "pointer"
          }
        }
      ]
    },
    {
      "id": "current-weather-container",
      "type": "container",
      "region": "main",
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "padding": "30px",
        "backgroundColor": "#f9f9f9",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)",
        "maxWidth": "600px",
        "margin": "0 auto 30px auto"
      },
      "children": [
        {
          "id": "current-location",
          "type": "text",
          "properties": {
            "content": "Current Location",
            "variant": "h4"
          },
          "styles": {
            "marginBottom": "10px",
            "color": "#333"
          }
        },
        {
          "id": "current-date",
          "type": "text",
          "properties": {
            "content": "Today's Date",
            "variant": "body1"
          },
          "styles": {
            "marginBottom": "20px",
            "color": "#666"
          }
        },
        {
          "id": "current-temp-container",
          "type": "container",
          "styles": {
            "display": "flex",
            "alignItems": "center",
            "gap": "20px",
            "marginBottom": "20px"
          },
          "children": [
            {
              "id": "weather-icon",
              "type": "text",
              "properties": {
                "content": "☀️",
                "variant": "h1"
              },
              "styles": {
                "fontSize": "64px"
              }
            },
            {
              "id": "current-temp",
              "type": "text",
              "properties": {
                "content": "0°C",
                "variant": "h2"
              },
              "styles": {
                "fontSize": "48px",
                "fontWeight": "bold"
              }
            }
          ]
        },
        {
          "id": "weather-description",
          "type": "text",
          "properties": {
            "content": "Weather description",
            "variant": "body1"
          },
          "styles": {
            "marginBottom": "20px",
            "fontSize": "18px"
          }
        },
        {
          "id": "weather-details-container",
          "type": "container",
          "styles": {
            "display": "grid",
            "gridTemplateColumns": "1fr 1fr",
            "gap": "15px",
            "width": "100%"
          },
          "children": [
            {
              "id": "humidity-container",
              "type": "container",
              "styles": {
                "display": "flex",
                "alignItems": "center",
                "gap": "10px"
              },
              "children": [
                {
                  "id": "humidity-label",
                  "type": "text",
                  "properties": {
                    "content": "Humidity:",
                    "variant": "body2"
                  },
                  "styles": {
                    "fontWeight": "bold"
                  }
                },
                {
                  "id": "humidity-value",
                  "type": "text",
                  "properties": {
                    "content": "0%",
                    "variant": "body2"
                  }
                }
              ]
            },
            {
              "id": "wind-container",
              "type": "container",
              "styles": {
                "display": "flex",
                "alignItems": "center",
                "gap": "10px"
              },
              "children": [
                {
                  "id": "wind-label",
                  "type": "text",
                  "properties": {
                    "content": "Wind:",
                    "variant": "body2"
                  },
                  "styles": {
                    "fontWeight": "bold"
                  }
                },
                {
                  "id": "wind-value",
                  "type": "text",
                  "properties": {
                    "content": "0 km/h",
                    "variant": "body2"
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "forecast-container",
      "type": "container",
      "region": "forecast",
      "styles": {
        "display": "flex",
        "overflowX": "auto",
        "gap": "15px",
        "padding": "20px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)",
        "maxWidth": "800px",
        "margin": "0 auto 30px auto"
      },
      "children": [
        /* Forecast cards will be added dynamically */
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
        "maxWidth": "600px",
        "margin": "0 auto 30px auto"
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
            "content": "Loading weather data...",
            "variant": "body1"
          },
          "styles": {
            "color": "#666"
          }
        }
      ]
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Weather Application",
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

1. **Weather Data Display**:
   - Present current weather conditions (temperature, conditions, etc.)
   - Show extended forecast for multiple days
   - Display additional weather metrics (humidity, wind, pressure, etc.)
   - Use appropriate icons to represent weather conditions

2. **Location Management**:
   - Allow searching for locations by name
   - Provide visual feedback during data loading
   - Handle error states for failed API calls
   - Support geolocation for current user position

3. **User Experience**:
   - Responsive design for different screen sizes
   - Use animations for state transitions
   - Apply appropriate color coding for temperature ranges
   - Display timezone-aware dates and times

### DOM Manipulation Patterns

For weather applications, implement these patterns:

```javascript
// Initialize weather data with loading states
"onLoad": {
  "code": "function(event, $m) {
    // Initialize app state
    window.weatherState = {
      isLoading: false,
      location: 'New York',
      currentWeather: null,
      forecast: [],
      error: null
    };
    
    // Load initial weather data
    loadWeatherData($m, window.weatherState.location);
  }"
}

// Weather data loading function
"methods": {
  "loadWeatherData": {
    "code": "function loadWeatherData($m, location) {
      // Show loading state
      window.weatherState.isLoading = true;
      showLoadingState($m);
      
      // Simulate API call with setTimeout
      // In a real implementation, this would be a fetch to a weather API
      setTimeout(function() {
        // Create sample weather data (for demo purposes)
        const currentDate = new Date();
        const weatherData = {
          location: location,
          current: {
            date: currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            temp: Math.round(10 + Math.random() * 25),
            condition: 'Sunny',
            icon: '☀️',
            humidity: Math.round(40 + Math.random() * 50),
            wind: Math.round(5 + Math.random() * 20)
          },
          forecast: Array.from({ length: 5 }, (_, i) => {
            const forecastDate = new Date();
            forecastDate.setDate(currentDate.getDate() + i + 1);
            return {
              date: forecastDate.toLocaleDateString('en-US', { weekday: 'short' }),
              temp: Math.round(8 + Math.random() * 25),
              condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm'][Math.floor(Math.random() * 5)],
              icon: ['☀️', '⛅', '☁️', '🌧️', '⛈️'][Math.floor(Math.random() * 5)]
            };
          })
        };
        
        // Update state
        window.weatherState.isLoading = false;
        window.weatherState.currentWeather = weatherData.current;
        window.weatherState.forecast = weatherData.forecast;
        window.weatherState.location = weatherData.location;
        
        // Update UI
        updateWeatherUI($m);
      }, 1500);
    }"
  },
  
  "showLoadingState": {
    "code": "function showLoadingState($m) {
      // Hide current weather and forecast
      $m('#current-weather-container').hide();
      $m('#forecast-container').hide();
      
      // Show loading indicator
      $m('#loading-indicator').show();
      
      // Animate loading spinner
      $m('#loading-spinner').animate({
        transform: ['rotate(0deg)', 'rotate(360deg)']
      }, {
        duration: 1000,
        iterations: Infinity
      });
    }"
  },
  
  "updateWeatherUI": {
    "code": "function updateWeatherUI($m) {
      const { currentWeather, forecast, location } = window.weatherState;
      
      // Hide loading indicator
      $m('#loading-indicator').hide();
      
      // Update current weather
      $m('#current-location').setText(location);
      $m('#current-date').setText(currentWeather.date);
      $m('#current-temp').setText(`${currentWeather.temp}°C`);
      $m('#weather-icon').setText(currentWeather.icon);
      $m('#weather-description').setText(currentWeather.condition);
      $m('#humidity-value').setText(`${currentWeather.humidity}%`);
      $m('#wind-value').setText(`${currentWeather.wind} km/h`);
      
      // Set temperature color based on value
      if (currentWeather.temp >= 30) {
        $m('#current-temp').setStyle('color', '#FF5722'); // Hot
      } else if (currentWeather.temp >= 20) {
        $m('#current-temp').setStyle('color', '#FF9800'); // Warm
      } else if (currentWeather.temp >= 10) {
        $m('#current-temp').setStyle('color', '#4CAF50'); // Mild
      } else {
        $m('#current-temp').setStyle('color', '#2196F3'); // Cold
      }
      
      // Update forecast
      updateForecast($m, forecast);
      
      // Show current weather and forecast with animation
      $m('#current-weather-container').show();
      $m('#current-weather-container').animate({
        opacity: [0, 1],
        transform: ['translateY(-20px)', 'translateY(0)']
      }, {duration: 300});
      
      $m('#forecast-container').show();
      $m('#forecast-container').animate({
        opacity: [0, 1],
        transform: ['translateY(-20px)', 'translateY(0)']
      }, {duration: 300, delay: 200});
    }"
  },
  
  "updateForecast": {
    "code": "function updateForecast($m, forecast) {
      const container = $m('#forecast-container');
      
      // Clear existing forecast cards
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      // Create forecast cards
      forecast.forEach((day, index) => {
        // Create forecast card
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.padding = '15px';
        card.style.backgroundColor = '#f5f5f5';
        card.style.borderRadius = '8px';
        card.style.minWidth = '100px';
        
        // Day name
        const dayName = document.createElement('div');
        dayName.textContent = day.date;
        dayName.style.fontWeight = 'bold';
        dayName.style.marginBottom = '10px';
        
        // Weather icon
        const icon = document.createElement('div');
        icon.textContent = day.icon;
        icon.style.fontSize = '32px';
        icon.style.marginBottom = '10px';
        
        // Temperature
        const temp = document.createElement('div');
        temp.textContent = `${day.temp}°C`;
        temp.style.fontWeight = 'bold';
        
        // Set temperature color based on value
        if (day.temp >= 30) {
          temp.style.color = '#FF5722'; // Hot
        } else if (day.temp >= 20) {
          temp.style.color = '#FF9800'; // Warm
        } else if (day.temp >= 10) {
          temp.style.color = '#4CAF50'; // Mild
        } else {
          temp.style.color = '#2196F3'; // Cold
        }
        
        // Add elements to card
        card.appendChild(dayName);
        card.appendChild(icon);
        card.appendChild(temp);
        
        // Add card to container with staggered animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        container.appendChild(card);
        
        // Animate card with delay based on index
        setTimeout(() => {
          card.style.transition = 'opacity 300ms ease, transform 300ms ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 100 * index);
      });
    }"
  }
}

// Search button handler
"onClick": {
  "code": "function(event, $m) {
    const location = $m('#location-input').getValue().trim();
    
    if (!location) {
      // Animate input to show error
      $m('#location-input').setStyle('borderColor', 'red');
      $m('#location-input').animate({
        transform: ['translateX(0px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(0px)']
      }, {duration: 300});
      return;
    }
    
    // Reset input style
    $m('#location-input').setStyle('borderColor', '#ddd');
    
    // Load weather for new location
    loadWeatherData($m, location);
  }",
  "affectedComponents": ["location-input", "current-weather-container", "forecast-container", "loading-indicator"]
}

// Weather icon mapping helper
"getWeatherIcon": {
  "code": "function getWeatherIcon(condition) {
    // Map weather condition to appropriate icon
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return '☀️';
    } else if (conditionLower.includes('partly cloudy')) {
      return '⛅';
    } else if (conditionLower.includes('cloud')) {
      return '☁️';
    } else if (conditionLower.includes('rain')) {
      return '🌧️';
    } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      return '⛈️';
    } else if (conditionLower.includes('snow')) {
      return '❄️';
    } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      return '🌫️';
    } else {
      return '🌤️'; // Default icon
    }
  }"
}
```

Generate the complete weather application configuration with location search, current conditions, and forecast display implemented through generic component manipulation and state management. 