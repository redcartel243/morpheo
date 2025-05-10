import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { logoutAsync } from '../../store/slices/authSlice';
import { toggleThemeMode } from '../../store/slices/themeSlice';
import {
  Box, 
  Flex, 
  Text,
  Button, 
  Menu, 
  IconButton,
  Icon,
} from '@chakra-ui/react';
import { FiLogOut, FiMoon, FiSun, FiUser, FiChevronDown, FiMenu } from 'react-icons/fi';

const Header: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync() as any);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleToggleTheme = () => {
    dispatch(toggleThemeMode());
  };

  // Define hover background color directly (works reasonably in both modes)
  const menuHoverBg = mode === 'dark' ? 'gray.700' : 'gray.100';
  const headerBg = mode === 'dark' ? 'gray.800' : 'white';
  const logoColor = mode === 'dark' ? 'blue.400' : 'purple.500';

  return (
    <Box as="header" bg={headerBg} boxShadow="sm">
      <Flex 
        maxW="7xl" 
        mx="auto" 
        px={{ base: 4, md: 8 }} 
        py={3} 
        justifyContent="space-between" 
        alignItems="center"
      >
        <Link to="/">
          <Text fontSize="2xl" fontWeight="bold" color={logoColor}>
            Morpheo
          </Text>
        </Link>
        
        <Flex alignItems="center" gap={4}>
          {isAuthenticated ? (
            <>
              {/* Desktop Navigation */}
              <Flex as="nav" display={{ base: 'none', md: 'flex' }} gap={4}>
                <Link to="/generate">
                  <Button 
                    variant={location.pathname === '/generate' || location.pathname === '/' ? 'solid' : 'ghost'} 
                    colorScheme="purple"
                    size="sm"
                  >
                    Generator
                  </Button>
                </Link>
                <Link to="/saved">
                  <Button 
                    variant={location.pathname === '/saved' ? 'solid' : 'ghost'} 
                    colorScheme="purple"
                    size="sm"
                  >
                    Saved
                  </Button>
                </Link>
              </Flex>

              <IconButton
                aria-label="Toggle theme"
                onClick={handleToggleTheme}
                variant="ghost"
                size="sm"
              >
                <Icon as={mode === 'dark' ? FiSun : FiMoon} />
              </IconButton>

              {/* User Menu using Chakra UI Menu v3 structure */}
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                  >
                    <Flex align="center" gap={2}>
                      <Icon as={FiUser} />
                      <Text as="span" display={{ base: 'none', sm: 'inline' }}>
                        {user?.displayName || user?.email || 'Account'}
                      </Text>
                      <Icon as={FiChevronDown} w={3} h={3} />
                    </Flex>
                  </Button>
                </Menu.Trigger>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="logout" onClick={handleLogout} _hover={{ bg: menuHoverBg }}>
                      <Icon as={FiLogOut} mr={2} /> Logout
                    </Menu.Item>
                    {/* Add other items here */}
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>

              {/* Mobile Navigation Menu */}
              <Box display={{ base: 'block', md: 'none' }}>
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <IconButton
                      aria-label="Open navigation menu"
                      variant="ghost"
                      size="sm"
                    >
                      <Icon as={FiMenu} />
                    </IconButton>
                  </Menu.Trigger>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item value="generator" onClick={() => navigate('/generate')} _hover={{ bg: menuHoverBg }}>
                        Generator
                      </Menu.Item>
                      <Menu.Item value="saved" onClick={() => navigate('/saved')} _hover={{ bg: menuHoverBg }}>
                        Saved
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Menu.Root>
              </Box>
            </>
          ) : (
            <Flex gap={2}>
              <Link to="/login">
                <Button variant="ghost" colorScheme="purple" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="solid" colorScheme="purple" size="sm">Register</Button>
              </Link>
              <IconButton
                aria-label="Toggle theme"
                onClick={handleToggleTheme}
                variant="ghost"
                size="sm"
              >
                <Icon as={mode === 'dark' ? FiSun : FiMoon} />
              </IconButton>
            </Flex>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header; 