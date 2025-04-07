/*
 * ARCHIVED COMPONENT - DO NOT USE IN PRODUCTION
 * 
 * This component demonstrates an older approach to state management
 * that has been replaced with Morpheo's current architecture.
 * 
 * It is kept for reference purposes only.
 * 
 * For current patterns, refer to the documentation or current examples.
 */

import React, { useEffect } from 'react';
import { 
  AppProvider, 
  useAppDispatch, 
  useAppSelector, 
  useAppState,
  useAppStateValue,
  initializeForm,
  setFormValue,
  submitForm,
  submitFormSuccess,
  addNotification,
  setEntities,
  toggleDarkMode,
  showToast,
  selectDarkMode,
  selectForm,
  selectFormValues
} from '../components/ui/state/Store';
import { 
  useDerivedTasksState, 
  useComposedThemeAndTaskState,
  selectFilteredTasks,
  selectTasksStats 
} from '../components/ui/state/DerivedState';

// Mock component imports for demo purposes
// In a real implementation, you would import actual UI components
const Card = ({ title, subtitle, children, style }: any) => (
  <div style={{ 
    border: '1px solid #ddd', 
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    ...style
  }}>
    {title && <h2 style={{ marginTop: 0, marginBottom: subtitle ? '4px' : '16px' }}>{title}</h2>}
    {subtitle && <div style={{ marginBottom: '16px', color: '#666' }}>{subtitle}</div>}
    {children}
  </div>
);

const Grid = ({ container, item, xs, md, spacing, children }: any) => {
  if (container) {
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        margin: `-${spacing/2}px` 
      }}>
        {children}
      </div>
    );
  }
  if (item) {
    const style: React.CSSProperties = { 
      padding: `${spacing/2}px`,
      width: `${(xs === 12 ? 100 : xs * 8.33)}%`,
    };
    
    // Using inline styles for simplicity in this demo
    // In a real component, you would use media queries properly
    if (md) {
      // Note: this won't actually apply the media query in inline styles
      // Just for demonstration purposes
      style.width = `${(md === 12 ? 100 : md * 8.33)}%`;
    }
    
    return (
      <div style={style}>
        {children}
      </div>
    );
  }
  return <div>{children}</div>;
};

const Text = ({ variant, children, style, color }: any) => {
  let fontSize = '1rem';
  let fontWeight = 'normal';
  let marginBottom = '0.5rem';
  
  switch (variant) {
    case 'h1':
      fontSize = '2.5rem';
      fontWeight = 'bold';
      marginBottom = '1rem';
      break;
    case 'h2':
      fontSize = '2rem';
      fontWeight = 'bold';
      marginBottom = '0.75rem';
      break;
    case 'h3':
      fontSize = '1.75rem';
      fontWeight = 'bold';
      marginBottom = '0.75rem';
      break;
    case 'h4':
      fontSize = '1.5rem';
      fontWeight = 'bold';
      marginBottom = '0.5rem';
      break;
    case 'subtitle1':
      fontSize = '1.1rem';
      fontWeight = '500';
      marginBottom = '0.5rem';
      break;
    case 'body2':
      fontSize = '0.875rem';
      break;
    case 'caption':
      fontSize = '0.75rem';
      color = color || '#666';
      break;
  }
  
  return (
    <div style={{ fontSize, fontWeight, marginBottom, color, ...style }}>
      {children}
    </div>
  );
};

const Button = ({ 
  children, 
  variant = 'text', 
  color = 'primary',
  onClick,
  disabled,
  fullWidth,
  type,
  ariaLabel,
}: any) => {
  const getBackgroundColor = () => {
    if (disabled) return '#e0e0e0';
    if (variant === 'contained') {
      switch (color) {
        case 'primary': return '#1976d2';
        case 'secondary': return '#9c27b0';
        case 'error': return '#d32f2f';
        default: return '#1976d2';
      }
    }
    return 'transparent';
  };
  
  const getTextColor = () => {
    if (disabled) return '#9e9e9e';
    if (variant === 'contained') return 'white';
    switch (color) {
      case 'primary': return '#1976d2';
      case 'secondary': return '#9c27b0';
      case 'error': return '#d32f2f';
      default: return '#1976d2';
    }
  };
  
  const getBorder = () => {
    if (variant === 'outlined') {
      switch (color) {
        case 'primary': return '1px solid #1976d2';
        case 'secondary': return '1px solid #9c27b0';
        case 'error': return '1px solid #d32f2f';
        default: return '1px solid #1976d2';
      }
    }
    return 'none';
  };
  
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        border: getBorder(),
        borderRadius: '4px',
        padding: variant === 'icon' ? '4px' : '8px 16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        fontSize: '0.875rem',
        width: fullWidth ? '100%' : 'auto',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  );
};

const TextInput = ({ 
  label, 
  value, 
  onChange, 
  error, 
  required, 
  fullWidth,
  placeholder 
}: any) => {
  return (
    <div style={{ marginBottom: '16px', width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '8px',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: `1px solid ${error ? 'red' : '#ddd'}`,
          borderRadius: '4px',
          fontSize: '1rem',
        }}
      />
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// Demo Task component
const Task = ({ task, onToggle, onDelete }: { 
  task: any; 
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const darkMode = useAppSelector(selectDarkMode);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      margin: '8px 0',
      borderRadius: '4px',
      backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5',
      borderLeft: `4px solid ${
        task.priority === 'high' ? '#f44336' :
        task.priority === 'medium' ? '#ff9800' : '#4caf50'
      }`
    }}>
      <div style={{ marginRight: '12px' }}>
        <input 
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
        />
      </div>
      <div style={{ 
        flexGrow: 1,
        textDecoration: task.completed ? 'line-through' : 'none',
        opacity: task.completed ? 0.6 : 1
      }}>
        <Text>{task.name}</Text>
        {task.category && (
          <Text variant="caption" color="text.secondary">
            {task.category}
          </Text>
        )}
      </div>
      <div>
        <Button 
          variant="icon" 
          color="error" 
          onClick={() => onDelete(task.id)}
          ariaLabel="Delete task"
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

// TaskList component using derived state
const TaskList = () => {
  const dispatch = useAppDispatch();
  const { tasks, stats, isLoading } = useDerivedTasksState('taskFilters');
  
  useEffect(() => {
    // Initialize task filter form
    dispatch(initializeForm({
      formId: 'taskFilters',
      initialValues: {
        searchTerm: '',
        categoryFilter: '',
        showCompleted: true
      }
    }));
  }, [dispatch]);
  
  const handleToggleComplete = (id: string) => {
    dispatch({
      type: 'data/UPDATE_ENTITY',
      payload: {
        entityType: 'tasks',
        id,
        changes: { 
          completed: !tasks.find(t => t.id === id)?.completed 
        }
      }
    });
    
    dispatch(showToast({ 
      message: 'Task updated', 
      type: 'success' 
    }));
  };
  
  const handleDeleteTask = (id: string) => {
    dispatch({
      type: 'data/REMOVE_ENTITY',
      payload: {
        entityType: 'tasks',
        id
      }
    });
    
    dispatch(addNotification({
      id: `task-deleted-${Date.now()}`,
      message: 'Task deleted',
      type: 'info'
    }));
  };
  
  // Get filters from form state
  const filters = useAppSelector(selectFormValues('taskFilters'));
  
  const handleFilterChange = (field: string, value: any) => {
    dispatch(setFormValue({
      formId: 'taskFilters',
      field,
      value
    }));
  };
  
  return (
    <div>
      <Card title="Task Filters">
        <Grid container spacing={8}>
          <Grid item xs={12} md={6}>
            <TextInput
              label="Search"
              value={filters.searchTerm || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search tasks..."
              fullWidth
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="show-completed"
                checked={filters.showCompleted}
                onChange={(e) => handleFilterChange('showCompleted', e.target.checked)}
              />
              <label htmlFor="show-completed" style={{ marginLeft: '8px' }}>
                Show completed
              </label>
            </div>
          </Grid>
          <Grid item xs={6} md={3}>
            <Button 
              onClick={() => dispatch(toggleDarkMode())}
              variant="outlined"
            >
              Toggle Theme
            </Button>
          </Grid>
        </Grid>
      </Card>
      
      <Card 
        title="Tasks" 
        subtitle={`${stats.total} tasks, ${stats.complete} completed`}
      >
        {isLoading ? (
          <div>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div>No tasks found</div>
        ) : (
          <div>
            {tasks.map(task => (
              <Task 
                key={task.id} 
                task={task} 
                onToggle={handleToggleComplete}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// Form using state management
const TaskForm = () => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector(selectForm('newTask'));
  
  useEffect(() => {
    // Initialize form
    dispatch(initializeForm({
      formId: 'newTask',
      initialValues: {
        name: '',
        category: '',
        priority: 'medium'
      },
      validationRules: {
        name: {
          required: true,
          minLength: 3
        }
      }
    }));
  }, [dispatch]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState?.valid) return;
    
    dispatch(submitForm('newTask'));
    
    // Simulate API call
    setTimeout(() => {
      const values = formState?.values;
      
      // Add the new task to the store
      dispatch(setEntities({
        entityType: 'tasks',
        entities: [{
          id: Date.now().toString(),
          name: values.name,
          category: values.category,
          priority: values.priority,
          completed: false
        }]
      }));
      
      dispatch(submitFormSuccess('newTask'));
      
      // Reset form
      dispatch({
        type: 'forms/RESET_FORM',
        payload: 'newTask'
      });
      
      dispatch(showToast({
        message: 'Task added successfully',
        type: 'success'
      }));
    }, 500);
  };
  
  const handleInputChange = (field: string, value: any) => {
    dispatch(setFormValue({
      formId: 'newTask',
      field,
      value
    }));
  };
  
  if (!formState) return null;
  
  return (
    <Card title="Add New Task">
      <form onSubmit={handleSubmit}>
        <Grid container spacing={16}>
          <Grid item xs={12}>
            <TextInput
              label="Task Name"
              value={formState.values?.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
              error={formState.touched?.name && formState.errors?.name}
              required
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextInput
              label="Category"
              value={formState.values?.category || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('category', e.target.value)}
              placeholder="e.g. Work, Personal, etc."
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <div>
              <Text variant="body2" style={{ marginBottom: '8px' }}>Priority</Text>
              <select
                value={formState.values?.priority || 'medium'}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!formState.valid || formState.submitting}
              fullWidth
            >
              {formState.submitting ? 'Adding...' : 'Add Task'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Card>
  );
};

// Component that shows composed state
const StatsDisplay = () => {
  // Using composed state that combines theme and task state
  const { darkMode, stats, categories, priorityDistribution } = useComposedThemeAndTaskState('taskFilters');
  
  return (
    <Card 
      title="Task Statistics" 
      style={{ backgroundColor: darkMode ? '#1a1a1a' : '#ffffff' }}
    >
      <Grid container spacing={16}>
        <Grid item xs={6} md={3}>
          <Text variant="h4">{stats.total}</Text>
          <Text variant="body2">Total Tasks</Text>
        </Grid>
        <Grid item xs={6} md={3}>
          <Text variant="h4">{stats.complete}</Text>
          <Text variant="body2">Completed</Text>
        </Grid>
        <Grid item xs={6} md={3}>
          <Text variant="h4">{stats.incomplete}</Text>
          <Text variant="body2">Remaining</Text>
        </Grid>
        <Grid item xs={6} md={3}>
          <Text variant="h4">{Math.round(stats.completionRate * 100)}%</Text>
          <Text variant="body2">Completion Rate</Text>
        </Grid>
      </Grid>
      
      <div style={{ marginTop: '24px' }}>
        <Text variant="subtitle1">Categories</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {categories.length ? categories.map((category: string) => (
            <span 
              key={category} 
              style={{ 
                padding: '4px 8px', 
                backgroundColor: darkMode ? '#333' : '#f0f0f0',
                borderRadius: '4px'
              }}
            >
              {category}
            </span>
          )) : <Text>No categories</Text>}
        </div>
      </div>
      
      <div style={{ marginTop: '24px' }}>
        <Text variant="subtitle1">Priority Distribution</Text>
        <div style={{
          display: 'flex',
          height: '24px',
          borderRadius: '4px',
          overflow: 'hidden',
          marginTop: '8px'
        }}>
          {Object.entries(priorityDistribution).map(([priority, count]) => {
            const color = 
              priority === 'high' ? '#f44336' :
              priority === 'medium' ? '#ff9800' : 
              '#4caf50';
            
            const percentage = stats.total ? (count as number / stats.total) * 100 : 0;
            
            return (
              <div 
                key={priority}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                {percentage > 10 ? `${priority}: ${count}` : ''}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

// Toast component for notifications
const Toast = () => {
  // Get toast state from the central app state
  const appState = useAppStateValue(state => state.ui.toast);
  
  // Create a local dispatch function
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    if (appState?.visible) {
      const timer = setTimeout(() => {
        dispatch({ type: 'ui/HIDE_TOAST' });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [appState, dispatch]);
  
  if (!appState || !appState.visible) return null;
  
  const backgroundColor = 
    appState.type === 'success' ? '#4caf50' :
    appState.type === 'error' ? '#f44336' :
    appState.type === 'warning' ? '#ff9800' : 
    '#2196f3';
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor,
      color: 'white',
      padding: '12px 24px',
      borderRadius: '4px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      {appState.message}
    </div>
  );
};

// Initialize mock data
const mockTasks = [
  { id: '1', name: 'Complete project proposal', category: 'Work', priority: 'high', completed: false },
  { id: '2', name: 'Buy groceries', category: 'Personal', priority: 'medium', completed: true },
  { id: '3', name: 'Schedule doctor appointment', category: 'Health', priority: 'high', completed: false },
  { id: '4', name: 'Prepare presentation', category: 'Work', priority: 'medium', completed: false },
  { id: '5', name: 'Call mom', category: 'Personal', priority: 'low', completed: false }
];

// Main demo component
const StateManagementDemo = () => {
  const dispatch = useAppDispatch();
  
  // Initialize demo data
  useEffect(() => {
    dispatch(setEntities({
      entityType: 'tasks',
      entities: mockTasks
    }));
  }, [dispatch]);
  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <Text variant="h3" style={{ marginBottom: '24px' }}>
        Advanced State Management Demo
      </Text>
      
      <Grid container spacing={24}>
        <Grid item xs={12} md={6}>
          <TaskForm />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatsDisplay />
        </Grid>
        <Grid item xs={12}>
          <TaskList />
        </Grid>
      </Grid>
      
      <Toast />
    </div>
  );
};

// Wrap with provider
const StateManagementDemoWithProvider = () => (
  <AppProvider>
    <StateManagementDemo />
  </AppProvider>
);

export default StateManagementDemoWithProvider; 