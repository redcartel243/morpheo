## Quiz/Survey Application Generator

Generate a complete quiz or survey application configuration using our component system. This template provides patterns for AI-driven question presentation, validation, and result tracking without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Quiz/Survey Application",
    "description": "Interactive quiz/survey with validation and scoring",
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
        "content": "Interactive Quiz",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "quiz-intro",
      "type": "container",
      "region": "main",
      "properties": {
        "visible": true
      },
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "gap": "20px",
        "maxWidth": "600px",
        "margin": "0 auto",
        "padding": "30px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"
      },
      "children": [
        {
          "id": "intro-text",
          "type": "text",
          "properties": {
            "content": "Welcome to our quiz! Test your knowledge with the following questions.",
            "variant": "body1"
          },
          "styles": {
            "textAlign": "center",
            "marginBottom": "20px"
          }
        },
        {
          "id": "start-button",
          "type": "button",
          "properties": {
            "text": "Start Quiz"
          },
          "styles": {
            "padding": "12px 24px",
            "backgroundColor": "#4CAF50",
            "color": "white",
            "border": "none",
            "borderRadius": "4px",
            "fontSize": "16px",
            "cursor": "pointer",
            "transition": "all 0.3s ease"
          }
        }
      ]
    },
    {
      "id": "quiz-container",
      "type": "container",
      "region": "main",
      "properties": {
        "visible": false
      },
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "20px",
        "maxWidth": "600px",
        "margin": "0 auto",
        "padding": "30px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"
      },
      "children": [
        {
          "id": "question-number",
          "type": "text",
          "properties": {
            "content": "Question 1 of 5",
            "variant": "h6"
          },
          "styles": {
            "color": "#666",
            "marginBottom": "10px"
          }
        },
        {
          "id": "question-text",
          "type": "text",
          "properties": {
            "content": "What is the question?",
            "variant": "h5"
          },
          "styles": {
            "marginBottom": "20px",
            "fontWeight": "500"
          }
        },
        {
          "id": "options-container",
          "type": "container",
          "styles": {
            "display": "flex",
            "flexDirection": "column",
            "gap": "10px",
            "marginBottom": "20px"
          },
          "children": [
            /* Options will be added dynamically */
          ]
        },
        {
          "id": "navigation-buttons",
          "type": "container",
          "styles": {
            "display": "flex",
            "justifyContent": "space-between",
            "marginTop": "20px"
          },
          "children": [
            {
              "id": "prev-button",
              "type": "button",
              "properties": {
                "text": "Previous",
                "disabled": true
              },
              "styles": {
                "padding": "10px 20px",
                "backgroundColor": "#f0f0f0",
                "color": "#666",
                "border": "none",
                "borderRadius": "4px",
                "cursor": "pointer"
              }
            },
            {
              "id": "next-button",
              "type": "button",
              "properties": {
                "text": "Next"
              },
              "styles": {
                "padding": "10px 20px",
                "backgroundColor": "#4CAF50",
                "color": "white",
                "border": "none",
                "borderRadius": "4px",
                "cursor": "pointer"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "results-container",
      "type": "container",
      "region": "main",
      "properties": {
        "visible": false
      },
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "gap": "20px",
        "maxWidth": "600px",
        "margin": "0 auto",
        "padding": "30px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"
      },
      "children": [
        {
          "id": "results-title",
          "type": "text",
          "properties": {
            "content": "Quiz Results",
            "variant": "h4"
          },
          "styles": {
            "marginBottom": "20px",
            "color": "#333"
          }
        },
        {
          "id": "score-text",
          "type": "text",
          "properties": {
            "content": "Your Score: 0/0",
            "variant": "h5"
          },
          "styles": {
            "marginBottom": "10px",
            "color": "#4CAF50"
          }
        },
        {
          "id": "score-percentage",
          "type": "text",
          "properties": {
            "content": "0%",
            "variant": "h3"
          },
          "styles": {
            "marginBottom": "20px",
            "color": "#4CAF50"
          }
        },
        {
          "id": "restart-button",
          "type": "button",
          "properties": {
            "text": "Restart Quiz"
          },
          "styles": {
            "padding": "12px 24px",
            "backgroundColor": "#2196F3",
            "color": "white",
            "border": "none",
            "borderRadius": "4px",
            "fontSize": "16px",
            "cursor": "pointer"
          }
        }
      ]
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Quiz Application",
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

1. **Question Presentation**:
   - Present questions one at a time with clear navigation
   - Support multiple question types (multiple choice, true/false, etc.)
   - Show current progress through the quiz/survey
   - Validate answers before allowing progression

2. **State Management**:
   - Track current question index and total questions
   - Maintain user responses for scoring/analysis
   - Support both linear and branching question flows
   - Calculate final score based on correct answers

3. **Results Handling**:
   - Display final score with percentage
   - Show feedback based on performance levels
   - Offer option to restart or review answers
   - Visualize results with appropriate charts when relevant

### DOM Manipulation Patterns

For quiz/survey applications, implement these patterns:

```javascript
// Initialize quiz state
"onLoad": {
  "code": "function(event, $m) {
    // Initialize quiz state
    window.quizState = {
      currentQuestion: 0,
      questions: [
        {
          text: 'What is the capital of France?',
          options: ['Berlin', 'Paris', 'London', 'Madrid'],
          correctAnswer: 1, // Index of correct answer
          userAnswer: null
        },
        {
          text: 'Which planet is closest to the sun?',
          options: ['Venus', 'Earth', 'Mercury', 'Mars'],
          correctAnswer: 2,
          userAnswer: null
        },
        {
          text: 'What is the largest mammal?',
          options: ['Elephant', 'Blue Whale', 'Giraffe', 'Polar Bear'],
          correctAnswer: 1,
          userAnswer: null
        },
        {
          text: 'Who painted the Mona Lisa?',
          options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Rembrandt'],
          correctAnswer: 1,
          userAnswer: null
        },
        {
          text: 'Which element has the chemical symbol Au?',
          options: ['Silver', 'Gold', 'Aluminum', 'Argon'],
          correctAnswer: 1,
          userAnswer: null
        }
      ]
    };
  }"
}

// Start quiz button handler
"onClick": {
  "code": "function(event, $m) {
    // Hide intro container
    $m('#quiz-intro').hide();
    
    // Show quiz container with animation
    $m('#quiz-container').show();
    $m('#quiz-container').animate({
      opacity: [0, 1],
      transform: ['translateY(-20px)', 'translateY(0)']
    }, {duration: 300});
    
    // Load first question
    loadQuestion($m, 0);
  }",
  "affectedComponents": ["quiz-intro", "quiz-container"]
}

// Load question helper function
"methods": {
  "loadQuestion": {
    "code": "function loadQuestion($m, index) {
      // Get question data
      const question = window.quizState.questions[index];
      if (!question) return;
      
      // Update current question index
      window.quizState.currentQuestion = index;
      
      // Update question number text
      $m('#question-number').setText(`Question ${index + 1} of ${window.quizState.questions.length}`);
      
      // Update question text
      $m('#question-text').setText(question.text);
      
      // Clear existing options
      const optionsContainer = $m('#options-container');
      while (optionsContainer.firstChild) {
        optionsContainer.removeChild(optionsContainer.firstChild);
      }
      
      // Generate new options
      question.options.forEach((option, optionIndex) => {
        // Create option container
        const optionContainer = document.createElement('div');
        optionContainer.id = `option-${optionIndex}-container`;
        optionContainer.style.display = 'flex';
        optionContainer.style.alignItems = 'center';
        optionContainer.style.padding = '12px 15px';
        optionContainer.style.backgroundColor = '#f5f5f5';
        optionContainer.style.border = '1px solid #ddd';
        optionContainer.style.borderRadius = '4px';
        optionContainer.style.cursor = 'pointer';
        
        // Add selected state if this option was previously selected
        if (question.userAnswer === optionIndex) {
          optionContainer.style.backgroundColor = '#e1f5fe';
          optionContainer.style.borderColor = '#4fc3f7';
        }
        
        // Create radio button
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz-option';
        radio.id = `option-${optionIndex}`;
        radio.style.marginRight = '10px';
        radio.checked = question.userAnswer === optionIndex;
        
        // Create label
        const label = document.createElement('label');
        label.htmlFor = `option-${optionIndex}`;
        label.textContent = option;
        label.style.flex = '1';
        label.style.cursor = 'pointer';
        
        // Add elements to container
        optionContainer.appendChild(radio);
        optionContainer.appendChild(label);
        
        // Add click handler to select option
        optionContainer.addEventListener('click', function() {
          selectOption($m, optionIndex);
        });
        
        // Add to options container
        optionsContainer.appendChild(optionContainer);
      });
      
      // Update navigation buttons
      $m('#prev-button').setProperty('disabled', index === 0);
      $m('#prev-button').setStyle('opacity', index === 0 ? '0.5' : '1');
      $m('#prev-button').setStyle('cursor', index === 0 ? 'not-allowed' : 'pointer');
      
      const isLastQuestion = index === window.quizState.questions.length - 1;
      $m('#next-button').setText(isLastQuestion ? 'Finish' : 'Next');
      $m('#next-button').setStyle('backgroundColor', isLastQuestion ? '#FF5722' : '#4CAF50');
    }"
  },
  
  "selectOption": {
    "code": "function selectOption($m, optionIndex) {
      const currentQuestion = window.quizState.currentQuestion;
      const question = window.quizState.questions[currentQuestion];
      
      // Update user's answer
      question.userAnswer = optionIndex;
      
      // Update UI to show selected option
      for (let i = 0; i < question.options.length; i++) {
        const container = $m(`#option-${i}-container`);
        const radio = $m(`#option-${i}`);
        
        if (i === optionIndex) {
          container.setStyle('backgroundColor', '#e1f5fe');
          container.setStyle('borderColor', '#4fc3f7');
          radio.setProperty('checked', true);
          
          // Add selection animation
          container.animate({
            backgroundColor: ['#f5f5f5', '#e1f5fe']
          }, {duration: 300});
        } else {
          container.setStyle('backgroundColor', '#f5f5f5');
          container.setStyle('borderColor', '#ddd');
          radio.setProperty('checked', false);
        }
      }
    }"
  },
  
  "nextQuestion": {
    "code": "function nextQuestion($m) {
      const currentQuestion = window.quizState.currentQuestion;
      const totalQuestions = window.quizState.questions.length;
      
      // Validate that user has selected an answer
      if (window.quizState.questions[currentQuestion].userAnswer === null) {
        // Show error feedback
        $m('#options-container').animate({
          transform: ['translateX(0px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(0px)']
        }, {duration: 300});
        return;
      }
      
      // Check if this is the last question
      if (currentQuestion === totalQuestions - 1) {
        showResults($m);
        return;
      }
      
      // Move to next question with animation
      $m('#quiz-container').animate({
        opacity: [1, 0],
        transform: ['translateX(0)', 'translateX(-20px)']
      }, {duration: 200}).onfinish = function() {
        loadQuestion($m, currentQuestion + 1);
        
        $m('#quiz-container').animate({
          opacity: [0, 1],
          transform: ['translateX(20px)', 'translateX(0)']
        }, {duration: 200});
      };
    }"
  },
  
  "previousQuestion": {
    "code": "function previousQuestion($m) {
      const currentQuestion = window.quizState.currentQuestion;
      
      // Check if there is a previous question
      if (currentQuestion > 0) {
        // Move to previous question with animation
        $m('#quiz-container').animate({
          opacity: [1, 0],
          transform: ['translateX(0)', 'translateX(20px)']
        }, {duration: 200}).onfinish = function() {
          loadQuestion($m, currentQuestion - 1);
          
          $m('#quiz-container').animate({
            opacity: [0, 1],
            transform: ['translateX(-20px)', 'translateX(0)']
          }, {duration: 200});
        };
      }
    }"
  },
  
  "showResults": {
    "code": "function showResults($m) {
      // Calculate score
      let correctAnswers = 0;
      const totalQuestions = window.quizState.questions.length;
      
      window.quizState.questions.forEach(question => {
        if (question.userAnswer === question.correctAnswer) {
          correctAnswers++;
        }
      });
      
      const percentageScore = Math.round((correctAnswers / totalQuestions) * 100);
      
      // Update results text
      $m('#score-text').setText(`Your Score: ${correctAnswers}/${totalQuestions}`);
      $m('#score-percentage').setText(`${percentageScore}%`);
      
      // Set color based on score
      let scoreColor;
      if (percentageScore >= 80) {
        scoreColor = '#4CAF50'; // Green for high score
      } else if (percentageScore >= 60) {
        scoreColor = '#FF9800'; // Orange for medium score
      } else {
        scoreColor = '#F44336'; // Red for low score
      }
      
      $m('#score-percentage').setStyle('color', scoreColor);
      
      // Hide quiz container and show results
      $m('#quiz-container').hide();
      $m('#results-container').show();
      
      // Animate results in
      $m('#results-container').animate({
        opacity: [0, 1],
        transform: ['translateY(-20px)', 'translateY(0)']
      }, {duration: 400});
      
      // Animate percentage counter
      let startPercentage = 0;
      const duration = 1500; // ms
      const interval = 20; // ms
      const steps = duration / interval;
      const increment = percentageScore / steps;
      
      const counterAnimation = setInterval(() => {
        startPercentage += increment;
        if (startPercentage >= percentageScore) {
          startPercentage = percentageScore;
          clearInterval(counterAnimation);
        }
        $m('#score-percentage').setText(`${Math.round(startPercentage)}%`);
      }, interval);
    }"
  },
  
  "restartQuiz": {
    "code": "function restartQuiz($m) {
      // Reset all user answers
      window.quizState.questions.forEach(question => {
        question.userAnswer = null;
      });
      
      // Reset current question
      window.quizState.currentQuestion = 0;
      
      // Hide results and show intro
      $m('#results-container').hide();
      $m('#quiz-intro').show();
      
      // Animate intro in
      $m('#quiz-intro').animate({
        opacity: [0, 1],
        transform: ['translateY(-20px)', 'translateY(0)']
      }, {duration: 300});
    }"
  }
}

// Next button click handler
"onClick": {
  "code": "function(event, $m) {
    nextQuestion($m);
  }",
  "affectedComponents": ["quiz-container", "results-container"]
}

// Previous button click handler
"onClick": {
  "code": "function(event, $m) {
    previousQuestion($m);
  }",
  "affectedComponents": ["quiz-container"]
}

// Restart button click handler
"onClick": {
  "code": "function(event, $m) {
    restartQuiz($m);
  }",
  "affectedComponents": ["results-container", "quiz-intro"]
}
```

### Animation and User Feedback Examples

```javascript
// Option selection feedback
"animateOptionSelection": {
  "code": "function animateOptionSelection($m, optionIndex, isCorrect) {
    const container = $m(`#option-${optionIndex}-container`);
    
    if (isCorrect) {
      // Correct answer animation
      container.animate({
        backgroundColor: ['#e1f5fe', '#e8f5e9', '#e1f5fe']
      }, {duration: 500});
      
      container.setStyle('borderColor', '#66bb6a');
      
      // Add checkmark icon
      const checkmark = document.createElement('span');
      checkmark.textContent = '✓';
      checkmark.style.color = '#4CAF50';
      checkmark.style.marginLeft = '10px';
      container.appendChild(checkmark);
    } else {
      // Incorrect answer animation
      container.animate({
        backgroundColor: ['#e1f5fe', '#ffebee', '#e1f5fe']
      }, {duration: 500});
      
      container.setStyle('borderColor', '#ef5350');
      
      // Add X icon
      const xmark = document.createElement('span');
      xmark.textContent = '✗';
      xmark.style.color = '#F44336';
      xmark.style.marginLeft = '10px';
      container.appendChild(xmark);
    }
  }"
}

// Progress indicator
"updateProgressIndicator": {
  "code": "function updateProgressIndicator($m, currentQuestion, totalQuestions) {
    const progressPercent = (currentQuestion / totalQuestions) * 100;
    
    // Create progress bar if it doesn't exist
    let progressBar = $m('#quiz-progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'quiz-progress-bar';
      progressBar.style.width = '100%';
      progressBar.style.height = '6px';
      progressBar.style.backgroundColor = '#f0f0f0';
      progressBar.style.borderRadius = '3px';
      progressBar.style.marginBottom = '20px';
      progressBar.style.overflow = 'hidden';
      
      const progressFill = document.createElement('div');
      progressFill.id = 'quiz-progress-fill';
      progressFill.style.height = '100%';
      progressFill.style.width = `${progressPercent}%`;
      progressFill.style.backgroundColor = '#4CAF50';
      progressFill.style.transition = 'width 0.3s ease-in-out';
      
      progressBar.appendChild(progressFill);
      
      // Insert at the top of the quiz container
      const quizContainer = $m('#quiz-container');
      quizContainer.insertBefore(progressBar, quizContainer.firstChild);
    } else {
      // Update existing progress bar
      const progressFill = $m('#quiz-progress-fill');
      progressFill.style.width = `${progressPercent}%`;
    }
  }"
}
```

Generate the complete configuration with question presentation, validation, and scoring implemented through generic component manipulation and state management. 