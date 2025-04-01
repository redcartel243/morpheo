export const taskMasterConfig = {
  "app": {
    "name": "TaskMaster",
    "description": "A comprehensive to-do list application with categorization and priority levels.",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": [
      "header",
      "main",
      "sidebar",
      "footer"
    ]
  },
  "components": [
    {
      "id": "header",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "TaskMaster",
        "variant": "h1",
        "align": "center"
      },
      "styles": {
        "fontSize": "24px",
        "padding": "16px"
      },
      "events": {}
    },
    {
      "id": "task-input",
      "type": "card",
      "region": "main",
      "properties": {
        "title": "Add New Task",
        "children": [
          {
            "id": "task-name-input",
            "type": "text-input",
            "properties": {
              "placeholder": "Enter task name",
              "label": "Task Name",
              "required": true,
              "fullWidth": true
            },
            "styles": {}
          },
          {
            "id": "task-category-input",
            "type": "text-input",
            "properties": {
              "placeholder": "Enter category",
              "label": "Category",
              "fullWidth": true
            },
            "styles": {}
          },
          {
            "id": "task-priority-input",
            "type": "text-input",
            "properties": {
              "placeholder": "Enter priority (low, medium, high)",
              "label": "Priority",
              "fullWidth": true
            },
            "styles": {}
          },
          {
            "id": "add-task-button",
            "type": "button",
            "properties": {
              "text": "Add Task",
              "variant": "contained",
              "size": "medium"
            },
            "styles": {},
            "events": {
              "onClick": {
                "action": "addTask",
                "params": {
                  "taskName": "task-name-input.value",
                  "category": "task-category-input.value",
                  "priority": "task-priority-input.value"
                }
              }
            }
          }
        ],
        "elevation": 2
      },
      "styles": {
        "margin": "16px"
      },
      "events": {}
    },
    {
      "id": "task-list",
      "type": "list",
      "region": "main",
      "properties": {
        "items": "tasks",
        "variant": "outlined",
        "emptyMessage": "No tasks available."
      },
      "styles": {
        "margin": "16px 0"
      },
      "events": {}
    },
    {
      "id": "footer",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 TaskMaster. All rights reserved.",
        "align": "center"
      },
      "styles": {
        "padding": "16px",
        "fontSize": "12px"
      },
      "events": {}
    }
  ],
  "backend": {
    "services": [
      {
        "id": "local-storage",
        "type": "local-storage",
        "config": {}
      }
    ],
    "dataFlow": [
      {
        "trigger": "addTask",
        "steps": [
          {
            "service": "local-storage",
            "method": "save",
            "params": {
              "key": "tasks",
              "value": "tasks.concat({name: taskName, category: category, priority: priority})"
            },
            "output": "tasks"
          }
        ]
      }
    ]
  },
  "theme": {
    "colors": {},
    "typography": {},
    "spacing": {}
  },
  "functionality": {
    "type": "default",
    "config": {}
  }
}; 