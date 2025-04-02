/**
 * Drag and Drop Behaviors for Morpheo
 * 
 * This file contains utilities for adding drag and drop functionality
 * to elements in a simple, reusable way.
 */

/**
 * Options for enhancing an element with drag and drop
 */
export interface DragDropOptions {
  handle?: string;
  containment?: HTMLElement | 'parent' | 'window';
  axis?: 'x' | 'y' | 'both';
  grid?: [number, number];
  onDragStart?: (event: MouseEvent | TouchEvent, element: HTMLElement) => void;
  onDrag?: (event: MouseEvent | TouchEvent, element: HTMLElement, deltaX: number, deltaY: number) => void;
  onDragEnd?: (event: MouseEvent | TouchEvent, element: HTMLElement) => void;
  dragClass?: string;
  useTransform?: boolean;
}

/**
 * Enhances an element with drag and drop functionality
 * @param element - The element to make draggable
 * @param options - Configuration options
 * @returns Function to remove the drag and drop functionality
 */
export function enhanceDragDrop(
  element: string | HTMLElement,
  options: DragDropOptions = {}
): () => void {
  try {
    // Default options
    const defaultOptions: DragDropOptions = {
      handle: undefined,
      containment: undefined,
      axis: 'both',
      grid: undefined,
      onDragStart: undefined,
      onDrag: undefined,
      onDragEnd: undefined,
      dragClass: 'dragging',
      useTransform: true,
      ...options
    };
    
    // Get the element if a selector was provided
    const el = typeof element === 'string'
      ? document.getElementById(element.replace(/^#/, ''))
      : element;
      
    if (!el) {
      console.warn('enhanceDragDrop: Element not found', element);
      return () => {};
    }
    
    // Get the handle element if specified
    const handleEl = defaultOptions.handle
      ? el.querySelector(defaultOptions.handle) as HTMLElement
      : el;
      
    if (!handleEl) {
      console.warn('enhanceDragDrop: Handle element not found', defaultOptions.handle);
      return () => {};
    }
    
    // Get containment element if specified
    let containmentEl: HTMLElement | null = null;
    
    if (defaultOptions.containment) {
      if (defaultOptions.containment === 'parent') {
        containmentEl = el.parentElement as HTMLElement;
      } else if (defaultOptions.containment === 'window') {
        containmentEl = null; // Special case, handled in constraints
      } else {
        containmentEl = defaultOptions.containment as HTMLElement;
      }
    }
    
    // Set initial position styles
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }
    
    // Variables to track drag state
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let originalX = 0;
    let originalY = 0;
    let currentX = 0;
    let currentY = 0;
    
    // Ensure element's transform is considered in positioning
    const getElementPosition = () => {
      // Get the computed transform matrix
      const style = window.getComputedStyle(el);
      const matrix = new DOMMatrix(style.transform);
      
      return {
        x: matrix.e,
        y: matrix.f
      };
    };
    
    // Get original position
    const position = getElementPosition();
    originalX = position.x;
    originalY = position.y;
    currentX = originalX;
    currentY = originalY;
    
    // Apply position with constraints
    const applyPosition = (x: number, y: number) => {
      // Apply grid snapping if enabled
      if (defaultOptions.grid) {
        const [gridX, gridY] = defaultOptions.grid;
        x = Math.round(x / gridX) * gridX;
        y = Math.round(y / gridY) * gridY;
      }
      
      // Apply axis constraints
      if (defaultOptions.axis === 'x') {
        y = originalY;
      } else if (defaultOptions.axis === 'y') {
        x = originalX;
      }
      
      // Apply containment constraints
      if (containmentEl) {
        const elRect = el.getBoundingClientRect();
        const containerRect = containmentEl.getBoundingClientRect();
        
        const minX = containerRect.left - elRect.left + currentX;
        const maxX = containerRect.right - elRect.right + currentX;
        const minY = containerRect.top - elRect.top + currentY;
        const maxY = containerRect.bottom - elRect.bottom + currentY;
        
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
      } else if (defaultOptions.containment === 'window') {
        // Window containment
        const elRect = el.getBoundingClientRect();
        
        const minX = -elRect.left + currentX;
        const maxX = window.innerWidth - elRect.right + currentX;
        const minY = -elRect.top + currentY;
        const maxY = window.innerHeight - elRect.bottom + currentY;
        
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
      }
      
      // Update current position
      currentX = x;
      currentY = y;
      
      // Apply position using transform or direct positioning
      if (defaultOptions.useTransform) {
        el.style.transform = `translate(${x}px, ${y}px)`;
      } else {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
    };
    
    // Event handlers
    const handleDragStart = (e: MouseEvent | TouchEvent) => {
      // Only handle left mouse button
      if (e instanceof MouseEvent && e.button !== 0) {
        return;
      }
      
      e.preventDefault();
      
      // Set initial positions
      const position = getElementPosition();
      originalX = position.x;
      originalY = position.y;
      
      if (e instanceof MouseEvent) {
        startX = e.clientX;
        startY = e.clientY;
      } else {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
      
      isDragging = true;
      
      // Add dragging class
      if (defaultOptions.dragClass) {
        el.classList.add(defaultOptions.dragClass);
      }
      
      // Call drag start callback
      if (typeof defaultOptions.onDragStart === 'function') {
        defaultOptions.onDragStart(e, el);
      }
      
      // Add document-level event listeners
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);
    };
    
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      let currentClientX: number;
      let currentClientY: number;
      
      if (e instanceof MouseEvent) {
        currentClientX = e.clientX;
        currentClientY = e.clientY;
      } else {
        currentClientX = e.touches[0].clientX;
        currentClientY = e.touches[0].clientY;
      }
      
      // Calculate the distance moved
      const deltaX = currentClientX - startX;
      const deltaY = currentClientY - startY;
      
      // Calculate new position
      const newX = originalX + deltaX;
      const newY = originalY + deltaY;
      
      // Apply the position
      applyPosition(newX, newY);
      
      // Call drag callback
      if (typeof defaultOptions.onDrag === 'function') {
        defaultOptions.onDrag(e, el, deltaX, deltaY);
      }
    };
    
    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      isDragging = false;
      
      // Remove dragging class
      if (defaultOptions.dragClass) {
        el.classList.remove(defaultOptions.dragClass);
      }
      
      // Call drag end callback
      if (typeof defaultOptions.onDragEnd === 'function') {
        defaultOptions.onDragEnd(e, el);
      }
      
      // Remove document-level event listeners
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
    };
    
    // Add event listeners to handle element
    handleEl.addEventListener('mousedown', handleDragStart);
    handleEl.addEventListener('touchstart', handleDragStart, { passive: false });
    
    // Set cursor style
    handleEl.style.cursor = 'move';
    
    // Return cleanup function
    return () => {
      // Remove event listeners
      handleEl.removeEventListener('mousedown', handleDragStart);
      handleEl.removeEventListener('touchstart', handleDragStart);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
      
      // Remove dragging class if it's still applied
      if (defaultOptions.dragClass) {
        el.classList.remove(defaultOptions.dragClass);
      }
      
      // Reset cursor style
      handleEl.style.cursor = '';
    };
  } catch (error) {
    console.error('Error in enhanceDragDrop:', error);
    return () => {};
  }
} 