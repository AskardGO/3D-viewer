export const SCENE_CONSTANTS = {
  TEST_CUBE: {
    SIZE: 0.5,
    COLOR: 0x4f46e5,
    METALNESS: 0.3,
    ROUGHNESS: 0.4,
    OPACITY: 0.7,
    POSITION: { x: 0, y: -1.75, z: 0 }
  },
  
  GROUND_PLANE: {
    SIZE: 10,
    COLOR: 0x404040,
    POSITION_Y: -2,
    ROTATION_X: -Math.PI / 2
  },
  
  LIGHTING: {
    AMBIENT: {
      COLOR: 0x404040,
      INTENSITY: 0.4
    },
    DIRECTIONAL: {
      COLOR: 0xffffff,
      INTENSITY: 1,
      POSITION: { x: 10, y: 10, z: 5 },
      SHADOW_MAP_SIZE: 2048,
      SHADOW_CAMERA_SIZE: 10
    }
  },
  
  RENDERER: {
    ANTIALIAS: true,
    ALPHA: true,
    POWER_PREFERENCE: 'high-performance' as const,
    SHADOW_TYPE: 'PCFSoftShadowMap' as const
  }
} as const;
