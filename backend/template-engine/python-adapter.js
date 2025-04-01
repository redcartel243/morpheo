/**
 * Python Adapter for Template Engine
 * 
 * This script acts as a bridge between Python and the JavaScript template engine.
 * It's called by the Python code and returns JSON results.
 */

const templateManager = require('./template-manager');
const path = require('path');

// Initialize the template manager
async function initialize() {
  await templateManager.initialize();
}

// Process command line arguments
async function main() {
  // First argument is the command
  const command = process.argv[2];
  
  // Remaining arguments are parameters
  const args = process.argv.slice(3).map(arg => JSON.parse(arg));
  
  try {
    // Initialize before executing any command
    await initialize();
    
    let result;
    
    // Execute the requested command
    switch (command) {
      case 'listTemplates':
        result = templateManager.listTemplates();
        break;
        
      case 'listComponents':
        result = templateManager.listComponents(args[0]);
        break;
        
      case 'findBestTemplate':
        result = templateManager.findBestTemplate(args[0]);
        break;
        
      case 'findMatchingTemplates':
        result = templateManager.findMatchingTemplates(args[0], args[1]);
        break;
        
      case 'createFromTemplate':
        result = templateManager.createFromTemplate(args[0], args[1]);
        break;
        
      case 'saveTemplate':
        result = await templateManager.saveAsTemplate(args[0]);
        break;
        
      case 'saveComponent':
        result = await templateManager.registry.saveComponent(args[0]);
        break;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    // Return the result as JSON
    console.log(JSON.stringify(result));
    
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
