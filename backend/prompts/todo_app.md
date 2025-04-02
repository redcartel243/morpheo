## Todo Application Generator

Generate a complete todo/task application configuration using our component system. This template provides patterns for AI-driven task management functionality with state management without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Todo Application",
    "description": "Task management application with state management",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "main", "footer"]
  },
  "components": [
    {
      "id": "app-title",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "Task Manager",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "task-input-container",
      "type": "container",
      "region": "main",
      "styles": {
        "display": "flex",
        "gap": "10px",
        "maxWidth": "600px",
        "margin": "0 auto 20px auto",
        "padding": "15px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"
      },
      "children": [
        {
          "id": "new-task-input",
          "type": "input",
          "properties": {
            "placeholder": "Add a new task...",
            "type": "text"
          },
          "styles": {
            "flex": "1",
            "padding": "10px",
            "border": "1px solid #ddd",
            "borderRadius": "4px",
            "fontSize": "16px"
          }
        },
        {
          "id": "add-task-button",
          "type": "button",
          "properties": {
            "text": "Add"
          },
          "styles": {
            "padding": "10px 15px",
            "backgroundColor": "#4CAF50",
            "color": "white",
            "border": "none",
            "borderRadius": "4px",
            "cursor": "pointer",
            "fontWeight": "bold"
          }
        }
      ]
    },
    {
      "id": "todo-list-container",
      "type": "container",
      "region": "main",
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "10px",
        "maxWidth": "600px",
        "margin": "0 auto",
        "padding": "15px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)",
        "minHeight": "300px"
      },
      "children": [
        /* Task items will be added dynamically */
      ]
    },
    {
      "id": "task-counter",
      "type": "text",
      "region": "main",
      "properties": {
        "content": "0 tasks remaining",
        "variant": "body2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "10px",
        "margin": "15px auto",
        "maxWidth": "600px",
        "color": "#666"
      }
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Todo Application",
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

1. **Task Management**:
   - Add new tasks with validation (non-empty input)
   - Mark tasks as complete/incomplete
   - Delete tasks from the list
   - Edit existing task text

2. **State Management**:
   - Maintain a list of tasks with unique IDs, text, and completion status
   - Update task counter based on incomplete tasks
   - Persist tasks using browser storage when appropriate
   - Handle empty states and task initialization

3. **Task Organization**:
   - Filter tasks (all, active, completed)
   - Sort tasks by creation date, completion status, etc.
   - Batch operations (mark all complete, clear completed)
   - Categorize tasks when appropriate

### DOM Manipulation Patterns

For todo applications, implement these patterns:

```javascript
// Initialize task state (attach to app container on load)
"onLoad": {
  "code": "function(event, $m) {
    // Initialize the tasks array in the window to track state
    window.taskState = {
      tasks: [],
      nextId: 1
    };
    
    // Optionally load from localStorage in real implementation
    // if (localStorage.getItem('tasks')) {
    //   try {
    //     window.taskState.tasks = JSON.parse(localStorage.getItem('tasks'));
    //     window.taskState.nextId = Math.max(...window.taskState.tasks.map(t => t.id)) + 1 || 1;
    //     renderTasks($m);
    //   } catch (e) {
    //     console.error('Failed to load tasks', e);
    //   }
    // }
    
    // Update the counter
    updateTaskCounter($m);
  }"
}

// Add task event handler
"onClick": {
  "code": "function(event, $m) {
    const taskText = $m('#new-task-input').getValue().trim();
    
    // Validate input
    if (!taskText) {
      // Show error state on input
      $m('#new-task-input').setStyle('borderColor', 'red');
      $m('#new-task-input').animate({
        transform: ['translateX(0px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(0px)']
      }, {duration: 300});
      return;
    }
    
    // Reset input state
    $m('#new-task-input').setStyle('borderColor', '#ddd');
    
    // Add new task to state
    const newTask = {
      id: window.taskState.nextId++,
      text: taskText,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    window.taskState.tasks.push(newTask);
    
    // Clear input
    $m('#new-task-input').setValue('');
    
    // Add task to DOM
    addTaskToDOM($m, newTask);
    
    // Update counter
    updateTaskCounter($m);
    
    // Save to localStorage in real implementation
    // localStorage.setItem('tasks', JSON.stringify(window.taskState.tasks));
  }",
  "affectedComponents": ["new-task-input", "todo-list-container", "task-counter"]
}

// Helper function to create a task item
"methods": {
  "addTaskToDOM": {
    "code": "function addTaskToDOM($m, task) {
      // Create a unique ID for the container
      const containerId = `task-${task.id}-container`;
      
      // Create task container
      const taskContainer = document.createElement('div');
      taskContainer.id = containerId;
      taskContainer.style.display = 'flex';
      taskContainer.style.padding = '10px';
      taskContainer.style.borderBottom = '1px solid #eee';
      taskContainer.style.alignItems = 'center';
      taskContainer.style.gap = '10px';
      
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `task-${task.id}-checkbox`;
      checkbox.checked = task.completed;
      checkbox.style.height = '20px';
      checkbox.style.width = '20px';
      checkbox.style.cursor = 'pointer';
      
      // Create task text
      const taskText = document.createElement('span');
      taskText.id = `task-${task.id}-text`;
      taskText.textContent = task.text;
      taskText.style.flex = '1';
      taskText.style.fontSize = '16px';
      if (task.completed) {
        taskText.style.textDecoration = 'line-through';
        taskText.style.color = '#888';
      }
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.id = `task-${task.id}-delete`;
      deleteBtn.textContent = '×';
      deleteBtn.style.backgroundColor = 'transparent';
      deleteBtn.style.border = 'none';
      deleteBtn.style.color = '#f44336';
      deleteBtn.style.fontSize = '20px';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.padding = '0 5px';
      
      // Add elements to container
      taskContainer.appendChild(checkbox);
      taskContainer.appendChild(taskText);
      taskContainer.appendChild(deleteBtn);
      
      // Add container to list
      document.getElementById('todo-list-container').appendChild(taskContainer);
      
      // Add event listeners
      $m(`#task-${task.id}-checkbox`).addEventListener('change', function() {
        toggleTaskCompletion($m, task.id);
      });
      
      $m(`#task-${task.id}-delete`).addEventListener('click', function() {
        deleteTask($m, task.id);
      });
      
      // Add double-click to edit
      $m(`#task-${task.id}-text`).addEventListener('dblclick', function() {
        startEditingTask($m, task.id);
      });
    }"
  },
  
  "toggleTaskCompletion": {
    "code": "function toggleTaskCompletion($m, taskId) {
      // Find the task
      const taskIndex = window.taskState.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      // Toggle completion
      window.taskState.tasks[taskIndex].completed = !window.taskState.tasks[taskIndex].completed;
      
      // Update UI
      const isCompleted = window.taskState.tasks[taskIndex].completed;
      const textElement = $m(`#task-${taskId}-text`);
      
      if (isCompleted) {
        textElement.setStyle('textDecoration', 'line-through');
        textElement.setStyle('color', '#888');
      } else {
        textElement.setStyle('textDecoration', 'none');
        textElement.setStyle('color', '#000');
      }
      
      // Update counter
      updateTaskCounter($m);
      
      // Save to localStorage in real implementation
      // localStorage.setItem('tasks', JSON.stringify(window.taskState.tasks));
    }"
  },
  
  "deleteTask": {
    "code": "function deleteTask($m, taskId) {
      // Remove from state
      window.taskState.tasks = window.taskState.tasks.filter(t => t.id !== taskId);
      
      // Remove from DOM with animation
      const container = $m(`#task-${taskId}-container`);
      container.animate({
        opacity: [1, 0],
        height: [container.offsetHeight + 'px', '0px']
      }, {duration: 300}).onfinish = function() {
        container.remove();
      };
      
      // Update counter
      updateTaskCounter($m);
      
      // Save to localStorage in real implementation
      // localStorage.setItem('tasks', JSON.stringify(window.taskState.tasks));
    }"
  },
  
  "updateTaskCounter": {
    "code": "function updateTaskCounter($m) {
      const remainingTasks = window.taskState.tasks.filter(t => !t.completed).length;
      const taskText = remainingTasks === 1 ? 'task' : 'tasks';
      $m('#task-counter').setText(`${remainingTasks} ${taskText} remaining`);
    }"
  }
}
```

### Animation and User Feedback Examples

```javascript
// Empty state handling (include in list container render logic)
"renderEmptyState": {
  "code": "function renderEmptyState($m) {
    if (window.taskState.tasks.length === 0) {
      // Create empty state element
      const emptyState = document.createElement('div');
      emptyState.id = 'empty-state';
      emptyState.style.display = 'flex';
      emptyState.style.flexDirection = 'column';
      emptyState.style.alignItems = 'center';
      emptyState.style.justifyContent = 'center';
      emptyState.style.padding = '40px 20px';
      emptyState.style.color = '#888';
      emptyState.style.textAlign = 'center';
      
      const icon = document.createElement('div');
      icon.innerHTML = '📋';
      icon.style.fontSize = '48px';
      icon.style.marginBottom = '16px';
      
      const title = document.createElement('h3');
      title.textContent = 'No tasks yet';
      title.style.margin = '0 0 8px 0';
      title.style.color = '#555';
      
      const subtitle = document.createElement('p');
      subtitle.textContent = 'Add a task to get started';
      subtitle.style.margin = '0';
      
      emptyState.appendChild(icon);
      emptyState.appendChild(title);
      emptyState.appendChild(subtitle);
      
      document.getElementById('todo-list-container').appendChild(emptyState);
      
      // Animate in
      $m('#empty-state').animate({
        opacity: [0, 1],
        transform: ['translateY(20px)', 'translateY(0)']
      }, {duration: 300, easing: 'ease-out'});
    } else {
      // Remove empty state if it exists
      const emptyState = $m('#empty-state');
      if (emptyState) {
        emptyState.remove();
      }
    }
  }"
}

// Success animation when completing a task
"custom-task-complete-animation": {
  "code": "function animateTaskCompletion($m, taskId) {
    $m(`#task-${taskId}-container`).animate({
      backgroundColor: ['transparent', '#f0fff0', 'transparent']
    }, {duration: 800});
    
    // Update the total count with animation
    $m('#task-counter').animate({
      color: ['#666', '#4CAF50', '#666']
    }, {duration: 1000});
  }"
}
```

Generate the complete configuration with full task management capabilities, dynamic rendering, and user feedback implemented through generic component manipulation and state management. 