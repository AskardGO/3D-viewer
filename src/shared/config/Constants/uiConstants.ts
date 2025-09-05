export const UI_CONSTANTS = {
  ANIMATION: {
    DURATION: {
      SHORT: 200,
      MEDIUM: 300,
      LONG: 500
    },
    EASING: 'ease-in-out'
  },
  
  LOADING: {
    DEBOUNCE_DELAY: 100,
    PROGRESS_UPDATE_INTERVAL: 16
  },
  
  FILE_VALIDATION: {
    MAX_NAME_LENGTH: 255,
    CHUNK_SIZE: 1024 * 1024
  },
  
  MEASUREMENTS: {
    BORDER_RADIUS: 8,
    PADDING: {
      SMALL: 8,
      MEDIUM: 16,
      LARGE: 24
    },
    MARGIN: {
      SMALL: 4,
      MEDIUM: 8,
      LARGE: 16
    }
  },
  
  DATABASE: {
    VERSION: 1,
    STORES: {
      MODELS: 'models',
      HISTORY: 'modelHistory',
      SETTINGS: 'settings'
    }
  }
} as const;
