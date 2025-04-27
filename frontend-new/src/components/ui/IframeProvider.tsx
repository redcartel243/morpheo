import React from 'react';
import {
  ChakraProvider,
  EnvironmentProvider,
  createSystem, // Use createSystem for custom theme or defaultSystem
} from '@chakra-ui/react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import Iframe, { FrameContextConsumer } from 'react-frame-component';

// Memoization helper (from Chakra docs)
function memoize<T extends object, R>(func: (arg: T) => R): (arg: T) => R {
  const cache = new WeakMap<T, R>();
  return (arg: T) => {
    if (cache.has(arg)) return cache.get(arg)!;
    const ret = func(arg);
    cache.set(arg, ret);
    return ret;
  };
}

// Memoized cache creation function (from Chakra docs)
const createCacheFn = memoize((container: HTMLElement) =>
  createCache({ container, key: 'frame' }),
);

// Use a default Chakra system if no custom theme is needed,
// otherwise you would import your theme and use createSystem(theme)
const defaultSystem = createSystem(); // Creates a system with Chakra's default theme

export const IframeProvider = (props: React.PropsWithChildren<{ initialContent?: string }>) => {
  const { children, initialContent } = props;

  // Basic HTML structure for the iframe content
  const iframeInitialContent = initialContent || `<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`;

  return (
    <Iframe
      initialContent={iframeInitialContent}
      mountTarget="#root" // Mount into the #root div within the iframe
      style={{ width: '100%', height: '100%', border: 'none' }} // Ensure iframe takes space
    >
      <FrameContextConsumer>
        {(frameContext) => {
          // Ensure frameContext and document/head are available
          const { document } = frameContext;
          if (!document?.head) {
            console.error("Iframe document or head not available.");
            return null;
          }

          return (
            // CacheProvider for Emotion styles within the iframe
            <CacheProvider value={createCacheFn(document.head)}>
              {/* EnvironmentProvider to tell Chakra where to inject styles */}
              <EnvironmentProvider value={document}>
                {/* ChakraProvider with the theme system */}
                <ChakraProvider value={defaultSystem}>
                  {children}
                </ChakraProvider>
              </EnvironmentProvider>
            </CacheProvider>
          );
        }}
      </FrameContextConsumer>
    </Iframe>
  );
}; 