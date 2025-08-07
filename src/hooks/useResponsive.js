// ============================================
// 📱 RESPONSIVE HOOK - CORREGIDO Y FUNCIONAL
// ============================================

import { useState, useEffect } from 'react';

// ✅ Breakpoints actualizados
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
};

/**
 * Hook principal para detectar y manejar cambios de dispositivo
 * @returns {Object} Información sobre el dispositivo actual
 */
export const useResponsive = () => {
  const [screenInfo, setScreenInfo] = useState(() => {
    // ✅ Inicialización segura
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        height: 800,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape'
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isDesktop: width >= BREAKPOINTS.desktop,
      orientation: width > height ? 'landscape' : 'portrait'
    };
  });

  useEffect(() => {
    // ✅ Verificar que estamos en el browser
    if (typeof window === 'undefined') return;

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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < BREAKPOINTS.mobile;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
  const [orientation, setOrientation] = useState(() => {
    if (typeof window === 'undefined') return 'landscape';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
    if (typeof window === 'undefined') return;

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

// Exportar por defecto el hook principal
export default useResponsive;