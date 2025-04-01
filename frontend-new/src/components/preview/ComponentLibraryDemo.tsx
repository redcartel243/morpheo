import React, { useState } from 'react';
import { 
  ComponentType,
  IntelligentComponent,
  withIntelligentComponent,
  useIntelligentComponent,
  ThemeProvider 
} from '../ui/components';

// Common Demo Wrapper
const DemoSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '2rem' }}>
    <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>{title}</h2>
    <div style={{ padding: '1rem' }}>
      {children}
    </div>
  </div>
);

/**
 * Demo showing intelligent components in the library
 */
export const ComponentLibraryDemo: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Create some intelligent components to demonstrate
  const { id: textTitleId } = useIntelligentComponent({
    type: ComponentType.TEXT,
    initProps: {
      variant: 'h1',
      text: 'Intelligent Component System'
    }
  });

  const { id: paragraphId } = useIntelligentComponent({
    type: ComponentType.TEXT,
    initProps: {
      variant: 'body1',
      text: 'This demonstrates the intelligent component system that allows components to communicate with each other.'
    }
  });

  const { id: nameInputId } = useIntelligentComponent({
    type: ComponentType.TEXT_INPUT,
    initProps: {
      label: 'Name',
      placeholder: 'Enter your name',
      value: name,
      onChange: (e: any) => setName(e.target.value)
    }
  });

  const { id: emailInputId } = useIntelligentComponent({
    type: ComponentType.TEXT_INPUT,
    initProps: {
      label: 'Email',
      placeholder: 'Enter your email',
      value: email,
      onChange: (e: any) => setEmail(e.target.value)
    }
  });

  const { id: submitButtonId } = useIntelligentComponent({
    type: ComponentType.BUTTON,
    initProps: {
      label: 'Submit',
      variant: 'primary',
      onClick: () => {
        if (name && email) {
          alert(`Submitted: ${name} (${email})`);
        } else {
          alert('Please fill out all required fields');
        }
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Submitted: ${name} (${email})`);
  };

  return (
    <ThemeProvider initialTheme={darkMode ? 'dark' : 'light'}>
      <div className="component-library-demo">
        <div style={{ padding: '1rem' }}>
          <h1>Morpheo Component Library</h1>
          <p>This demonstrates the available components in the Morpheo UI library.</p>
          
          <DemoSection title="Intelligent Component Demo">
            <IntelligentComponent id={textTitleId} type={ComponentType.TEXT} />
            <IntelligentComponent id={paragraphId} type={ComponentType.TEXT} />
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
              <IntelligentComponent id={nameInputId} type={ComponentType.TEXT_INPUT} />
              <IntelligentComponent id={emailInputId} type={ComponentType.TEXT_INPUT} />
              <IntelligentComponent id={submitButtonId} type={ComponentType.BUTTON} />
            </form>
          </DemoSection>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ComponentLibraryDemo; 