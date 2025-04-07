import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

export interface DataPoint {
  [key: string]: any;
}

export interface Column {
  field: string;
  headerName: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (params: { row: DataPoint; value: any; field: string }) => React.ReactNode;
  valueGetter?: (params: { row: DataPoint; field: string }) => any;
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  type?: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  hide?: boolean;
}

export interface DataGridProps {
  id?: string;
  className?: string;
  data?: DataPoint[];
  dataUrl?: string;
  columns: Column[];
  pageSize?: number;
  rowsPerPageOptions?: number[];
  sortModel?: { field: string; sort: 'asc' | 'desc' }[];
  filterModel?: { field: string; value: string }[];
  height?: number | string;
  width?: number | string;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  onRowClick?: (row: DataPoint) => void;
  onSelectionChange?: (selectedRows: DataPoint[]) => void;
  onDataLoad?: (data: DataPoint[]) => void;
  onError?: (error: Error) => void;
  refreshInterval?: number;
  pollingEnabled?: boolean;
  transformData?: (data: any) => DataPoint[];
  showPagination?: boolean;
  showSearch?: boolean;
  selectable?: boolean;
  stickyHeader?: boolean;
  dense?: boolean;
  borderless?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  headerBackgroundColor?: string;
  rowBackgroundColor?: string;
  borderColor?: string;
  noDataText?: string;
  loadingText?: string;
  errorText?: string;
}

const DataGrid: React.FC<DataGridProps> = ({
  id,
  className = '',
  data: initialData,
  dataUrl,
  columns,
  pageSize = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  sortModel: initialSortModel,
  filterModel: initialFilterModel,
  height = 'auto',
  width = '100%',
  loading: externalLoading,
  title,
  subtitle,
  onRowClick,
  onSelectionChange,
  onDataLoad,
  onError,
  refreshInterval = 0,
  pollingEnabled = false,
  transformData,
  showPagination = true,
  showSearch = true,
  selectable = false,
  stickyHeader = false,
  dense = false,
  borderless = false,
  striped = false,
  hoverable = true,
  headerBackgroundColor = '#f1f5f9',
  rowBackgroundColor = 'white',
  borderColor = '#e5e7eb',
  noDataText = 'No data to display',
  loadingText = 'Loading data...',
  errorText = 'Error loading data'
}) => {
  // State
  const [data, setData] = useState<DataPoint[]>(initialData || []);
  const [loading, setLoading] = useState<boolean>(externalLoading || !!dataUrl);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sortModel, setSortModel] = useState(initialSortModel || []);
  const [filterModel, setFilterModel] = useState(initialFilterModel || []);
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<{ [key: string]: boolean }>({});

  // Function to format data
  const formatData = (rawData: any): DataPoint[] => {
    if (transformData) {
      return transformData(rawData);
    }

    // If the data is an array, return it directly
    if (Array.isArray(rawData)) {
      return rawData;
    }

    // If data is an object with a data property that is an array
    if (rawData && typeof rawData === 'object' && Array.isArray(rawData.data)) {
      return rawData.data;
    }

    // If data is an object with properties (non-array)
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      // Try to convert to array of objects
      return Object.entries(rawData).map(([key, value]) => {
        if (typeof value === 'object') {
          return { id: key, ...value };
        }
        return { id: key, value };
      });
    }

    console.error('Unable to parse data format', rawData);
    return [];
  };

  // Function to fetch data
  const fetchData = async () => {
    if (!dataUrl) return;

    try {
      setLoading(true);
      const response = await axios.get(dataUrl);
      const formattedData = formatData(response.data);
      setData(formattedData);
      setError(null);
      if (onDataLoad) onDataLoad(formattedData);
    } catch (err) {
      console.error('Error fetching grid data:', err);
      setError(err as Error);
      if (onError) onError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (dataUrl) {
      fetchData();
    }
  }, [dataUrl]);

  // Set up polling if enabled
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (pollingEnabled && refreshInterval > 0 && dataUrl) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingEnabled, refreshInterval, dataUrl]);

  // Update data if initialData changes
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  // Update loading state if externalLoading changes
  useEffect(() => {
    if (externalLoading !== undefined) {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  // Update sort model if initialSortModel changes
  useEffect(() => {
    if (initialSortModel) {
      setSortModel(initialSortModel);
    }
  }, [initialSortModel]);

  // Update filter model if initialFilterModel changes
  useEffect(() => {
    if (initialFilterModel) {
      setFilterModel(initialFilterModel);
    }
  }, [initialFilterModel]);

  // Notify when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = data.filter((row, idx) => selectedRows[getRowId(row, idx)]);
      onSelectionChange(selected);
    }
  }, [selectedRows, data]);

  // Function to get row ID
  const getRowId = (row: DataPoint, index: number) => {
    return row.id?.toString() || index.toString();
  };

  // Function to handle row click
  const handleRowClick = (row: DataPoint) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Function to handle row selection
  const handleRowSelection = (row: DataPoint, index: number) => {
    const rowId = getRowId(row, index);
    setSelectedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  // Function to handle select all rows
  const handleSelectAll = () => {
    if (Object.keys(selectedRows).length === processedData.length) {
      // If all are selected, deselect all
      setSelectedRows({});
    } else {
      // Select all
      const newSelected: { [key: string]: boolean } = {};
      processedData.forEach((row, idx) => {
        newSelected[getRowId(row, idx)] = true;
      });
      setSelectedRows(newSelected);
    }
  };

  // Function to handle sort change
  const handleSortChange = (field: string) => {
    const column = columns.find(col => col.field === field);
    if (!column?.sortable) return;

    let newSortModel = [...sortModel];
    const currentSort = newSortModel.find(s => s.field === field);
    
    if (currentSort) {
      if (currentSort.sort === 'asc') {
        currentSort.sort = 'desc';
      } else {
        // Remove sort for this column
        newSortModel = newSortModel.filter(s => s.field !== field);
      }
    } else {
      // Add new sort
      newSortModel.push({ field, sort: 'asc' });
    }
    
    setSortModel(newSortModel);
  };

  // Function to handle page change
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  // Function to handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Function to handle search change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0);
  };

  // Process and filter data based on search and filter model
  const filteredData = useMemo(() => {
    let processed = [...data];

    // Apply filters from filter model
    if (filterModel.length > 0) {
      processed = processed.filter(row => {
        return filterModel.every(filter => {
          const value = row[filter.field];
          if (value === undefined || value === null) return false;
          
          const column = columns.find(col => col.field === filter.field);
          const filterValue = filter.value.toString().toLowerCase();
          
          if (column?.valueGetter) {
            const computedValue = column.valueGetter({ row, field: filter.field });
            return String(computedValue).toLowerCase().includes(filterValue);
          }
          
          return String(value).toLowerCase().includes(filterValue);
        });
      });
    }

    // Apply global search
    if (search) {
      const searchLower = search.toLowerCase();
      processed = processed.filter(row => {
        return columns.some(column => {
          if (column.hide) return false;
          
          let value;
          if (column.valueGetter) {
            value = column.valueGetter({ row, field: column.field });
          } else {
            value = row[column.field];
          }
          
          if (value === undefined || value === null) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    return processed;
  }, [data, search, filterModel, columns]);

  // Apply sorting
  const processedData = useMemo(() => {
    if (sortModel.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      for (const sort of sortModel) {
        const column = columns.find(col => col.field === sort.field);
        let valueA, valueB;

        if (column?.valueGetter) {
          valueA = column.valueGetter({ row: a, field: sort.field });
          valueB = column.valueGetter({ row: b, field: sort.field });
        } else {
          valueA = a[sort.field];
          valueB = b[sort.field];
        }

        // Handle undefined or null values
        if (valueA === undefined || valueA === null) return sort.sort === 'asc' ? -1 : 1;
        if (valueB === undefined || valueB === null) return sort.sort === 'asc' ? 1 : -1;

        // Determine value type and compare accordingly
        const type = column?.type || (typeof valueA === 'number' ? 'number' : 'string');
        
        let comparison = 0;
        if (type === 'number') {
          comparison = Number(valueA) - Number(valueB);
        } else if (type === 'date') {
          comparison = new Date(valueA).getTime() - new Date(valueB).getTime();
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }

        if (comparison !== 0) {
          return sort.sort === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredData, sortModel, columns]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!showPagination) {
      return processedData;
    }
    
    const start = page * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, page, rowsPerPage, showPagination]);

  // Function to get sort direction for a column
  const getSortDirection = (field: string) => {
    const sort = sortModel.find(s => s.field === field);
    return sort ? sort.sort : null;
  };

  // Function to render cell content
  const renderCellContent = (row: DataPoint, column: Column) => {
    let value;
    
    if (column.valueGetter) {
      value = column.valueGetter({ row, field: column.field });
    } else {
      value = row[column.field];
    }
    
    if (column.renderCell) {
      return column.renderCell({ row, value, field: column.field });
    }
    
    // Format the value based on column type
    if (value === undefined || value === null) {
      return '-';
    }
    
    if (column.type === 'boolean') {
      return value ? '✓' : '✗';
    }
    
    if (column.type === 'date' && column.format) {
      try {
        const date = new Date(value);
        return new Intl.DateTimeFormat('default', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(date);
      } catch (error) {
        return value;
      }
    }
    
    return value;
  };

  // Render loading state
  if (loading && data.length === 0) {
    return (
      <div 
        id={id} 
        className={`flex items-center justify-center p-4 ${className}`}
        style={{ height: height === 'auto' ? '200px' : height }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">{loadingText}</span>
      </div>
    );
  }

  // Render error state
  if (error && data.length === 0) {
    return (
      <div 
        id={id} 
        className={`flex items-center justify-center p-4 text-red-500 ${className}`}
        style={{ height: height === 'auto' ? '200px' : height }}
      >
        <div>{errorText}</div>
      </div>
    );
  }

  return (
    <div 
      id={id} 
      className={`flex flex-col ${className}`}
      style={{ width }}
    >
      {/* Header section with title and search */}
      {(title || subtitle || showSearch) && (
        <div className="flex justify-between items-center mb-4">
          <div>
            {title && <div className="text-lg font-semibold">{title}</div>}
            {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
          </div>
          
          {showSearch && (
            <div className="flex">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search..."
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Table container */}
      <div 
        className={`overflow-x-auto border ${borderless ? 'border-0' : `border-${borderColor}`} rounded-md`}
        style={{ height: height !== 'auto' ? height : undefined }}
      >
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          {/* Table header */}
          <thead className={`bg-${headerBackgroundColor} ${stickyHeader ? 'sticky top-0' : ''}`}>
            <tr>
              {/* Checkbox column if selectable */}
              {selectable && (
                <th 
                  className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${borderless ? '' : 'border-b'}`}
                  style={{ width: 40 }}
                >
                  <input
                    type="checkbox"
                    checked={Object.keys(selectedRows).length > 0 && Object.keys(selectedRows).length === processedData.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              
              {/* Column headers */}
              {columns.filter(col => !col.hide).map((column) => (
                <th
                  key={column.field}
                  className={`
                    px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider 
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                    ${borderless ? '' : 'border-b'}
                    text-${column.headerAlign || column.align || 'left'}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSortChange(column.field)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.headerName}</span>
                    {column.sortable && getSortDirection(column.field) && (
                      <span className="ml-1">
                        {getSortDirection(column.field) === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Table body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={getRowId(row, rowIndex)}
                  onClick={() => handleRowClick(row)}
                  className={`
                    ${hoverable ? 'hover:bg-gray-50 cursor-pointer' : ''}
                    ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : `bg-${rowBackgroundColor}`}
                    ${selectedRows[getRowId(row, rowIndex)] ? 'bg-blue-50' : ''}
                    ${dense ? 'h-8' : ''}
                  `}
                >
                  {/* Checkbox cell if selectable */}
                  {selectable && (
                    <td className={`px-3 py-${dense ? 1 : 4} whitespace-nowrap ${borderless ? '' : 'border-b'}`}>
                      <input
                        type="checkbox"
                        checked={!!selectedRows[getRowId(row, rowIndex)]}
                        onChange={() => handleRowSelection(row, rowIndex)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  
                  {/* Data cells */}
                  {columns.filter(col => !col.hide).map((column) => (
                    <td 
                      key={column.field}
                      className={`px-3 py-${dense ? 1 : 4} whitespace-nowrap ${borderless ? '' : 'border-b'} text-${column.align || 'left'}`}
                    >
                      {renderCellContent(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.filter(col => !col.hide).length + (selectable ? 1 : 0)}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  {loading ? loadingText : noDataText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {showPagination && processedData.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-2">
          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">Rows per page:</label>
            <select
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
              className="border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {rowsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-4">
              {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, processedData.length)} of {processedData.length}
            </span>
            
            <button
              onClick={() => handleChangePage(page - 1)}
              disabled={page === 0}
              className={`${page === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'} mr-2 px-2 py-1 rounded-md`}
            >
              Previous
            </button>
            
            <button
              onClick={() => handleChangePage(page + 1)}
              disabled={(page + 1) * rowsPerPage >= processedData.length}
              className={`${
                (page + 1) * rowsPerPage >= processedData.length ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
              } px-2 py-1 rounded-md`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGrid; 