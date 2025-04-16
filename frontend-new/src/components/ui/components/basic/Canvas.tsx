import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

export interface DrawingContext {
  beginPath: () => void;
  closePath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => void;
  ellipse: (x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => void;
  stroke: () => void;
  fill: () => void;
  strokeRect: (x: number, y: number, width: number, height: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  clearRect: (x: number, y: number, width: number, height: number) => void;
  strokeText: (text: string, x: number, y: number, maxWidth?: number) => void;
  fillText: (text: string, x: number, y: number, maxWidth?: number) => void;
  drawImage: (image: CanvasImageSource, dx: number, dy: number) => void;
  drawImageWithSize: (image: CanvasImageSource, dx: number, dy: number, dWidth: number, dHeight: number) => void;
  drawImageWithSourceAndSize: (image: CanvasImageSource, sx: number, sy: number, sWidth: number, sHeight: number, dx: number, dy: number, dWidth: number, dHeight: number) => void;
  setStrokeStyle: (style: string | CanvasGradient | CanvasPattern) => void;
  setFillStyle: (style: string | CanvasGradient | CanvasPattern) => void;
  setLineWidth: (width: number) => void;
  setFont: (font: string) => void;
  setGlobalAlpha: (alpha: number) => void;
  setLineDash: (segments: number[]) => void;
  getImageData: (sx: number, sy: number, sw: number, sh: number) => ImageData;
  putImageData: (imageData: ImageData, dx: number, dy: number) => void;
  save: () => void;
  restore: () => void;
  translate: (x: number, y: number) => void;
  rotate: (angle: number) => void;
  scale: (x: number, y: number) => void;
  clear: () => void;
  getRawContext: () => CanvasRenderingContext2D | null;
}

export interface CanvasProps {
  id?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  onResize?: (width: number, height: number) => void;
  overlayFor?: string; // ID of element this canvas is an overlay for
  transparent?: boolean;
  renderOnResize?: boolean;
  renderFunction?: (context: DrawingContext, canvas: HTMLCanvasElement) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
}

export interface CanvasRef {
  canvas: HTMLCanvasElement | null;
  context: DrawingContext | null;
  clear: () => void;
  redraw: () => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({
  id,
  className = '',
  width = '100%',
  height = '100%',
  style = {},
  onResize,
  overlayFor,
  transparent = false,
  renderOnResize = true,
  renderFunction,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  ...rest
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);
  const [overlayElement, setOverlayElement] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Create a DrawingContext that wraps the CanvasRenderingContext2D
  const createDrawingContext = (ctx: CanvasRenderingContext2D | null): DrawingContext | null => {
    if (!ctx) return null;
    
    return {
      beginPath: () => ctx.beginPath(),
      closePath: () => ctx.closePath(),
      moveTo: (x, y) => ctx.moveTo(x, y),
      lineTo: (x, y) => ctx.lineTo(x, y),
      rect: (x, y, width, height) => ctx.rect(x, y, width, height),
      arc: (x, y, radius, startAngle, endAngle, counterclockwise) => 
        ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise),
      ellipse: (x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) => 
        ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise),
      stroke: () => ctx.stroke(),
      fill: () => ctx.fill(),
      strokeRect: (x, y, width, height) => ctx.strokeRect(x, y, width, height),
      fillRect: (x, y, width, height) => ctx.fillRect(x, y, width, height),
      clearRect: (x, y, width, height) => ctx.clearRect(x, y, width, height),
      strokeText: (text, x, y, maxWidth) => ctx.strokeText(text, x, y, maxWidth || Infinity),
      fillText: (text, x, y, maxWidth) => ctx.fillText(text, x, y, maxWidth || Infinity),
      drawImage: (image, dx, dy) => ctx.drawImage(image, dx, dy),
      drawImageWithSize: (image, dx, dy, dWidth, dHeight) => 
        ctx.drawImage(image, dx, dy, dWidth, dHeight),
      drawImageWithSourceAndSize: (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) => 
        ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight),
      setStrokeStyle: (style) => { ctx.strokeStyle = style; },
      setFillStyle: (style) => { ctx.fillStyle = style; },
      setLineWidth: (width) => { ctx.lineWidth = width; },
      setFont: (font) => { ctx.font = font; },
      setGlobalAlpha: (alpha) => { ctx.globalAlpha = alpha; },
      setLineDash: (segments) => ctx.setLineDash(segments),
      getImageData: (sx, sy, sw, sh) => ctx.getImageData(sx, sy, sw, sh),
      putImageData: (imageData, dx, dy) => ctx.putImageData(imageData, dx, dy),
      save: () => ctx.save(),
      restore: () => ctx.restore(),
      translate: (x, y) => ctx.translate(x, y),
      rotate: (angle) => ctx.rotate(angle),
      scale: (x, y) => ctx.scale(x, y),
      clear: () => {
        if (canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      },
      getRawContext: () => ctx,
    };
  };

  // Initialize the canvas context
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d', { 
        alpha: transparent,
        willReadFrequently: true
      });
      setCanvasContext(ctx);
    }
    setMounted(true);
  }, [transparent]);
  
  // Find the element this canvas is an overlay for
  useEffect(() => {
    if (overlayFor) {
      const element = document.getElementById(overlayFor);
      setOverlayElement(element);
    }
  }, [overlayFor, mounted]);
  
  // Resize the canvas when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      if (!canvas) return;
      
      // If this is an overlay, match dimensions to the target element
      if (overlayElement) {
        const rect = overlayElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      } else {
        // Otherwise, set to explicit dimensions or parent container size
        if (typeof width === 'number') {
          canvas.width = width;
        } else if (canvas.parentElement) {
          canvas.width = canvas.parentElement.clientWidth;
        }
        
        if (typeof height === 'number') {
          canvas.height = height;
        } else if (canvas.parentElement) {
          canvas.height = canvas.parentElement.clientHeight;
        }
      }
      
      // Notify of resize
      if (onResize) {
        onResize(canvas.width, canvas.height);
      }
      
      // Redraw if needed
      if (renderOnResize && renderFunction) {
        const drawingContext = createDrawingContext(canvasContext);
        if (drawingContext) {
          renderFunction(drawingContext, canvas);
        }
      }
    };
    
    // Initial resize
    resizeCanvas();
    
    // Set up resize observer
    if (overlayElement || typeof width === 'string' || typeof height === 'string') {
      const resizeObserver = new ResizeObserver(resizeCanvas);
      
      if (overlayElement) {
        resizeObserver.observe(overlayElement);
      }
      
      if (canvas.parentElement && (typeof width === 'string' || typeof height === 'string')) {
        resizeObserver.observe(canvas.parentElement);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [width, height, overlayElement, canvasContext, onResize, renderOnResize, renderFunction]);
  
  // Run render function when it changes
  useEffect(() => {
    if (renderFunction && canvasContext && canvasRef.current) {
      const drawingContext = createDrawingContext(canvasContext);
      if (drawingContext) {
        renderFunction(drawingContext, canvasRef.current);
      }
    }
  }, [renderFunction, canvasContext]);
  
  // Expose canvas methods via ref
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    context: createDrawingContext(canvasContext),
    clear: () => {
      if (canvasRef.current && canvasContext) {
        canvasContext.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
    redraw: () => {
      if (renderFunction && canvasContext && canvasRef.current) {
        const drawingContext = createDrawingContext(canvasContext);
        if (drawingContext) {
          renderFunction(drawingContext, canvasRef.current);
        }
      }
    }
  }));
  
  const overlayStyles: React.CSSProperties = overlayFor ? {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    ...style
  } : style;
  
  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{
        display: 'block',
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...overlayStyles
      }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      {...rest}
    />
  );
});

Canvas.displayName = 'Canvas';

export default Canvas; 