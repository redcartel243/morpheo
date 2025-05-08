import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { RootState } from '../../store';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  Link,
  Circle,
  Alert,
  AlertTitle,
  AlertDescription,
  Icon,
} from '@chakra-ui/react';

const AddIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
    />
  </Icon>
);

const LightbulbIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z"
    />
  </Icon>
);

const ChartIcon = (props: any) => (
    <Icon viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z" />
    </Icon>
);

const ArrowRightIcon = (props: any) => (
  <Icon viewBox="0 0 20 20" {...props}>
     <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </Icon>
);

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);

  const bgColor = mode === 'dark' ? 'gray.900' : 'gray.100';
  const cardBgColor = mode === 'dark' ? 'gray.800' : 'white';
  const textColor = mode === 'dark' ? 'gray.100' : 'gray.900';
  const secondaryTextColor = mode === 'dark' ? 'gray.400' : 'gray.600';
  const accentPurple = mode === 'dark' ? 'purple.400' : 'purple.600';
  const accentPurpleBg = mode === 'dark' ? 'purple.900' : 'purple.100';
  const accentBlue = mode === 'dark' ? 'blue.400' : 'blue.600';
  const accentBlueBg = mode === 'dark' ? 'blue.900' : 'blue.100';
  const accentGreen = mode === 'dark' ? 'green.300' : 'green.600';
  const errorColor = mode === 'dark' ? 'red.300' : 'red.700';
  const errorBg = mode === 'dark' ? 'red.900' : 'red.50';
  const placeholderBg = mode === 'dark' ? 'gray.700' : 'gray.200';
  const placeholderColor = mode === 'dark' ? 'gray.500' : 'gray.500';
  const borderColor = mode === 'dark' ? 'gray.700' : 'gray.200';
  const hoverBorderColor = mode === 'dark' ? accentPurple : 'purple.500';
  
  return (
    <Container maxW="container.xl" py={8} bg={bgColor} minH="100vh">
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ base: 'flex-start', md: 'center' }}
        mb={8}
      >
        <Box>
          <Heading as="h1" size="xl" color={textColor}>
            Welcome, {user?.displayName || user?.email || 'User'}!
          </Heading>
          <Text mt={2} color={secondaryTextColor}>
            Create and manage your AI-generated UIs
          </Text>
        </Box>
        
        <RouterLink to="/generate">
          <Link _hover={{ textDecoration: 'none' }}>
            <Button
              colorPalette="purple"
              mt={{ base: 4, md: 0 }}
        >
          Create New UI
            </Button>
        </Link>
        </RouterLink>
      </Flex>
      
      {fetchError && (
        <Alert.Root status="error" variant="subtle" mb={6} borderRadius="md" bg={errorBg}>
          <Alert.Indicator color={errorColor} />
          <Alert.Content>
            <Box>
              <AlertTitle color={errorColor}>Error</AlertTitle>
              <AlertDescription color={errorColor}>{fetchError}</AlertDescription>
            </Box>
          </Alert.Content>
        </Alert.Root>
      )}
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        <Box 
          p={6} 
          bg={cardBgColor} 
          shadow="lg"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
          _hover={{ 
            transform: 'scale(1.03)',
            borderColor: hoverBorderColor,
          }}
        >
          <Circle size="48px" bg={accentBlueBg} mb={4}>
              <AddIcon boxSize="24px" color={accentBlue} />
            </Circle>
            <Heading as="h2" size="md" color={textColor} mb={2}>
              Generate New UI
            </Heading>
            <Text color={secondaryTextColor} mb={4}>
              Describe what you want, and let AI create a custom UI for you.
            </Text>
            <RouterLink to="/generate">
              <Link color={accentBlue} fontWeight="medium">
                Get started <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
            </Link>
            </RouterLink>
        </Box>
        
        <Box 
          p={6} 
          bg={cardBgColor} 
          shadow="lg" 
          borderRadius="xl" 
          borderWidth="1px" 
          borderColor={borderColor}
          transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
          _hover={{ 
            transform: 'scale(1.03)',
            borderColor: hoverBorderColor, 
          }}
        >
            <Circle size="48px" bg={accentPurpleBg} mb={4}>
              <LightbulbIcon boxSize="24px" color={accentPurple} />
            </Circle>
            <Heading as="h2" size="md" color={textColor} mb={2}>
              Example UIs
            </Heading>
            <Text color={secondaryTextColor} mb={4}>
              Explore pre-built examples to get inspiration for your own UIs.
            </Text>
            <Link href="#examples" color={accentPurple} fontWeight="medium">
              View examples <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
            </Link>
        </Box>

        <Box 
          p={6} 
          bg={cardBgColor} 
          shadow="lg" 
          borderRadius="xl" 
          borderWidth="1px" 
          borderColor={borderColor}
          transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
          _hover={{ 
            transform: 'scale(1.03)',
            borderColor: hoverBorderColor, 
          }}
        >
            <Circle size="48px" bg={accentGreen} mb={4}>
              <Icon viewBox="0 0 20 20" fill="currentColor" boxSize="24px" color="green.900">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </Icon>
            </Circle>
            <Heading as="h2" size="md" color={textColor} mb={2}>
              Saved UIs
            </Heading>
            <Text color={secondaryTextColor} mb={4}>
              Access your previously generated and saved user interfaces.
            </Text>
            <Link href="/saved" color={accentGreen} fontWeight="medium">
              View saved <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
            </Link>
        </Box>
      </SimpleGrid>
      
      <Box mt={12}>
        <Heading as="h2" size="lg" color={textColor} mb={6}>
          Recent UIs
        </Heading>
        
        <Box 
          bg={mode === 'dark' ? 'gray.800' : 'gray.100'} 
          borderRadius="xl" 
          p={8} 
          textAlign="center"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Text color={secondaryTextColor} mb={4}>
            Create a new UI to get started.
          </Text>
          <RouterLink to="/generate">
            <Link _hover={{ textDecoration: 'none' }}>
              <Button colorPalette="purple">
            Create your first UI
              </Button>
          </Link>
          </RouterLink>
        </Box>
      </Box>
      
      <Box id="examples" mt={12}>
        <Heading as="h2" size="lg" color={textColor} mb={6}>
          Example UIs
        </Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          <Box 
            p={6} 
            bg={cardBgColor} 
            shadow="lg" 
            borderRadius="xl" 
            borderWidth="1px" 
            borderColor={borderColor}
            overflow="hidden"
            transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
            _hover={{ 
              transform: 'scale(1.03)',
              borderColor: hoverBorderColor,
            }}
          >
            <Box h="192px" bgGradient="linear(to-r, blue.500, purple.600)" display="flex" alignItems="center" justifyContent="center" p={6} borderRadius="lg" mb={4}>
              <ChartIcon boxSize="80px" color="white" />
            </Box>
            <Box mt={4}>
              <Heading as="h3" size="md" color={textColor}>AI Chart Generator</Heading>
              <Text mt={2} color={secondaryTextColor}>
                Generate dynamic, domain-agnostic charts using Gemini's structured output. Demonstrates how to use AI for component configuration without domain-specific implementations.
              </Text>
              <Box mt={4}>
                 <RouterLink to="/chart-generator">
                   <Link _hover={{ textDecoration: 'none' }}>
                     <Button
                         colorPalette="purple"
                         variant="solid"
                >
                  Try it out
                       <ArrowRightIcon display="inline" ml={2} boxSize="1em" />
                     </Button>
                </Link>
                 </RouterLink>
               </Box>
            </Box>
          </Box>
          
          <Box 
            p={6} 
            bg={cardBgColor} 
            shadow="lg" 
            borderRadius="xl" 
            borderWidth="1px" 
            borderColor={borderColor}
            overflow="hidden"
            transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
            _hover={{ 
              transform: 'scale(1.03)',
              borderColor: hoverBorderColor,
            }}
          >
              <Box h="192px" bg={placeholderBg} display="flex" alignItems="center" justifyContent="center" borderRadius="lg" mb={4}>
                <Text color={placeholderColor}>Calculator Preview</Text>
              </Box>
              <Box mt={4}>
                <Heading as="h3" size="sm" color={textColor} mb={2}>
                Calculator
                </Heading>
                <Text color={secondaryTextColor} mb={4}>
                A calculator with standard operations and a clean modern design.
                </Text>
                <Flex justifyContent="space-between">
                   <RouterLink to="/app?type=calculator">
                     <Link color={accentGreen} fontWeight="medium">
                       View Demo <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
                </Link>
                   </RouterLink>
                   <RouterLink
                  to="/generate"
                  state={{ initialPrompt: "Create a calculator with standard operations and a clean modern design." }}
                >
                     <Link color={accentBlue} fontWeight="medium">
                       Try this example <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
                </Link>
                   </RouterLink>
                 </Flex>
              </Box>
            </Box>
          
          <Box 
            p={6} 
            bg={cardBgColor} 
            shadow="lg" 
            borderRadius="xl" 
            borderWidth="1px" 
            borderColor={borderColor}
            overflow="hidden"
            transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
            _hover={{ 
              transform: 'scale(1.03)',
              borderColor: hoverBorderColor,
            }}
          >
            <Box h="192px" bg={placeholderBg} display="flex" alignItems="center" justifyContent="center" borderRadius="lg" mb={4}>
              <Text color={placeholderColor}>Finance Dashboard Preview</Text>
            </Box>
            <Box mt={4}>
              <Heading as="h3" size="sm" color={textColor} mb={2}>
                Finance Dashboard
              </Heading>
              <Text color={secondaryTextColor} mb={4}>
                A finance dashboard with a pie chart, an income/expense tracker, and weekly summaries.
              </Text>
              <Flex justifyContent="flex-end">
                <RouterLink
                  to="/generate"
                  state={{ initialPrompt: "I need a finance dashboard with a pie chart, an income/expense tracker, and weekly summaries." }}
                >
                  <Link color={accentBlue} fontWeight="medium">
                    Try this example <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
                </Link>
                </RouterLink>
              </Flex>
            </Box>
          </Box>

            <Box 
              p={6} 
              bg={cardBgColor} 
              shadow="lg" 
              borderRadius="xl" 
              borderWidth="1px" 
              borderColor={borderColor}
              overflow="hidden"
              transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
              _hover={{ 
                transform: 'scale(1.03)',
                borderColor: hoverBorderColor,
              }}
            >
               <Box h="192px" bg={placeholderBg} display="flex" alignItems="center" justifyContent="center" borderRadius="lg" mb={4}>
                 <Text color={placeholderColor}>Todo App Preview</Text>
               </Box>
               <Box mt={4}>
                 <Heading as="h3" size="sm" color={textColor} mb={2}>
                Todo App
                 </Heading>
                 <Text color={secondaryTextColor} mb={4}>
                   A simple todo application to manage tasks.
                 </Text>
                  <Flex justifyContent="flex-end">
                    <RouterLink
                  to="/generate"
                      state={{ initialPrompt: "Build a simple todo application with add, complete, and delete functionality." }}
                >
                      <Link color={accentBlue} fontWeight="medium">
                        Try this example <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
                </Link>
                    </RouterLink>
                  </Flex>
               </Box>
             </Box>

              <Box 
                p={6} 
                bg={cardBgColor} 
                shadow="lg" 
                borderRadius="xl" 
                borderWidth="1px" 
                borderColor={borderColor}
                overflow="hidden"
                transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
                _hover={{ 
                  transform: 'scale(1.03)',
                  borderColor: hoverBorderColor,
                }}
              >
                <Box h="192px" bg={placeholderBg} display="flex" alignItems="center" justifyContent="center" borderRadius="lg" mb={4}>
                  <Text color={placeholderColor}>TaskMaster Preview</Text>
                </Box>
                <Box mt={4}>
                  <Heading as="h3" size="sm" color={textColor} mb={2}>
                    TaskMaster Pro
                  </Heading>
                  <Text color={secondaryTextColor} mb={4}>
                    Advanced task manager with projects, priorities, and deadlines.
                  </Text>
                  <Flex justifyContent="flex-end">
                    <RouterLink
                  to="/generate"
                      state={{ initialPrompt: "Create an advanced task manager called TaskMaster Pro with projects, priorities, and deadlines." }}
                >
                      <Link color={accentBlue} fontWeight="medium">
                        Try this example <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
                </Link>
                    </RouterLink>
                  </Flex>
                </Box>
              </Box>

                <Box 
                  p={6} 
                  bg={cardBgColor} 
                  shadow="lg" 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor={borderColor}
                  overflow="hidden"
                  transition="transform 0.2s ease-in-out, border-color 0.2s ease-in-out"
                  _hover={{ 
                    transform: 'scale(1.03)',
                    borderColor: hoverBorderColor,
                  }}
                >
                  <Box h="192px" bg={placeholderBg} display="flex" alignItems="center" justifyContent="center" borderRadius="lg" mb={4}>
                    <Text color={placeholderColor}>Component Library Preview</Text>
                  </Box>
                  <Box mt={4}>
                    <Heading as="h3" size="sm" color={textColor} mb={2}>
                      Component Library Showcase
                    </Heading>
                    <Text color={secondaryTextColor} mb={4}>
                      Display various common UI components like buttons, inputs, and cards.
                    </Text>
                    <Flex justifyContent="flex-end">
                      <RouterLink
                  to="/generate"
                        state={{ initialPrompt: "Create a page showcasing common UI components: primary/secondary buttons, text input, checkbox, radio buttons, and a simple card." }}
                >
                        <Link color={accentBlue} fontWeight="medium">
                          Try this example <ArrowRightIcon display="inline" ml={1} boxSize="1em"/>
                </Link>
                      </RouterLink>
                    </Flex>
                  </Box>
                </Box>
              
        </SimpleGrid>
      </Box>
    </Container>
  );
};

export default Dashboard; 