export const todoAppConfig = {
  id: "todo-app-demo",
  name: "Todo App Demo",
  layout: {
    type: "flex",
    direction: "column",
    spacing: "16px"
  },
  theme: {
    colors: {
      primary: "#3f51b5",
      secondary: "#f50057",
      background: "#ffffff",
      surface: "#f5f5f5",
      text: "#212121",
      textSecondary: "#757575"
    },
    typography: {
      fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
      fontSize: "16px"
    },
    spacing: {
      unit: "8px",
      small: "8px",
      medium: "16px",
      large: "24px"
    }
  },
  regions: {
    header: [
      {
        id: "app-header",
        type: "display.card",
        props: {
          variant: "outlined",
          elevation: 1,
          padding: "16px"
        },
        children: [
          {
            id: "app-title",
            type: "display.text",
            props: {
              content: "Todo List App",
              variant: "h4",
              align: "center",
              color: "primary",
              gutterBottom: true
            },
            children: []
          }
        ]
      }
    ],
    main: [
      {
        id: "main-content",
        type: "layout.grid",
        props: {
          container: true,
          spacing: 2
        },
        children: [
          {
            id: "task-input-container",
            type: "layout.grid",
            props: {
              item: true,
              xs: 12
            },
            children: [
              {
                id: "task-input-card",
                type: "display.card",
                props: {
                  variant: "outlined",
                  elevation: 1,
                  padding: "16px"
                },
                children: [
                  {
                    id: "add-task-form",
                    type: "layout.grid",
                    props: {
                      container: true,
                      spacing: 2,
                      alignItems: "center"
                    },
                    children: [
                      {
                        id: "task-input-field",
                        type: "layout.grid",
                        props: {
                          item: true,
                          xs: 12,
                          sm: 9
                        },
                        children: [
                          {
                            id: "task-input",
                            type: "input.text",
                            props: {
                              label: "New Task",
                              placeholder: "Enter a new task...",
                              fullWidth: true,
                              name: "newTask"
                            },
                            children: []
                          }
                        ]
                      },
                      {
                        id: "add-task-button-container",
                        type: "layout.grid",
                        props: {
                          item: true,
                          xs: 12,
                          sm: 3
                        },
                        children: [
                          {
                            id: "add-task-button",
                            type: "input.button",
                            props: {
                              text: "Add Task",
                              variant: "primary",
                              fullWidth: true
                            },
                            events: {
                              onClick: "ADD_TASK"
                            },
                            children: []
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "task-list-container",
            type: "layout.grid",
            props: {
              item: true,
              xs: 12
            },
            children: [
              {
                id: "task-list-card",
                type: "display.card",
                props: {
                  variant: "outlined",
                  elevation: 1,
                  padding: "16px"
                },
                children: [
                  {
                    id: "task-list-header",
                    type: "display.text",
                    props: {
                      content: "My Tasks",
                      variant: "h5",
                      gutterBottom: true
                    },
                    children: []
                  },
                  {
                    id: "task-list",
                    type: "display.list",
                    props: {
                      items: [],
                      variant: "outlined",
                      dividers: true,
                      emptyMessage: "No tasks yet. Add some tasks to get started!"
                    },
                    dataBindings: {
                      items: "state.tasks"
                    },
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  state: {
    newTask: "",
    tasks: []
  },
  stateReducer: `
    function stateReducer(state, action) {
      switch (action.type) {
        case 'UPDATE_INPUT':
          return { ...state, [action.name]: action.value };
        case 'ADD_TASK':
          if (!state.newTask.trim()) return state;
          const newTask = {
            id: Date.now().toString(),
            text: state.newTask,
            completed: false,
            content: state.newTask,
            icon: 'CheckCircleOutline',
            actions: [
              {
                icon: 'Check',
                tooltip: 'Mark as completed',
                action: 'COMPLETE_TASK',
                args: { id: Date.now().toString() }
              },
              {
                icon: 'Delete',
                tooltip: 'Delete task',
                action: 'DELETE_TASK',
                args: { id: Date.now().toString() }
              }
            ]
          };
          return {
            ...state,
            tasks: [...state.tasks, newTask],
            newTask: ''
          };
        case 'COMPLETE_TASK':
          return {
            ...state,
            tasks: state.tasks.map(task =>
              task.id === action.id
                ? { ...task, completed: !task.completed }
                : task
            )
          };
        case 'DELETE_TASK':
          return {
            ...state,
            tasks: state.tasks.filter(task => task.id !== action.id)
          };
        default:
          return state;
      }
    }
  `,
  eventBindings: {
    "task-input": {
      onChange: [
        {
          type: "UPDATE_INPUT",
          payload: {
            name: "newTask",
            value: "{{value}}"
          }
        }
      ]
    },
    "add-task-button": {
      onClick: [
        {
          type: "ADD_TASK"
        }
      ]
    },
    "task-list": {
      onItemClick: [
        {
          type: "COMPLETE_TASK",
          payload: {
            id: "{{item.id}}"
          }
        }
      ]
    }
  },
  dataBindings: {
    "task-input": {
      value: "state.newTask"
    },
    "task-list": {
      items: "state.tasks"
    }
  }
}; 