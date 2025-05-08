import React from 'react';
import {
  ChakraProvider,
  EnvironmentProvider,
  defaultSystem,
  Box, Text, Center, Spinner
} from '@chakra-ui/react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import Iframe, { FrameContextConsumer } from 'react-frame-component';

// Memoization helper
function memoize<T extends object, R>(func: (arg: T) => R): (arg: T) => R {
  const cache = new WeakMap<T, R>();
  return (arg: T) => {
    if (cache.has(arg)) return cache.get(arg)!;
    const ret = func(arg);
    cache.set(arg, ret);
    return ret;
  };
}

// Memoized cache creation
const createCacheFn = memoize((container: HTMLElement) =>
  createCache({ container, key: 'frame' }),
);

export const IframeProvider = (props: React.PropsWithChildren) => {
  const { children } = props;

  return (
    <Iframe style={{ width: '100%', height: '400px', border: 'none' }}>
      <FrameContextConsumer>
        {(frame) => {
          const iFrameDocument = frame.document;
          const head = iFrameDocument?.head;
          const body = iFrameDocument?.body;

          if (!iFrameDocument || !head || !body) {
            return (
                <Center h="100%">
                   <Spinner />
                   <Text ml={3}>Initializing Preview Frame...</Text>
                </Center>
            );
          }
          
          body.style.margin = '0';
          body.style.padding = '8px';

          return (
            <CacheProvider value={createCacheFn(head)}>
              <EnvironmentProvider value={() => head.ownerDocument}>
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