/**
 * Tooltip Behaviors for Morpheo
 * 
 * This file contains enhanced tooltip functionality that positions
 * tooltips intelligently based on the viewport.
 */

import { create } from './domUtils';

/**
 * Smart tooltip options
 */
export interface TooltipOptions {
  position?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  theme?: 'light' | 'dark' | 'custom';
  showDelay?: number;
  hideDelay?: number;
  maxWidth?: number;
  offset?: number;
  animation?: boolean;
  allowHtml?: boolean;
  zIndex?: number;
  className?: string;
  interactive?: boolean;
}

/**
 * Enhances an element with smart tooltip functionality
 * @param element - The element to enhance
 * @param content - Tooltip content (text or HTML)
 * @param options - Configuration options
 * @returns Function to remove the tooltip enhancement
 */
export function enhanceTooltip(
  element: string | HTMLElement,
  content: string,
  options: TooltipOptions = {}
): () => void {
  try {
    // Default options
    const defaultOptions: TooltipOptions = {
      position: 'auto',
      theme: 'dark',
      showDelay: 300,
      hideDelay: 200,
      maxWidth: 300,
      offset: 8,
      animation: true,
      allowHtml: false,
      zIndex: 1000,
      className: '',
      interactive: false,
      ...options
    };
    
    // Get the element if a selector was provided
    const el = typeof element === 'string'
      ? document.getElementById(element.replace(/^#/, ''))
      : element;
      
    if (!el) {
      console.warn('enhanceTooltip: Element not found', element);
      return () => {};
    }
    
    // Prepare tooltip content
    const tooltipContent = defaultOptions.allowHtml ? content : escapeHtml(content);
    
    // Store original title if it exists
    const originalTitle = el.getAttribute('title') || '';
    if (originalTitle) {
      el.removeAttribute('title'); // Remove to prevent native tooltip
      el.setAttribute('data-original-title', originalTitle);
    }
    
    // Set tooltip content
    el.setAttribute('data-tooltip', tooltipContent);
    
    // Create tooltip element (will be inserted into DOM when shown)
    let tooltipElement: HTMLElement | null = null;
    let showTimeout: number | null = null;
    let hideTimeout: number | null = null;
    let isVisible = false;
    
    // Function to create tooltip element
    const createTooltipElement = () => {
      const tooltip = create('div', {
        class: `morpheo-tooltip ${defaultOptions.theme} ${defaultOptions.className}`,
        style: {
          position: 'absolute',
          zIndex: String(defaultOptions.zIndex),
          maxWidth: `${defaultOptions.maxWidth}px`,
          visibility: 'hidden',
          opacity: '0',
          transition: defaultOptions.animation 
            ? 'opacity 0.2s, visibility 0.2s' 
            : 'none',
          pointerEvents: defaultOptions.interactive ? 'auto' : 'none',
        }
      });
      
      // Add inner content
      const inner = create('div', {
        class: 'morpheo-tooltip-inner',
        style: {
          padding: '0.5rem 0.75rem',
          borderRadius: '4px',
          boxSizing: 'border-box',
        }
      });
      
      if (defaultOptions.allowHtml) {
        inner.innerHTML = tooltipContent;
      } else {
        inner.textContent = tooltipContent;
      }
      
      tooltip.appendChild(inner);
      
      // Add arrow element
      const arrow = create('div', {
        class: 'morpheo-tooltip-arrow',
        style: {
          position: 'absolute',
          width: '8px',
          height: '8px',
          transform: 'rotate(45deg)',
        }
      });
      
      tooltip.appendChild(arrow);
      
      // Apply theme styles
      if (defaultOptions.theme === 'dark') {
        inner.style.backgroundColor = 'rgba(33, 33, 33, 0.9)';
        inner.style.color = '#fff';
        arrow.style.backgroundColor = 'rgba(33, 33, 33, 0.9)';
      } else if (defaultOptions.theme === 'light') {
        inner.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        inner.style.color = '#333';
        inner.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        arrow.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      }
      
      // Add to document body
      document.body.appendChild(tooltip);
      
      return tooltip;
    };
    
    // Function to position the tooltip
    const positionTooltip = () => {
      if (!tooltipElement || !el) return;
      
      // Get element and tooltip dimensions
      const elRect = el.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();
      
      // Calculate available space in each direction
      const spaceTop = elRect.top;
      const spaceRight = window.innerWidth - elRect.right;
      const spaceBottom = window.innerHeight - elRect.bottom;
      const spaceLeft = elRect.left;
      
      // Determine best position if set to auto
      let position = defaultOptions.position;
      
      if (position === 'auto') {
        // Find direction with most space
        const spaces = [
          { dir: 'top', space: spaceTop },
          { dir: 'right', space: spaceRight },
          { dir: 'bottom', space: spaceBottom },
          { dir: 'left', space: spaceLeft }
        ];
        
        spaces.sort((a, b) => b.space - a.space);
        position = spaces[0].dir as 'top' | 'right' | 'bottom' | 'left';
        
        // Make sure there's enough space for tooltip
        if (position === 'top' || position === 'bottom') {
          if (tooltipRect.width > window.innerWidth) {
            tooltipElement.style.maxWidth = `${window.innerWidth - 20}px`;
          }
        }
      }
      
      // Calculate position
      let top = 0;
      let left = 0;
      const offset = defaultOptions.offset || 0;
      
      const arrow = tooltipElement.querySelector('.morpheo-tooltip-arrow') as HTMLElement;
      
      // Position based on direction
      switch (position) {
        case 'top':
          top = elRect.top - tooltipRect.height - offset;
          left = elRect.left + (elRect.width / 2) - (tooltipRect.width / 2);
          
          // Arrow positioning
          arrow.style.bottom = '-4px';
          arrow.style.left = '50%';
          arrow.style.transform = 'translateX(-50%) rotate(45deg)';
          break;
          
        case 'right':
          top = elRect.top + (elRect.height / 2) - (tooltipRect.height / 2);
          left = elRect.right + offset;
          
          // Arrow positioning
          arrow.style.left = '-4px';
          arrow.style.top = '50%';
          arrow.style.transform = 'translateY(-50%) rotate(45deg)';
          break;
          
        case 'bottom':
          top = elRect.bottom + offset;
          left = elRect.left + (elRect.width / 2) - (tooltipRect.width / 2);
          
          // Arrow positioning
          arrow.style.top = '-4px';
          arrow.style.left = '50%';
          arrow.style.transform = 'translateX(-50%) rotate(45deg)';
          break;
          
        case 'left':
          top = elRect.top + (elRect.height / 2) - (tooltipRect.height / 2);
          left = elRect.left - tooltipRect.width - offset;
          
          // Arrow positioning
          arrow.style.right = '-4px';
          arrow.style.top = '50%';
          arrow.style.transform = 'translateY(-50%) rotate(45deg)';
          break;
      }
      
      // Adjust to keep tooltip in viewport
      if (left < 10) {
        left = 10;
        
        // Adjust arrow if tooltip is pushed
        if (position === 'top' || position === 'bottom') {
          const newArrowLeft = (elRect.left + elRect.width / 2) - left;
          arrow.style.left = `${newArrowLeft}px`;
          arrow.style.transform = 'rotate(45deg)';
        }
      }
      
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
        
        // Adjust arrow if tooltip is pushed
        if (position === 'top' || position === 'bottom') {
          const newArrowLeft = (elRect.left + elRect.width / 2) - left;
          arrow.style.left = `${newArrowLeft}px`;
          arrow.style.transform = 'rotate(45deg)';
        }
      }
      
      if (top < 10) {
        top = 10;
        
        // Adjust arrow if tooltip is pushed
        if (position === 'left' || position === 'right') {
          const newArrowTop = (elRect.top + elRect.height / 2) - top;
          arrow.style.top = `${newArrowTop}px`;
          arrow.style.transform = 'rotate(45deg)';
        }
      }
      
      if (top + tooltipRect.height > window.innerHeight - 10) {
        top = window.innerHeight - tooltipRect.height - 10;
        
        // Adjust arrow if tooltip is pushed
        if (position === 'left' || position === 'right') {
          const newArrowTop = (elRect.top + elRect.height / 2) - top;
          arrow.style.top = `${newArrowTop}px`;
          arrow.style.transform = 'rotate(45deg)';
        }
      }
      
      // Apply position
      tooltipElement.style.top = `${top + window.scrollY}px`;
      tooltipElement.style.left = `${left + window.scrollX}px`;
      
      // Set positioning data attributes
      tooltipElement.setAttribute('data-position', position || 'auto');
    };
    
    // Show tooltip
    const showTooltip = () => {
      // Clear any existing hide timeout
      if (hideTimeout !== null) {
        window.clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Create tooltip if it doesn't exist
      if (!tooltipElement) {
        tooltipElement = createTooltipElement();
      }
      
      // Set visible and position
      if (tooltipElement) {
        tooltipElement.style.visibility = 'visible';
        tooltipElement.style.opacity = '1';
        positionTooltip();
        isVisible = true;
      }
    };
    
    // Hide tooltip
    const hideTooltip = () => {
      if (tooltipElement && isVisible) {
        tooltipElement.style.visibility = 'hidden';
        tooltipElement.style.opacity = '0';
        isVisible = false;
      }
    };
    
    // Schedule tooltip show with delay
    const scheduleShow = () => {
      if (showTimeout !== null) {
        window.clearTimeout(showTimeout);
      }
      
      showTimeout = window.setTimeout(() => {
        showTooltip();
        showTimeout = null;
      }, defaultOptions.showDelay);
    };
    
    // Schedule tooltip hide with delay
    const scheduleHide = () => {
      if (hideTimeout !== null) {
        window.clearTimeout(hideTimeout);
      }
      
      hideTimeout = window.setTimeout(() => {
        hideTooltip();
        hideTimeout = null;
      }, defaultOptions.hideDelay);
    };
    
    // Event handlers
    const handleMouseEnter = () => scheduleShow();
    const handleMouseLeave = () => scheduleHide();
    const handleFocus = () => scheduleShow();
    const handleBlur = () => scheduleHide();
    
    // Add event listeners
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('focus', handleFocus);
    el.addEventListener('blur', handleBlur);
    
    // Add tooltip interaction events if interactive
    const handleTooltipMouseEnter = () => {
      if (hideTimeout !== null) {
        window.clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };
    
    const handleTooltipMouseLeave = () => {
      scheduleHide();
    };
    
    // Update position on scroll and resize
    const handlePositionUpdate = () => {
      if (isVisible) {
        positionTooltip();
      }
    };
    
    window.addEventListener('scroll', handlePositionUpdate);
    window.addEventListener('resize', handlePositionUpdate);
    
    // Cleanup function
    return () => {
      // Restore original title
      if (originalTitle) {
        el.setAttribute('title', originalTitle);
        el.removeAttribute('data-original-title');
      }
      
      // Remove data attribute
      el.removeAttribute('data-tooltip');
      
      // Remove event listeners
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('focus', handleFocus);
      el.removeEventListener('blur', handleBlur);
      
      // Remove window listeners
      window.removeEventListener('scroll', handlePositionUpdate);
      window.removeEventListener('resize', handlePositionUpdate);
      
      // Clear timeouts
      if (showTimeout !== null) {
        window.clearTimeout(showTimeout);
      }
      
      if (hideTimeout !== null) {
        window.clearTimeout(hideTimeout);
      }
      
      // Remove tooltip element
      if (tooltipElement) {
        if (defaultOptions.interactive) {
          tooltipElement.removeEventListener('mouseenter', handleTooltipMouseEnter);
          tooltipElement.removeEventListener('mouseleave', handleTooltipMouseLeave);
        }
        
        document.body.removeChild(tooltipElement);
        tooltipElement = null;
      }
    };
  } catch (error) {
    console.error('Error in enhanceTooltip:', error);
    return () => {};
  }
}

/**
 * Helper function to escape HTML content
 */
function escapeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
} 