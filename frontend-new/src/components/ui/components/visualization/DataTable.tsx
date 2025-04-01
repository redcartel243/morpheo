import React, { useState, useMemo } from 'react';
import { BaseComponentProps } from '../types';

// Column definition
export interface DataTableColumn {
  field: string;
  headerName: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (params: any) => React.ReactNode;
}

// Sort direction
export type SortDirection = 'asc' | 'desc' | null;

// DataTable component props
export interface DataTableProps extends Omit<BaseComponentProps, 'style'> {
  data: any[];
  columns: DataTableColumn[];
  title?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  height?: string | number;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  striped?: boolean;
  style?: any;
  handleEvent?: (eventType: string, payload: any) => void;
}

/**
 * DataTable component for displaying tabular data
 * Supports sorting, filtering, pagination, and more
 */
export const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns = [],
  title,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  showPagination = true,
  height = 'auto',
  width = '100%',
  sortable = true,
  filterable = false,
  selectable = false,
  striped = true,
  style = {},
  className,
  testId,
  handleEvent
}) => {
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  
  // State for sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // State for filtering
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  // State for selection
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  
  // Apply sorting to data
  const sortData = (data: any[], field: string | null, direction: SortDirection | null) => {
    if (!field || !direction) return data;
    
    return [...data].sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];
      
      // Handle different types
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      // Default comparison for other types
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };
  
  // Apply filters to data
  const filterData = (data: any[], filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) return data;
    
    return data.filter(row => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String(row[field] || '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });
  };
  
  // Process data with sorting, filtering, and pagination
  const processedData = useMemo(() => {
    // Apply filtering
    const filteredData = filterData(data, filters);
    
    // Apply sorting
    const sortedData = sortData(filteredData, sortField, sortDirection);
    
    // Apply pagination
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    
    return {
      paginatedData: sortedData.slice(start, end),
      totalRows: sortedData.length,
      totalPages: Math.ceil(sortedData.length / rowsPerPage)
    };
  }, [data, filters, sortField, sortDirection, page, rowsPerPage, filterData, sortData]);
  
  // Get paginated data
  const paginatedData = processedData.paginatedData;
  
  // Handle sort change
  const handleSort = (field: string) => {
    if (!sortable) return;
    
    // Update sort state
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Fire event if handler exists
    if (handleEvent) {
      handleEvent('sort', { field, direction: sortDirection });
    }
  };
  
  // Handle filter change
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset to first page when filtering
    setPage(0);
    
    // Fire event if handler exists
    if (handleEvent) {
      handleEvent('filter', { field, value });
    }
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    
    // Fire event if handler exists
    if (handleEvent) {
      handleEvent('pageChange', { page: newPage });
    }
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Reset to first page
    
    // Fire event if handler exists
    if (handleEvent) {
      handleEvent('rowsPerPageChange', { rowsPerPage: newRowsPerPage });
    }
  };
  
  // Handle row selection
  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelected = { ...selectedRows, [id]: checked };
    setSelectedRows(newSelected);
    
    // Fire event with all selected rows
    if (handleEvent) {
      const selectedItems = Object.keys(newSelected).filter(key => newSelected[key]);
      handleEvent('selectionChange', { selectedRows: selectedItems });
    }
  };
  
  // Handle select all rows
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all visible rows
      const newSelected: Record<string, boolean> = {};
      paginatedData.forEach((row, index) => {
        const id = row.id || `row-${index}`;
        newSelected[id] = true;
      });
      setSelectedRows(newSelected);
    } else {
      // Clear selection
      setSelectedRows({});
    }
    
    // Fire event with all selected rows
    if (handleEvent) {
      const selectedItems = checked ? paginatedData.map((row, index) => row.id || `row-${index}`) : [];
      handleEvent('selectionChange', { selectedRows: selectedItems });
    }
  };
  
  // Calculate pagination info
  const totalRows = processedData.totalRows;
  const totalPages = processedData.totalPages;
  const startRow = page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalRows);
  
  // Render table
  return (
    <div 
      data-testid={testId}
      className={className}
      style={{
        width,
        height,
        overflow: 'auto',
        fontFamily: 'sans-serif',
        border: style.borderColor ? `1px solid ${style.borderColor}` : '1px solid #e0e0e0',
        borderRadius: style.borderRadius || '4px',
        backgroundColor: style.backgroundColor || '#fff',
        ...style
      }}
    >
      {/* Table title */}
      {title && (
        <div style={{
          padding: '16px',
          fontSize: '18px',
          fontWeight: 'bold',
          borderBottom: '1px solid #e0e0e0'
        }}>
          {title}
        </div>
      )}
      
      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {/* Header */}
        <thead>
          <tr style={{ 
            backgroundColor: '#f5f5f5', 
            position: 'sticky', 
            top: 0,
            boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)' 
          }}>
            {/* Checkbox for select all */}
            {selectable && (
              <th style={{ padding: '12px 16px', textAlign: 'center', width: '48px' }}>
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={paginatedData.length > 0 && paginatedData.every((row, index) => 
                    selectedRows[row.id || `row-${index}`])}
                />
              </th>
            )}
            
            {/* Column headers */}
            {columns.map((column, index) => (
              <th 
                key={`header-${index}`}
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left',
                  fontWeight: 'bold',
                  cursor: sortable && column.sortable !== false ? 'pointer' : 'default',
                  width: column.width,
                  userSelect: 'none'
                }}
                onClick={() => sortable && column.sortable !== false && handleSort(column.field)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {column.headerName}
                  
                  {/* Sort indicator */}
                  {sortable && sortField === column.field && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
          
          {/* Filter row */}
          {filterable && (
            <tr>
              {selectable && <th style={{ padding: '8px' }}></th>}
              
              {columns.map((column, index) => (
                <th key={`filter-${index}`} style={{ padding: '8px' }}>
                  {column.filterable !== false && (
                    <input
                      type="text"
                      value={filters[column.field] || ''}
                      onChange={(e) => handleFilterChange(column.field, e.target.value)}
                      placeholder={`Filter ${column.headerName}`}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          )}
        </thead>
        
        {/* Body */}
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length + (selectable ? 1 : 0)}
                style={{ 
                  padding: '32px 16px', 
                  textAlign: 'center',
                  color: '#666'
                }}
              >
                No data available
              </td>
            </tr>
          ) : (
            paginatedData.map((row, rowIndex) => (
              <tr 
                key={`row-${rowIndex}`}
                style={{ 
                  backgroundColor: striped && rowIndex % 2 !== 0 ? '#f9f9f9' : 'white'
                }}
                className={`table-row ${striped && rowIndex % 2 !== 0 ? 'striped-row' : ''}`}
              >
                {/* Row selection checkbox */}
                {selectable && (
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedRows[row.id || `row-${rowIndex}`]}
                      onChange={(e) => handleRowSelect(row.id || `row-${rowIndex}`, e.target.checked)}
                    />
                  </td>
                )}
                
                {/* Row cells */}
                {columns.map((column, cellIndex) => (
                  <td 
                    key={`cell-${rowIndex}-${cellIndex}`}
                    style={{ 
                      padding: '12px 16px', 
                      borderBottom: '1px solid #e0e0e0'
                    }}
                  >
                    {column.renderCell ? column.renderCell(row) : row[column.field]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {/* Pagination */}
      {showPagination && totalRows > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          padding: '12px 16px',
          borderTop: '1px solid #e0e0e0'
        }}>
          {/* Rows per page selector */}
          <div>
            <span style={{ marginRight: '8px' }}>Rows per page:</span>
            <select 
              value={rowsPerPage} 
              onChange={handleRowsPerPageChange}
              style={{ padding: '4px 8px' }}
            >
              {pageSizeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          {/* Page info */}
          <div>
            {startRow}-{endRow} of {totalRows}
          </div>
          
          {/* Page navigation */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => handlePageChange(0)}
              disabled={page === 0}
              style={{ 
                margin: '0 4px', 
                padding: '4px 8px',
                cursor: page === 0 ? 'default' : 'pointer',
                opacity: page === 0 ? 0.5 : 1
              }}
            >
              {'<<'}
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              style={{ 
                margin: '0 4px', 
                padding: '4px 8px',
                cursor: page === 0 ? 'default' : 'pointer',
                opacity: page === 0 ? 0.5 : 1
              }}
            >
              {'<'}
            </button>
            <span style={{ margin: '0 8px' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages - 1}
              style={{ 
                margin: '0 4px', 
                padding: '4px 8px',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.5 : 1
              }}
            >
              {'>'}
            </button>
            <button
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
              style={{ 
                margin: '0 4px', 
                padding: '4px 8px',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.5 : 1
              }}
            >
              {'>>'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add CSS for hover effect
const style = document.createElement('style');
style.innerHTML = `
  .table-row:hover {
    background-color: #f1f1f1 !important;
  }
`;
document.head.appendChild(style);

export default DataTable; 