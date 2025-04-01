import { useMemo } from 'react';
import { 
  AppState,
  useAppSelector,
  selectEntitiesList,
  selectLoading,
  selectFormValues,
  selectDarkMode
} from './Store';
import { createDerivedState, composeState } from './DerivedStateUtils';

// Define task type to avoid type errors
interface Task {
  id: string;
  name: string;
  category?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

/**
 * Examples of derived state selectors
 */

// Example 1: Filter and sort tasks by priority
export const selectPrioritizedTasks = (state: AppState) => {
  const tasks = selectEntitiesList('tasks')(state) as Task[] || [];
  
  // Sort by priority (high > medium > low)
  return [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - 
           priorityOrder[b.priority as keyof typeof priorityOrder];
  });
};

// Example 2: Get incomplete tasks count
export const selectIncompleteTasksCount = (state: AppState) => {
  const tasks = selectEntitiesList('tasks')(state) as Task[] || [];
  return tasks.filter(task => !task.completed).length;
};

// Example 3: Derived state combining multiple selectors
export const selectTasksStats = createDerivedState(
  [
    selectEntitiesList('tasks'), 
    selectIncompleteTasksCount
  ],
  (tasks: any[], incompleteCount: number) => ({
    total: tasks.length,
    incomplete: incompleteCount,
    complete: tasks.length - incompleteCount,
    completionRate: tasks.length ? (tasks.length - incompleteCount) / tasks.length : 0
  })
);

// Example 4: Derived state with form values
export const selectFilteredTasks = (formId: string) => createDerivedState(
  [
    selectEntitiesList('tasks'),
    selectFormValues(formId)
  ],
  (tasks: any[], formValues: any) => {
    const { searchTerm, categoryFilter, showCompleted } = formValues || { searchTerm: '', categoryFilter: '', showCompleted: true };
    const typedTasks = tasks as Task[];
    
    return typedTasks.filter(task => {
      // Filter by completion status
      if (showCompleted === false && task.completed) {
        return false;
      }
      
      // Filter by category
      if (categoryFilter && task.category !== categoryFilter) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !task.name.toLowerCase().includes(String(searchTerm).toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }
);

/**
 * Custom hook that combines multiple selectors with derived computation
 */
export const useDerivedTasksState = (formId: string) => {
  // Select base state
  const tasks = useAppSelector(selectEntitiesList('tasks')) as Task[];
  const formValues = useAppSelector(selectFormValues(formId)) || { searchTerm: '', categoryFilter: '', showCompleted: true };
  const isLoading = useAppSelector(selectLoading('tasks'));
  
  // Derived values calculated when dependencies change
  const filteredTasks = useMemo(() => {
    const { searchTerm, categoryFilter, showCompleted } = formValues;
    
    return tasks.filter(task => {
      // Filter by completion status
      if (showCompleted === false && task.completed) {
        return false;
      }
      
      // Filter by category
      if (categoryFilter && task.category !== categoryFilter) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !task.name.toLowerCase().includes(String(searchTerm).toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [tasks, formValues]);
  
  // More derived calculations
  const stats = useMemo(() => {
    const completedTasks = filteredTasks.filter(task => task.completed);
    
    return {
      total: filteredTasks.length,
      complete: completedTasks.length,
      incomplete: filteredTasks.length - completedTasks.length,
      completionRate: filteredTasks.length 
        ? completedTasks.length / filteredTasks.length 
        : 0
    };
  }, [filteredTasks]);
  
  // Categories derived from all tasks
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    tasks.forEach(task => {
      if (task.category) {
        uniqueCategories.add(task.category);
      }
    });
    
    return Array.from(uniqueCategories);
  }, [tasks]);
  
  // Priority distribution
  const priorityDistribution = useMemo(() => {
    const distribution = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    filteredTasks.forEach(task => {
      if (task.priority in distribution) {
        distribution[task.priority as keyof typeof distribution]++;
      }
    });
    
    return distribution;
  }, [filteredTasks]);
  
  return {
    isLoading,
    tasks: filteredTasks,
    stats,
    categories,
    priorityDistribution,
    formValues
  };
};

/**
 * Example of composing state from different contexts
 */
export const useComposedThemeAndTaskState = (formId: string) => {
  // Get the individual state pieces directly
  const darkMode = useAppSelector(selectDarkMode);
  const taskData = useDerivedTasksState(formId);
  
  // Combine them
  return {
    darkMode,
    ...taskData
  };
}; 