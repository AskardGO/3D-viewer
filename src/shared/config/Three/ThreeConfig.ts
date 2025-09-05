import * as THREE from "three";

export interface RendererConfig {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  preserveDrawingBuffer?: boolean;
  logarithmicDepthBuffer?: boolean;
  physicallyCorrectLights?: boolean;
  shadowMap?: {
    enabled: boolean;
    type: THREE.ShadowMapType;
  };
}

export interface CameraConfig {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  position?: THREE.Vector3Like;
  lookAt?: THREE.Vector3Like;
}

export interface SceneConfig {
  background?: THREE.ColorRepresentation | null;
  fog?: {
    color: THREE.ColorRepresentation;
    near: number;
    far: number;
  } | null;
}

export interface LightingConfig {
  ambient?: {
    color: THREE.ColorRepresentation;
    intensity: number;
  };
  directional?: {
    color: THREE.ColorRepresentation;
    intensity: number;
    position: THREE.Vector3Like;
    castShadow?: boolean;
    shadow?: {
      mapSize: { width: number; height: number };
      camera: {
        near: number;
        far: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
    };
  };
}

interface RequiredLightingConfig {
  ambient: {
    color: THREE.ColorRepresentation;
    intensity: number;
  };
  directional: {
    color: THREE.ColorRepresentation;
    intensity: number;
    position: THREE.Vector3Like;
    castShadow?: boolean;
    shadow?: {
      mapSize: { width: number; height: number };
      camera: {
        near: number;
        far: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
    };
  };
}

export interface ThreeJSConfigOptions {
  renderer?: RendererConfig;
  camera?: CameraConfig;
  scene?: SceneConfig;
  lighting?: LightingConfig;
}

interface FullThreeJSConfig {
  renderer: Required<RendererConfig>;
  camera: Required<CameraConfig>;
  scene: Required<SceneConfig>;
  lighting: RequiredLightingConfig;
}

export const DEFAULT_CONFIG: FullThreeJSConfig = {
  renderer: {
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    logarithmicDepthBuffer: false,
    physicallyCorrectLights: true,
    shadowMap: {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
    },
  },
  camera: {
    fov: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 2, z: 5 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  scene: {
    background: 0x87ceeb,
    fog: {
      color: 0x87ceeb,
      near: 50,
      far: 200,
    },
  },
  lighting: {
    ambient: {
      color: 0x404040,
      intensity: 0.4,
    },
    directional: {
      color: 0xffffff,
      intensity: 1,
      position: { x: 10, y: 10, z: 5 },
      castShadow: true,
      shadow: {
        mapSize: { width: 2048, height: 2048 },
        camera: {
          near: 0.5,
          far: 50,
          left: -10,
          right: 10,
          top: 10,
          bottom: -10,
        },
      },
    },
  },
};

export class ThreeConfig {
  private static instance: ThreeConfig;
  
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly lights: {
    ambient?: THREE.AmbientLight;
    directional?: THREE.DirectionalLight;
  } = {};

  private config: FullThreeJSConfig;

  private constructor(options: ThreeJSConfigOptions = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, options);
    
    this.scene = this.createScene();
    
    this.camera = this.createCamera();
    
    this.renderer = this.createRenderer();
    
    this.setupLighting();
  }

  private mergeConfig(
    defaultConfig: FullThreeJSConfig,
    userConfig: ThreeJSConfigOptions
  ): FullThreeJSConfig {
    return {
      renderer: { ...defaultConfig.renderer, ...userConfig.renderer },
      camera: { ...defaultConfig.camera, ...userConfig.camera },
      scene: { ...defaultConfig.scene, ...userConfig.scene },
      lighting: {
        ambient: { 
          ...defaultConfig.lighting.ambient, 
          ...(userConfig.lighting?.ambient || {})
        },
        directional: { 
          ...defaultConfig.lighting.directional, 
          ...(userConfig.lighting?.directional || {})
        },
      },
    };
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    
    if (this.config.scene.background !== null && this.config.scene.background !== undefined) {
      scene.background = new THREE.Color(this.config.scene.background);
    }
    
    if (this.config.scene.fog) {
      scene.fog = new THREE.Fog(
        this.config.scene.fog.color,
        this.config.scene.fog.near,
        this.config.scene.fog.far
      );
    }
    
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      this.config.camera.fov,
      this.config.camera.aspect,
      this.config.camera.near,
      this.config.camera.far
    );
    
    const pos = this.config.camera.position!;
    camera.position.set(pos.x, pos.y, pos.z);
    
    const lookAt = this.config.camera.lookAt!;
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: this.config.renderer.antialias,
      alpha: this.config.renderer.alpha,
      powerPreference: this.config.renderer.powerPreference,
      preserveDrawingBuffer: this.config.renderer.preserveDrawingBuffer,
      logarithmicDepthBuffer: this.config.renderer.logarithmicDepthBuffer,
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (this.config.renderer.shadowMap?.enabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = this.config.renderer.shadowMap.type;
    }
    
    return renderer;
  }

  private setupLighting(): void {
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 4.0);
    sunLight.position.set(25, 35, 20);
    sunLight.castShadow = true;
    
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.05;
    
    this.scene.add(sunLight);

    const skyLight = new THREE.HemisphereLight(
      0x87ceeb,
      0x8B4513,
      0.6
    );
    this.scene.add(skyLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    const fillLight = new THREE.DirectionalLight(0xb3d9ff, 0.4);
    fillLight.position.set(-15, 10, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -25);
    this.scene.add(rimLight);

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    (this.scene as any).lights = {
      sun: sunLight,
      sky: skyLight,
      ambient: ambientLight,
      fill: fillLight,
      rim: rimLight
    };
  }

  public updateCameraAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public updateRendererSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.updateCameraAspect(width / height);
  }

  public getConfig(): Readonly<FullThreeJSConfig> {
    return this.config;
  }

  public static getInstance(options?: ThreeJSConfigOptions): ThreeConfig {
    if (!ThreeConfig.instance) {
      ThreeConfig.instance = new ThreeConfig(options);
    }
    return ThreeConfig.instance;
  }

  public static recreateInstance(options: ThreeJSConfigOptions): ThreeConfig {
    if (ThreeConfig.instance) {
      ThreeConfig.instance.dispose();
    }
    ThreeConfig.instance = new ThreeConfig(options);
    return ThreeConfig.instance;
  }

  public static dispose(): void {
    if (ThreeConfig.instance) {
      ThreeConfig.instance.dispose();
      ThreeConfig.instance = null as any;
    }
  }

  public dispose(): void {
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    this.renderer.dispose();
    
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      
      if ('dispose' in child && typeof child.dispose === 'function') {
        child.dispose();
      }
    }
  }
}
