import React from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'small' | 'medium' | 'large';
}

export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  const isTouchDevice = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       window.innerWidth <= 768;
  
  const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
  const isMobile = mobileRegex.test(userAgent) || window.innerWidth <= 768 ||
                   (isTouchDevice && window.innerWidth <= 768);
  
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
  const isTablet = tabletRegex.test(userAgent) || 
    (window.innerWidth > 768 && window.innerWidth <= 1024 && isTouchDevice);
  
  const isDesktop = !isMobile && !isTablet;
  
  let screenSize: 'small' | 'medium' | 'large' = 'large';
  if (window.innerWidth <= 480) {
    screenSize = 'small';
  } else if (window.innerWidth <= 1024) {
    screenSize = 'medium';
  }
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenSize
  };
};

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(getDeviceInfo);
  
  React.useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return deviceInfo;
};
