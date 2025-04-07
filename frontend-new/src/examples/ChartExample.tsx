import React, { useState, useEffect } from 'react';
import LineChart from '../components/ui/charts/LineChart';
import BarChart from '../components/ui/charts/BarChart';
import PieChart from '../components/ui/charts/PieChart';
import DataGrid from '../components/ui/charts/DataGrid';

/**
 * Example component that demonstrates the usage of various chart components.
 * This is a reference implementation to guide the AI in generating chart-based applications.
 */
const ChartExample: React.FC = () => {
  // Sample data for charts
  const [lineData, setLineData] = useState([
    { name: 'Jan', value: 400, prevYear: 300 },
    { name: 'Feb', value: 300, prevYear: 400 },
    { name: 'Mar', value: 600, prevYear: 500 },
    { name: 'Apr', value: 800, prevYear: 700 },
    { name: 'May', value: 500, prevYear: 400 },
    { name: 'Jun', value: 750, prevYear: 600 },
  ]);

  const barData = [
    { category: 'Product A', sales: 120, revenue: 3200 },
    { category: 'Product B', sales: 80, revenue: 2800 },
    { category: 'Product C', sales: 200, revenue: 5000 },
    { category: 'Product D', sales: 60, revenue: 1800 },
  ];

  const pieData = [
    { name: 'Social Media', value: 35 },
    { name: 'Direct Search', value: 25 },
    { name: 'Email', value: 20 },
    { name: 'Referral', value: 15 },
    { name: 'Other', value: 5 },
  ];

  const gridColumns = [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 200, sortable: true },
    { field: 'email', headerName: 'Email', width: 250, sortable: true },
    { field: 'status', headerName: 'Status', width: 120, sortable: true },
    { field: 'lastActive', headerName: 'Last Active', width: 150, type: 'date' as const, sortable: true },
  ];

  const gridData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', lastActive: '2023-02-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive', lastActive: '2023-01-20' },
    { id: 3, name: 'Robert Johnson', email: 'robert@example.com', status: 'Active', lastActive: '2023-02-20' },
    { id: 4, name: 'Emily Davis', email: 'emily@example.com', status: 'Pending', lastActive: '2023-02-10' },
    { id: 5, name: 'Michael Wilson', email: 'michael@example.com', status: 'Active', lastActive: '2023-02-22' },
  ];

  // Simulate fetching updated data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLineData([
        { name: 'Jan', value: 420, prevYear: 300 },
        { name: 'Feb', value: 320, prevYear: 400 },
        { name: 'Mar', value: 620, prevYear: 500 },
        { name: 'Apr', value: 820, prevYear: 700 },
        { name: 'May', value: 520, prevYear: 400 },
        { name: 'Jun', value: 770, prevYear: 600 },
        { name: 'Jul', value: 900, prevYear: 800 },
      ]);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold mb-6">Data Visualization Components</h1>
      
      {/* Line Chart Example */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Line Chart</h2>
        <div className="h-80">
          <LineChart
            data={lineData}
            dataKey="value"
            secondaryDataKey="prevYear"
            xAxisKey="name"
            title="Monthly Performance"
            subtitle="Current vs Previous Year"
            lineColor="#8884d8"
            secondaryLineColor="#82ca9d"
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            xAxisLabel="Month"
            yAxisLabel="Value"
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <p>This line chart shows monthly performance data with comparison to the previous year.</p>
          <p>The chart automatically updates with new data after 3 seconds.</p>
        </div>
      </div>
      
      {/* Bar Chart Example */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Bar Chart</h2>
        <div className="h-80">
          <BarChart
            data={barData}
            dataKey="sales"
            secondaryDataKey="revenue"
            xAxisKey="category"
            title="Product Performance"
            subtitle="Sales and Revenue by Product"
            barColor="#8884d8"
            secondaryBarColor="#82ca9d"
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            xAxisLabel="Product"
            yAxisLabel="Units"
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <p>This bar chart displays product performance with both sales units and revenue.</p>
          <p>Each product category has two values represented by different colored bars.</p>
        </div>
      </div>
      
      {/* Pie Chart Example */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Pie Chart</h2>
        <div className="h-80">
          <PieChart
            data={pieData}
            dataKey="value"
            nameKey="name"
            title="Traffic Sources"
            subtitle="Percentage Distribution by Source"
            showTooltip={true}
            showLegend={true}
            legendPosition="bottom"
            showLabels={true}
            isDonut={true}
            centerLabel="Traffic"
            centerSubLabel="Distribution"
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <p>This donut chart shows the distribution of traffic sources.</p>
          <p>The chart includes labels, a legend, and a center label for additional context.</p>
        </div>
      </div>
      
      {/* Data Grid Example */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Data Grid</h2>
        <DataGrid
          data={gridData}
          columns={gridColumns}
          title="User Activity"
          subtitle="Recent user activity and status"
          height={400}
          showPagination={true}
          showSearch={true}
          hoverable={true}
          striped={true}
          selectable={true}
          onRowClick={(row) => console.log('Row clicked:', row)}
        />
        <div className="mt-2 text-sm text-gray-500">
          <p>This data grid displays user information with sorting, pagination, and search capabilities.</p>
          <p>Click on a row to select it and see details in the console.</p>
        </div>
      </div>
      
      {/* Using Data URL Example (commented out) */}
      {/* <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">API Data Example</h2>
        <div className="h-80">
          <LineChart
            dataUrl="https://api.example.com/data/timeseries"
            dataKey="value"
            xAxisKey="date"
            title="API Data Visualization"
            subtitle="Data loaded from external API"
            lineColor="#8884d8"
            refreshInterval={60000}
            pollingEnabled={true}
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <p>This chart loads data from an external API and refreshes automatically every minute.</p>
        </div>
      </div> */}
    </div>
  );
};

export default ChartExample; 