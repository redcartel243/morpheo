import React, { useState, useEffect, useRef } from 'react';
import LibraryLoader, { MultiLibraryLoader, withLibrary } from '../components/ui/LibraryLoader';
import { useLibrary, useMultipleLibraries } from '../hooks/useLibrary';
import { Button, Card, Tabs, Tab } from 'react-bootstrap';
// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Add D3 types to prevent errors
interface D3DataPoint {
  name: string;
  value: number;
}

// Define the shape of our data for better type checking
interface ChartDataPoint {
  [key: string]: any;
}

/**
 * Example component that demonstrates different ways of using dynamic library loading
 */
const AsyncComponentExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('basic');

  return (
    <div className="async-component-example p-4">
      <h1>Async Component Loading Examples</h1>
      <p className="lead">
        This example demonstrates different ways to load libraries on demand and integrate them into React components.
      </p>

      <Tabs
        activeKey={activeTab}
        onSelect={(k: string | null) => setActiveTab(k || 'basic')}
        className="mb-4"
      >
        <Tab eventKey="basic" title="Basic Loader">
          <BasicLoaderExample />
        </Tab>
        <Tab eventKey="hook" title="Hook API">
          <HookExample />
        </Tab>
        <Tab eventKey="multi" title="Multiple Libraries">
          <MultiLibraryExample />
        </Tab>
        <Tab eventKey="hoc" title="HOC Pattern">
          <HOCExample />
        </Tab>
        <Tab eventKey="practical" title="Practical Example">
          <PracticalExample />
        </Tab>
      </Tabs>

      <Card className="mt-5">
        <Card.Header>Implementation Details</Card.Header>
        <Card.Body>
          <h5>Key Concepts</h5>
          <ul>
            <li><strong>Lazy Loading:</strong> Libraries are only loaded when needed, reducing initial page load time</li>
            <li><strong>Error Handling:</strong> Graceful degradation if libraries fail to load</li>
            <li><strong>Loading States:</strong> Visual feedback while libraries are loading</li>
            <li><strong>Multiple Integration Patterns:</strong> Choose the pattern that best fits your use case</li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

/**
 * Example using the basic LibraryLoader component
 */
const BasicLoaderExample: React.FC = () => {
  return (
    <Card>
      <Card.Header>Basic Library Loader</Card.Header>
      <Card.Body>
        <p>
          The most straightforward way to load a library on demand is using the <code>LibraryLoader</code> component.
          This component will load the library when mounted and render its children only after the library is loaded.
        </p>

        <div className="example-container p-3 border rounded bg-light">
          <LibraryLoader
            library="chart.js"
            loading={<div className="text-center p-4">Loading Chart.js...</div>}
            errorRenderer={(error, retry) => (
              <div className="error-container">
                <div className="error-message">
                  Failed to load Chart.js: {error.message}
                </div>
                <button className="retry-button" onClick={retry}>
                  Retry
                </button>
              </div>
            )}
            debug={true}
          >
            {(Chart) => (
              <div>
                <h5>Chart.js Loaded Successfully!</h5>
                <p>Chart.js version: {Chart.VERSION}</p>
                <canvas 
                  id="basic-chart" 
                  ref={(canvas) => {
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx && Chart) {
                        new Chart(ctx, {
                          type: 'bar',
                          data: {
                            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                            datasets: [{
                              label: '# of Votes',
                              data: [12, 19, 3, 5, 2, 3],
                              backgroundColor: [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                                'rgba(255, 159, 64, 0.2)'
                              ],
                              borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)'
                              ],
                              borderWidth: 1
                            }]
                          },
                          options: {
                            scales: {
                              y: {
                                beginAtZero: true
                              }
                            }
                          }
                        });
                      }
                    }
                  }}
                />
              </div>
            )}
          </LibraryLoader>
        </div>

        <div className="code-example mt-3">
          <pre className="bg-dark text-light p-3 rounded">
            {`<LibraryLoader
  library="chart.js"
  loading={<div>Loading Chart.js...</div>}
  errorRenderer={(error, retry) => (
    <div className="error-container">
      <div className="error-message">
        Failed to load Chart.js: {error.message}
      </div>
      <button className="retry-button" onClick={retry}>
        Retry
      </button>
    </div>
  )}
  debug={true}
>
  {(Chart) => (
    <div>
      <h5>Chart.js Loaded!</h5>
      <p>Version: {Chart.VERSION}</p>
      <canvas id="chart" ref={(canvas) => {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            new Chart(ctx, {...});
          }
        }
      }} />
    </div>
  )}
</LibraryLoader>`}
          </pre>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Example using the useLibrary hook
 */
const HookExample: React.FC = () => {
  const { library: d3, isLoading, error, reload } = useLibrary('d3', {
    version: '7', // Specify version
    onLoad: (lib) => console.log('D3 loaded:', lib.version)
  });
  
  const [data] = useState([25, 30, 45, 60, 20, 65, 75]);

  return (
    <Card>
      <Card.Header>React Hook API</Card.Header>
      <Card.Body>
        <p>
          For more control and better integration with React, you can use the <code>useLibrary</code> hook.
          This approach provides a more idiomatic React way to handle library loading.
        </p>

        <div className="example-container p-3 border rounded bg-light">
          {isLoading && (
            <div className="text-center p-4">Loading D3.js...</div>
          )}
          
          {error && (
            <div className="text-center p-4">
              <p className="text-danger">Failed to load D3.js: {error.message}</p>
              <Button variant="primary" onClick={() => reload()}>Try Again</Button>
            </div>
          )}
          
          {d3 && (
            <div>
              <h5>D3.js Loaded Successfully!</h5>
              <p>D3.js version: {d3.version}</p>
              
              <svg width="400" height="200" ref={(svg) => {
                if (svg && d3) {
                  // Clear previous content
                  d3.select(svg).selectAll('*').remove();
                  
                  // Define scales
                  const x = d3.scaleBand()
                    .domain(d3.range(data.length).map(String))
                    .range([0, 400])
                    .padding(0.1);
                  
                  const y = d3.scaleLinear()
                    .domain([0, d3.max(data) || 0])
                    .range([200, 0]);
                  
                  // Create bars
                  d3.select(svg)
                    .selectAll('rect')
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('x', (_d: any, i: number) => x(String(i)) || 0)
                    .attr('y', (d: number) => y(d))
                    .attr('width', x.bandwidth())
                    .attr('height', (d: number) => 200 - y(d))
                    .attr('fill', 'steelblue');
                }
              }} />
            </div>
          )}
        </div>

        <div className="code-example mt-3">
          <pre className="bg-dark text-light p-3 rounded">
            {`// Using the useLibrary hook
const { library: d3, isLoading, error, reload } = useLibrary('d3', {
  version: '7',
  onLoad: (lib) => console.log('D3 loaded:', lib.version)
});

// Render based on loading state
return (
  <div>
    {isLoading && <div>Loading D3.js...</div>}
    
    {error && (
      <div>
        <p>Failed to load D3.js: {error.message}</p>
        <button onClick={reload}>Try Again</button>
      </div>
    )}
    
    {d3 && (
      <div>
        <h5>D3.js Loaded!</h5>
        <p>Version: {d3.version}</p>
        <svg width="400" height="200" ref={(svg) => {
          if (svg && d3) {
            // D3 visualization code here
            // ...
          }
        }} />
      </div>
    )}
  </div>
);`}
          </pre>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Example using the MultiLibraryLoader
 */
const MultiLibraryExample: React.FC = () => {
  return (
    <Card>
      <Card.Header>Multiple Libraries</Card.Header>
      <Card.Body>
        <p>
          Need to load multiple libraries at once? Use <code>MultiLibraryLoader</code> or <code>useMultipleLibraries</code> hook
          to load several libraries in parallel.
        </p>

        <div className="example-container p-3 border rounded bg-light">
          <MultiLibraryLoader
            libraries={{
              'chart.js': { accessor: 'Chart' },
              'moment': {}
            }}
            loading={<div className="text-center p-4">Loading libraries...</div>}
            debug={true}
          >
            {(libraries) => {
              const Chart = libraries['chart.js'];
              const moment = libraries['moment'];
              
              return (
                <div>
                  <h5>Multiple Libraries Loaded!</h5>
                  <p>Chart.js version: {Chart?.VERSION}</p>
                  <p>Moment.js version: {moment?.version}</p>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Current Time with Moment.js</h6>
                      <p>{moment ? moment().format('MMMM Do YYYY, h:mm:ss a') : 'Not loaded'}</p>
                    </div>
                    <div className="col-md-6">
                      <h6>Simple Chart.js Example</h6>
                      <canvas 
                        id="multi-chart" 
                        height="100"
                        ref={(canvas) => {
                          if (canvas && Chart) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              new Chart(ctx, {
                                type: 'line',
                                data: {
                                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                                  datasets: [{
                                    label: 'Sales',
                                    data: [12, 19, 3, 5, 2, 3],
                                    borderColor: 'rgb(75, 192, 192)',
                                    tension: 0.1
                                  }]
                                }
                              });
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          </MultiLibraryLoader>
        </div>

        <div className="code-example mt-3">
          <pre className="bg-dark text-light p-3 rounded">
            {`<MultiLibraryLoader
  libraries={{
    'chart.js': { accessor: 'Chart' },
    'moment': {}
  }}
  loading={<div>Loading libraries...</div>}
  debug={true}
>
  {(libraries) => {
    const Chart = libraries['chart.js'];
    const moment = libraries['moment'];
    
    return (
      <div>
        <h5>Multiple Libraries Loaded!</h5>
        <p>Chart.js: {Chart?.VERSION}</p>
        <p>Moment.js: {moment?.version}</p>
        
        {/* Use both libraries together */}
        <p>{moment ? moment().format('MMMM Do YYYY') : 'Not loaded'}</p>
        <canvas ref={(canvas) => {
          if (canvas && Chart) {
            // Chart.js initialization
          }
        }} />
      </div>
    );
  }}
</MultiLibraryLoader>`}
          </pre>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Example using the HOC pattern
 */
// Define a component that requires a library
interface MapComponentProps {
  libraryInstance?: any;
  center?: [number, number];
  zoom?: number;
}

// Component that will be wrapped with the library
const MapComponent: React.FC<MapComponentProps> = ({ libraryInstance: L, center = [51.505, -0.09], zoom = 13 }) => {
  return (
    <div>
      <h5>Leaflet.js Map Component</h5>
      <p>Leaflet version: {L?.version}</p>
      
      <div 
        id="leaflet-map" 
        style={{ height: '300px' }}
        ref={(mapElement) => {
          if (mapElement && L) {
            // Initialize map
            const map = L.map(mapElement).setView(center, zoom);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            // Add a marker
            L.marker(center).addTo(map)
              .bindPopup('A pretty popup.<br> Easily customizable.')
              .openPopup();
          }
        }}
      />
    </div>
  );
};

// Create the wrapped component using HOC
const MapWithLeaflet = withLibrary(MapComponent, 'leaflet', {
  loading: <div className="text-center p-4">Loading Leaflet.js map library...</div>,
  dependencies: [],
  debug: true
});

const HOCExample: React.FC = () => {
  return (
    <Card>
      <Card.Header>Higher-Order Component Pattern</Card.Header>
      <Card.Body>
        <p>
          For reusable components that depend on external libraries, the Higher-Order Component (HOC) pattern
          provides a clean way to encapsulate the library loading logic.
        </p>

        <div className="example-container p-3 border rounded bg-light">
          <MapWithLeaflet 
            center={[51.505, -0.09]} 
            zoom={13} 
          />
        </div>

        <div className="code-example mt-3">
          <pre className="bg-dark text-light p-3 rounded">
            {`// Define a component that requires a library
interface MapComponentProps {
  libraryInstance?: any;
  center?: [number, number];
  zoom?: number;
}

// Component that will be wrapped with the library
const MapComponent: React.FC<MapComponentProps> = ({ 
  libraryInstance: L, 
  center = [51.505, -0.09], 
  zoom = 13 
}) => {
  return (
    <div>
      <h5>Leaflet.js Map</h5>
      <p>Version: {L?.version}</p>
      
      <div 
        id="map" 
        style={{ height: '300px' }}
        ref={(el) => {
          if (el && L) {
            // Initialize map with Leaflet
            const map = L.map(el).setView(center, zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
              .addTo(map);
            L.marker(center).addTo(map);
          }
        }}
      />
    </div>
  );
};

// Create the wrapped component using HOC
const MapWithLeaflet = withLibrary(MapComponent, 'leaflet', {
  loading: <div>Loading Leaflet.js...</div>,
  debug: true
});

// Use it like a regular component
<MapWithLeaflet center={[51.505, -0.09]} zoom={13} />`}
          </pre>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * A more practical example showing a real-world use case
 */
const PracticalExample: React.FC = () => {
  const [selectedVisualizer, setSelectedVisualizer] = useState<string>('chartjs');
  
  return (
    <Card>
      <Card.Header>Practical Example</Card.Header>
      <Card.Body>
        <p>
          In a real application, you might want to offer users a choice of different visualization libraries
          or load specialized libraries only when needed.
        </p>

        <div className="example-container p-3 border rounded bg-light">
          <div className="mb-3">
            <label className="form-label">Select Visualization Library:</label>
            <div className="d-flex">
              <Button
                variant={selectedVisualizer === 'chartjs' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedVisualizer('chartjs')}
                className="me-2"
              >
                Chart.js
              </Button>
              <Button
                variant={selectedVisualizer === 'd3' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedVisualizer('d3')}
                className="me-2"
              >
                D3.js
              </Button>
              <Button
                variant={selectedVisualizer === 'plotly' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedVisualizer('plotly')}
              >
                Plotly.js
              </Button>
            </div>
          </div>

          <div className="visualizer-container mt-4">
            {selectedVisualizer === 'chartjs' && (
              <LibraryLoader
                library="chart.js"
                loading={<div className="text-center p-4">Loading Chart.js...</div>}
              >
                {(Chart) => (
                  <div>
                    <h5>Chart.js Visualization</h5>
                    <canvas 
                      height="250"
                      ref={(canvas) => {
                        if (canvas && Chart) {
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            new Chart(ctx, {
                              type: 'line',
                              data: {
                                labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                                datasets: [{
                                  label: 'Dataset 1',
                                  data: [65, 59, 80, 81, 56, 55, 40],
                                  fill: false,
                                  borderColor: 'rgb(75, 192, 192)',
                                  tension: 0.1
                                }, {
                                  label: 'Dataset 2',
                                  data: [28, 48, 40, 19, 86, 27, 90],
                                  fill: false,
                                  borderColor: 'rgb(255, 99, 132)',
                                  tension: 0.1
                                }]
                              },
                              options: {
                                responsive: true,
                                maintainAspectRatio: false
                              }
                            });
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </LibraryLoader>
            )}

            {selectedVisualizer === 'd3' && (
              <LibraryLoader
                library="d3"
                loading={<div className="text-center p-4">Loading D3.js...</div>}
              >
                {(d3) => (
                  <div>
                    <h5>D3.js Visualization</h5>
                    <svg 
                      width="100%" 
                      height="250" 
                      ref={(svg) => {
                        if (svg && d3) {
                          // Create sample data
                          const data: D3DataPoint[] = [
                            {name: 'A', value: 5},
                            {name: 'B', value: 10},
                            {name: 'C', value: 15},
                            {name: 'D', value: 10},
                            {name: 'E', value: 20}
                          ];

                          // Clear previous content
                          d3.select(svg).selectAll('*').remove();
                          
                          // Set dimensions
                          const width = svg.clientWidth;
                          const height = 250;
                          const margin = {top: 20, right: 30, bottom: 30, left: 40};
                          const innerWidth = width - margin.left - margin.right;
                          const innerHeight = height - margin.top - margin.bottom;
                          
                          // Create scales
                          const x = d3.scaleBand()
                            .domain(data.map(d => d.name))
                            .range([0, innerWidth])
                            .padding(0.1);
                          
                          const y = d3.scaleLinear()
                            .domain([0, d3.max(data, (d: D3DataPoint) => d.value) || 0])
                            .range([innerHeight, 0]);
                          
                          // Create SVG group
                          const g = d3.select(svg)
                            .append('g')
                            .attr('transform', `translate(${margin.left},${margin.top})`);
                          
                          // Add axes
                          g.append('g')
                            .attr('transform', `translate(0,${innerHeight})`)
                            .call(d3.axisBottom(x));
                          
                          g.append('g')
                            .call(d3.axisLeft(y));
                          
                          // Add bars
                          g.selectAll('rect')
                            .data(data)
                            .enter()
                            .append('rect')
                            .attr('x', (d: D3DataPoint) => x(d.name) || 0)
                            .attr('y', (d: D3DataPoint) => y(d.value))
                            .attr('width', x.bandwidth())
                            .attr('height', (d: D3DataPoint) => innerHeight - y(d.value))
                            .attr('fill', 'steelblue');
                        }
                      }}
                    />
                  </div>
                )}
              </LibraryLoader>
            )}

            {selectedVisualizer === 'plotly' && (
              <LibraryLoader
                library="plotly.js"
                loading={<div className="text-center p-4">Loading Plotly.js...</div>}
              >
                {(Plotly) => (
                  <div>
                    <h5>Plotly.js Visualization</h5>
                    <div 
                      id="plotly-chart" 
                      style={{ width: '100%', height: '250px' }}
                      ref={(plotEl) => {
                        if (plotEl && Plotly) {
                          const trace1 = {
                            x: [1, 2, 3, 4, 5],
                            y: [1, 6, 3, 6, 1],
                            mode: 'lines+markers',
                            type: 'scatter',
                            name: 'Team A'
                          };
                          
                          const trace2 = {
                            x: [1, 2, 3, 4, 5],
                            y: [4, 1, 7, 3, 6],
                            mode: 'lines+markers',
                            type: 'scatter',
                            name: 'Team B'
                          };
                          
                          const data = [trace1, trace2];
                          
                          const layout = {
                            title: 'Interactive Plot',
                            xaxis: {
                              title: 'Day'
                            },
                            yaxis: {
                              title: 'Value'
                            },
                            margin: {
                              l: 50,
                              r: 50,
                              b: 50,
                              t: 50,
                              pad: 4
                            }
                          };
                          
                          Plotly.newPlot(plotEl, data, layout, {responsive: true});
                        }
                      }}
                    />
                  </div>
                )}
              </LibraryLoader>
            )}
          </div>
        </div>

        <div className="mt-4 alert alert-info">
          <h5>Key Benefits of this Approach</h5>
          <ul className="mb-0">
            <li>Users only download the libraries they actually choose to use</li>
            <li>Improves initial page load time by deferring non-essential libraries</li>
            <li>Allows your application to offer multiple visualization options without requiring all libraries upfront</li>
            <li>Provides fallback options if a specific library fails to load</li>
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AsyncComponentExample; 