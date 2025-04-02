/**
 * Context Menu Behaviors for Morpheo
 * 
 * This file contains utilities for creating custom context menus
 * that can replace or augment the browser's default context menu.
 */

import { create } from './domUtils';

/**
 * Menu item interface
 */
export interface ContextMenuItem {
  label: string;
  icon?: string;
  action?: (event: MouseEvent) => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

/**
 * Context menu options
 */
export interface ContextMenuOptions {
  theme?: 'light' | 'dark';
  width?: number;
  zIndex?: number;
  className?: string;
  closeOnClick?: boolean;
  preventDefaultContext?: boolean;
}

/**
 * Enhances an element with a custom context menu
 * @param element - The element to enhance
 * @param items - Array of menu items
 * @param options - Configuration options
 * @returns Function to remove the context menu
 */
export function enhanceContextMenu(
  element: string | HTMLElement,
  items: ContextMenuItem[],
  options: ContextMenuOptions = {}
): () => void {
  try {
    // Default options
    const defaultOptions: ContextMenuOptions = {
      theme: 'dark',
      width: 200,
      zIndex: 1000,
      className: '',
      closeOnClick: true,
      preventDefaultContext: true,
      ...options
    };
    
    // Get the element if a selector was provided
    const el = typeof element === 'string'
      ? document.getElementById(element.replace(/^#/, ''))
      : element;
      
    if (!el) {
      console.warn('enhanceContextMenu: Element not found', element);
      return () => {};
    }
    
    // Create context menu element (will be inserted into DOM when shown)
    let menuElement: HTMLElement | null = null;
    let activeSubmenuElement: HTMLElement | null = null;
    let isVisible = false;
    
    // Function to create the menu element
    const createMenuElement = (menuItems: ContextMenuItem[], isSubmenu = false): HTMLElement => {
      const menuEl = create('div', {
        class: `morpheo-context-menu ${defaultOptions.theme} ${defaultOptions.className} ${isSubmenu ? 'submenu' : ''}`,
        style: {
          position: 'absolute',
          zIndex: String(defaultOptions.zIndex),
          width: `${defaultOptions.width}px`,
          display: 'none',
          padding: '4px 0',
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          backgroundColor: defaultOptions.theme === 'dark' ? '#333' : '#fff',
          color: defaultOptions.theme === 'dark' ? '#fff' : '#333',
          boxSizing: 'border-box',
          userSelect: 'none',
          overflow: 'hidden',
          fontSize: '14px',
        }
      });
      
      // Add menu items
      menuItems.forEach(item => {
        if (item.separator) {
          // Create separator
          const separator = create('div', {
            class: 'morpheo-context-menu-separator',
            style: {
              height: '1px',
              margin: '4px 0',
              backgroundColor: defaultOptions.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }
          });
          
          menuEl.appendChild(separator);
        } else {
          // Create menu item
          const menuItem = create('div', {
            class: `morpheo-context-menu-item ${item.disabled ? 'disabled' : ''}`,
            style: {
              padding: '8px 12px',
              cursor: item.disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: item.disabled ? '0.5' : '1',
              position: 'relative',
            }
          });
          
          // Add hover effect
          if (!item.disabled) {
            menuItem.addEventListener('mouseenter', () => {
              menuItem.style.backgroundColor = defaultOptions.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              
              // Close any open submenu
              if (activeSubmenuElement) {
                activeSubmenuElement.style.display = 'none';
                activeSubmenuElement = null;
              }
              
              // Show submenu if available
              if (item.submenu && item.submenu.length > 0) {
                const submenu = createMenuElement(item.submenu, true);
                document.body.appendChild(submenu);
                
                // Position the submenu
                const menuItemRect = menuItem.getBoundingClientRect();
                submenu.style.top = `${menuItemRect.top}px`;
                submenu.style.left = `${menuItemRect.right + 5}px`;
                submenu.style.display = 'block';
                
                // Keep track of active submenu
                activeSubmenuElement = submenu;
                
                // Adjust if out of viewport
                const submenuRect = submenu.getBoundingClientRect();
                if (submenuRect.right > window.innerWidth) {
                  submenu.style.left = `${menuItemRect.left - submenuRect.width - 5}px`;
                }
              }
            });
            
            menuItem.addEventListener('mouseleave', () => {
              menuItem.style.backgroundColor = '';
            });
          }
          
          // Add icon if available
          if (item.icon) {
            const icon = create('span', {
              class: 'morpheo-context-menu-icon',
              style: {
                marginRight: '8px',
                width: '16px',
                height: '16px',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
              }
            });
            
            // Support for both SVG and CSS classes
            if (item.icon.startsWith('<svg') || item.icon.startsWith('<i')) {
              icon.innerHTML = item.icon;
            } else {
              icon.innerHTML = `<i class="${item.icon}"></i>`;
            }
            
            menuItem.appendChild(icon);
          }
          
          // Add label
          const label = create('span', {
            class: 'morpheo-context-menu-label',
            style: {
              flex: '1',
            }
          }, item.label);
          
          menuItem.appendChild(label);
          
          // Add arrow for submenu
          if (item.submenu && item.submenu.length > 0) {
            const arrow = create('span', {
              class: 'morpheo-context-menu-arrow',
              style: {
                marginLeft: '8px',
                fontSize: '0.7em',
              }
            }, '▶');
            
            menuItem.appendChild(arrow);
          }
          
          // Add click handler
          if (!item.disabled && item.action) {
            menuItem.addEventListener('click', (e: MouseEvent) => {
              if (defaultOptions.closeOnClick) {
                hideMenu();
              }
              
              try {
                if (typeof item.action === 'function') {
                  item.action(e);
                }
              } catch (error) {
                console.error('Error in context menu item action:', error);
              }
            });
          }
          
          menuEl.appendChild(menuItem);
        }
      });
      
      return menuEl;
    };
    
    // Position menu at specific coordinates
    const positionMenu = (x: number, y: number) => {
      if (!menuElement) return;
      
      // Set initial position
      menuElement.style.left = `${x}px`;
      menuElement.style.top = `${y}px`;
      
      // Make sure the menu is visible
      menuElement.style.display = 'block';
      
      // Get dimensions
      const menuRect = menuElement.getBoundingClientRect();
      
      // Adjust if menu goes outside viewport
      if (x + menuRect.width > window.innerWidth) {
        x = window.innerWidth - menuRect.width - 5;
        menuElement.style.left = `${x}px`;
      }
      
      if (y + menuRect.height > window.innerHeight) {
        y = window.innerHeight - menuRect.height - 5;
        menuElement.style.top = `${y}px`;
      }
    };
    
    // Show the context menu
    const showMenu = (e: MouseEvent) => {
      // Prevent default context menu if configured
      if (defaultOptions.preventDefaultContext) {
        e.preventDefault();
      }
      
      // Create menu if it doesn't exist
      if (!menuElement) {
        menuElement = createMenuElement(items);
        document.body.appendChild(menuElement);
      }
      
      // Position the menu at cursor
      positionMenu(e.clientX, e.clientY);
      
      // Set visible flag
      isVisible = true;
      
      // Add document click handler to close menu
      setTimeout(() => {
        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('contextmenu', handleDocumentClick);
      }, 10);
    };
    
    // Hide the menu
    const hideMenu = () => {
      // Hide main menu
      if (menuElement) {
        menuElement.style.display = 'none';
      }
      
      // Hide any active submenu
      if (activeSubmenuElement) {
        activeSubmenuElement.style.display = 'none';
        activeSubmenuElement = null;
      }
      
      // Update visibility flag
      isVisible = false;
      
      // Remove document click handler
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('contextmenu', handleDocumentClick);
    };
    
    // Handle document click to close menu
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore clicks on the menu itself
      if (menuElement && menuElement.contains(e.target as Node)) {
        return;
      }
      
      hideMenu();
    };
    
    // Add context menu event listener
    el.addEventListener('contextmenu', showMenu);
    
    // Return cleanup function
    return () => {
      // Remove event listener
      el.removeEventListener('contextmenu', showMenu);
      
      // Remove document click handler
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('contextmenu', handleDocumentClick);
      
      // Remove menu from DOM
      if (menuElement && menuElement.parentNode) {
        menuElement.parentNode.removeChild(menuElement);
        menuElement = null;
      }
      
      // Remove any active submenu
      if (activeSubmenuElement && activeSubmenuElement.parentNode) {
        activeSubmenuElement.parentNode.removeChild(activeSubmenuElement);
        activeSubmenuElement = null;
      }
    };
  } catch (error) {
    console.error('Error in enhanceContextMenu:', error);
    return () => {};
  }
} 