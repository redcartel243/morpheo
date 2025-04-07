// Global type definitions for Morpheo

interface MorpheoAPI {
  renderApp: (config: any, target: string) => void;
  DynamicComponent: any;
  ProcessAppConfig: any;
}

interface MorpheoUtils {
  element: () => Element | null;
  getElement: () => Element | null;
  value: (newValue?: any) => any;
  text: (newText?: string) => string | null;
  getProperty: (propName: string) => any;
  getValue: () => string;
  setValue: (value: any) => any;
  setStyle: (styleName: string, value: string) => string | null;
  addClass: (className: string) => boolean | null;
  removeClass: (className: string) => boolean | null;
  animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => Animation | null;
  show: () => boolean | null;
  hide: () => boolean | null;
  emit: (eventName: string, detail?: any) => boolean | null;
  setProperty: (propName: string, value: any) => any;
}

declare global {
  interface Window {
    appState?: any;
    textInputTimeouts?: Record<string, NodeJS.Timeout>;
    $morpheo?: Record<string, any> & MorpheoAPI;
    $m?: ((selector: string) => MorpheoUtils) & ((selector: string) => any);
  }
}

export {}; 