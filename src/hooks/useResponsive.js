// ============================================
// 📱 RESPONSIVE HOOK
// ============================================

import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '../utils/constants';

/**
 * Hook para detectar y manejar cambios de dispositivo
 * @returns {Object} Información sobre el dispositivo actual
 */
export const useResponsive = () => {
  const [screenInfo, setScreenInfo] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.mobile : false,
    isTablet: typeof window !== 'undefined' ? 
      window.innerWidth >= BREAKPOINTS.mobile && window.innerWidth < BREAKPOINTS.tablet : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.desktop : true,
    orientation: typeof window !== 'undefined' ? 
      (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait') : 'landscape'
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenInfo({
        width,
        height,
        isMobile: width < BREAKPOINTS.mobile,
        isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
        isDesktop: width >= BREAKPOINTS.desktop,
        orientation: width > height ? 'landscape' : 'portrait'
      });
    };

    // Agregar listener
    window.addEventListener('resize', handleResize);
    
    // Llamar inmediatamente para obtener valores iniciales
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenInfo;
};

/**
 * Hook simplificado que solo devuelve si es móvil
 * @returns {boolean} True si es dispositivo móvil
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.mobile : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < BREAKPOINTS.mobile);
    
    window.addEventListener('resize', checkMobile);
    checkMobile(); // Verificar inmediatamente
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

/**
 * Hook para detectar cambios de orientación
 * @returns {string} 'portrait' | 'landscape'
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState(
    typeof window !== 'undefined' ? 
    (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait') : 'landscape'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      setOrientation(newOrientation);
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

/**
 * Hook para obtener breakpoint actual
 * @returns {string} 'mobile' | 'tablet' | 'desktop'
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let newBreakpoint = 'desktop';
      
      if (width < BREAKPOINTS.mobile) {
        newBreakpoint = 'mobile';
      } else if (width < BREAKPOINTS.tablet) {
        newBreakpoint = 'tablet';
      }
      
      setBreakpoint(newBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

/**
 * Hook para detectar si el dispositivo soporta touch
 * @returns {boolean} True si soporta touch
 */
export const useTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    // Verificar al montar el componente
    checkTouch();
  }, []);

  return isTouch;
};

/**
 * Hook para obtener información completa del viewport
 * @returns {Object} Información detallada del viewport
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        height: 800,
        availableHeight: 800,
        scrollY: 0,
        devicePixelRatio: 1
      };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      availableHeight: window.innerHeight - (window.outerHeight - window.innerHeight),
      scrollY: window.scrollY,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        availableHeight: window.innerHeight - (window.outerHeight - window.innerHeight),
        scrollY: window.scrollY,
        devicePixelRatio: window.devicePixelRatio || 1
      });
    };

    const handleScroll = () => {
      setViewport(prev => ({
        ...prev,
        scrollY: window.scrollY
      }));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return viewport;
};

/**
 * Hook para detectar si el usuario prefiere modo oscuro
 * @returns {boolean} True si prefiere modo oscuro
 */
export const usePrefersDarkMode = () => {
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
};

/**
 * Hook para detectar si hay conectividad a internet
 * @returns {boolean} True si hay conexión
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Hook para detectar la velocidad de conexión (experimental)
 * @returns {Object} Información de conexión
 */
export const useConnectionSpeed = () => {
  const [connection, setConnection] = useState(() => {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false
      };
    }

    const conn = navigator.connection;
    return {
      effectiveType: conn.effectiveType || '4g',
      downlink: conn.downlink || 10,
      rtt: conn.rtt || 100,
      saveData: conn.saveData || false
    };
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.connection) return;

    const handleConnectionChange = () => {
      const conn = navigator.connection;
      setConnection({
        effectiveType: conn.effectiveType || '4g',
        downlink: conn.downlink || 10,
        rtt: conn.rtt || 100,
        saveData: conn.saveData || false
      });
    };

    navigator.connection.addEventListener('change', handleConnectionChange);
    
    return () => {
      navigator.connection.removeEventListener('change', handleConnectionChange);
    };
  }, []);

  return connection;
};

/**
 * Hook para manejar el redimensionamiento con debounce
 * @param {number} delay - Delay en ms para el debounce
 * @returns {Object} Dimensiones debounced
 */
export const useDebouncedResize = (delay = 250) => {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));

  useEffect(() => {
    let timeoutId;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, delay);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [delay]);

  return dimensions;
};

/**
 * Utilidades para responsive design
 */
export const responsive = {
  /**
   * Verifica si es móvil
   * @param {number} width - Ancho actual
   * @returns {boolean}
   */
  isMobile: (width) => width < BREAKPOINTS.mobile,

  /**
   * Verifica si es tablet
   * @param {number} width - Ancho actual
   * @returns {boolean}
   */
  isTablet: (width) => width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,

  /**
   * Verifica si es desktop
   * @param {number} width - Ancho actual
   * @returns {boolean}
   */
  isDesktop: (width) => width >= BREAKPOINTS.tablet,

  /**
   * Obtiene el breakpoint actual
   * @param {number} width - Ancho actual
   * @returns {string}
   */
  getBreakpoint: (width) => {
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  },

  /**
   * Aplica estilos responsivos
   * @param {Object} styles - Estilos por breakpoint
   * @param {number} width - Ancho actual
   * @returns {Object}
   */
  applyStyles: (styles, width) => {
    const breakpoint = responsive.getBreakpoint(width);
    return {
      ...styles.base,
      ...styles[breakpoint]
    };
  }
};