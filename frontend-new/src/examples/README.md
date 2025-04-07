# Morpheo Examples

This directory contains example components and applications that demonstrate how to use Morpheo's component system effectively.

## Active Examples

These examples are up-to-date and demonstrate the current recommended patterns:

- **Calculator.tsx**: A simple calculator demonstrating component communication and state handling
- **TextReverser.tsx**: Demonstrates string manipulation and event handling
- **GrowingButton.tsx**: Shows interactive state changes based on user interaction
- **calculatorExample.ts**: Provides a complete example configuration for a calculator app

## Archive

The `archive` directory contains older examples that demonstrate previous approaches:

- **StateManagementDemo.tsx**: An older pattern for state management (deprecated)
- **IntelligentComponentsDemo.tsx**: Previous approach to intelligent component connections (deprecated)

These archived examples are kept for reference but should not be used in new development as they don't follow Morpheo's current architecture.

## Usage Guidelines

When creating new components or applications:

1. **Follow the Core Principles**: All components should be generic building blocks without application-specific logic.

2. **Use Standard Patterns**: Refer to the current examples for recommended patterns for:
   - Component communication
   - Event handling
   - State management
   - UI structure

3. **Let the AI Handle Logic**: Components should provide capabilities, but the AI should determine how they are connected and used.

4. **Keep It Generic**: Avoid hardcoding specific application behaviors into your components.

## Example-Driven Development

The examples in this directory serve as reference implementations that guide the AI in generating new applications. When you improve these examples, you improve the quality of AI-generated applications.

Remember that the purpose of these examples is to teach patterns, not specific implementations. 