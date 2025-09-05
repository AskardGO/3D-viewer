import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeConfig, type ThreeJSConfigOptions } from '../../../shared/config/Three';
import { SCENE_CONSTANTS, TOUCH_CONSTANTS, CAMERA_CONSTANTS, MODEL_CONSTANTS } from '../../../shared/config/Constants';

export interface SceneServiceOptions {
  config?: ThreeJSConfigOptions;
  mountElement: HTMLDivElement;
}

export class SceneService {
  private threeConfig: ThreeConfig | null = null;
  private controls: OrbitControls | null = null;
  private animationId: number | null = null;
  private mountElement: HTMLDivElement;
  private loadedModel: THREE.Object3D | null = null;
  private isMouseDown = false;
  private previousMousePosition = { x: 0, y: 0 };
  private modelRotation = { x: 0, y: 0 };
  
  private touchState = {
    rotationSpeed: TOUCH_CONSTANTS.ROTATION_SPEED,
    zoomSpeed: TOUCH_CONSTANTS.ZOOM_SPEED
  };

  constructor(options: SceneServiceOptions) {
    this.mountElement = options.mountElement;
    try {
      this.initialize(options.config);
    } catch (error) {
      console.error('Failed to initialize SceneService:', error);
      throw error;
    }
  }

  private initialize = (config?: ThreeJSConfigOptions): void => {
    // Force recreation to pick up updated constants
    ThreeConfig.dispose();
    this.threeConfig = ThreeConfig.recreateInstance(config || {});
    const { renderer, camera, scene } = this.threeConfig;

    const { clientWidth, clientHeight } = this.mountElement;
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();

    this.mountElement.appendChild(renderer.domElement);

    this.setupDefaultScene();
    this.setupMouseControls();
    this.startAnimation();
    this.setupResizeHandler();
  };

  private setupDefaultScene = (): void => {
    if (!this.threeConfig) return;

    const { scene } = this.threeConfig;

    const testGeometry = new THREE.BoxGeometry(
      SCENE_CONSTANTS.TEST_CUBE.SIZE,
      SCENE_CONSTANTS.TEST_CUBE.SIZE,
      SCENE_CONSTANTS.TEST_CUBE.SIZE
    );
    const testMaterial = new THREE.MeshStandardMaterial({ 
      color: SCENE_CONSTANTS.TEST_CUBE.COLOR,
      metalness: SCENE_CONSTANTS.TEST_CUBE.METALNESS,
      roughness: SCENE_CONSTANTS.TEST_CUBE.ROUGHNESS,
      transparent: true,
      opacity: SCENE_CONSTANTS.TEST_CUBE.OPACITY
    });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.name = 'testCube';
    testCube.position.set(0, 0, 0);
    testCube.castShadow = true;
    testCube.receiveShadow = true;
    scene.add(testCube);
  };

  private setupMouseControls = (): void => {
    if (!this.threeConfig) return;

    const canvas = this.threeConfig.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel);
  };

  private startAnimation = (): void => {
    const animate = () => {
      if (!this.threeConfig) return;

      const { renderer, scene, camera, lights } = this.threeConfig;
      
      // Обновляем позицию spotlight чтобы он следовал за камерой
      if (lights.spotlight) {
        lights.spotlight.position.copy(camera.position);
        lights.spotlight.target.position.set(0, 0, 0);
      }
      
      renderer.render(scene, camera);
      
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  };

  private setupResizeHandler = (): void => {
    const handleResize = () => {
      if (!this.threeConfig) return;

      const { clientWidth, clientHeight } = this.mountElement;
      this.threeConfig.updateRendererSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
  };

  handleResize = (): void => {
    if (!this.threeConfig) return;

    const { clientWidth, clientHeight } = this.mountElement;
    this.threeConfig.updateRendererSize(clientWidth, clientHeight);
  };

  addModel = (model: THREE.Object3D): void => {
    if (!this.threeConfig) return;

    const { scene } = this.threeConfig;

    const existingModel = scene.getObjectByName('loadedModel');
    if (existingModel) {
      scene.remove(existingModel);
    }

    const testCube = scene.getObjectByName('testCube');
    if (testCube) {
      testCube.visible = false;
    }

    model.name = 'loadedModel';
    
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (maxDimension > MODEL_CONSTANTS.BOUNDING_BOX.MIN_DIMENSION_THRESHOLD) {
      const scale = MODEL_CONSTANTS.DEFAULT_SCALE_SIZE / maxDimension;
      model.scale.setScalar(scale);
      
      const scaledBox = new THREE.Box3().setFromObject(model);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      
      model.position.set(
        -scaledCenter.x,
        -scaledCenter.y,
        -scaledCenter.z
      );
    }

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => this.createStandardMaterial(mat));
          } else {
            child.material = this.createStandardMaterial(child.material);
          }
        }
      }
    });

    this.loadedModel = model;
    this.modelRotation = { x: 0, y: 0 };

    scene.add(model);
    this.focusOnModel(model);
  };

  private focusOnModel = (model: THREE.Object3D): void => {
    if (!this.threeConfig) return;

    const { camera } = this.threeConfig;
    
    const finalBox = new THREE.Box3().setFromObject(model);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    
    const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * CAMERA_CONSTANTS.DISTANCE_MULTIPLIER;
    
    const cameraPosition = new THREE.Vector3(
      finalCenter.x + cameraDistance * CAMERA_CONSTANTS.POSITION_OFFSET.X_FACTOR,
      finalCenter.y + cameraDistance * CAMERA_CONSTANTS.POSITION_OFFSET.Y_FACTOR,
      finalCenter.z + cameraDistance * CAMERA_CONSTANTS.POSITION_OFFSET.Z_FACTOR
    );
    
    camera.position.copy(cameraPosition);
    camera.lookAt(finalCenter);
  };

  private createStandardMaterial = (originalMaterial: THREE.Material): THREE.MeshStandardMaterial => {
    const standardMaterial = new THREE.MeshStandardMaterial({
      color: (originalMaterial as any).color || MODEL_CONSTANTS.DEFAULT_MATERIAL.COLOR,
      map: (originalMaterial as any).map || null,
      normalMap: (originalMaterial as any).normalMap || null,
      roughnessMap: (originalMaterial as any).roughnessMap || null,
      metalnessMap: (originalMaterial as any).metalnessMap || null,
      transparent: originalMaterial.transparent,
      opacity: originalMaterial.opacity,
      side: originalMaterial.side,
      metalness: MODEL_CONSTANTS.DEFAULT_MATERIAL.METALNESS,
      roughness: MODEL_CONSTANTS.DEFAULT_MATERIAL.ROUGHNESS,
      envMapIntensity: MODEL_CONSTANTS.DEFAULT_MATERIAL.ENV_MAP_INTENSITY
    });
    
    
    return standardMaterial;
  };

  dispose = (): void => {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.setupResizeHandler);
    
    if (this.threeConfig) {
      const canvas = this.threeConfig.renderer.domElement;
      canvas.removeEventListener('mousedown', this.onMouseDown);
      canvas.removeEventListener('mousemove', this.onMouseMove);
      canvas.removeEventListener('mouseup', this.onMouseUp);
      canvas.removeEventListener('mouseleave', this.onMouseUp);
      canvas.removeEventListener('wheel', this.onWheel);
    }
    
    this.controls?.dispose();
    
    if (this.threeConfig && this.mountElement.contains(this.threeConfig.renderer.domElement)) {
      this.mountElement.removeChild(this.threeConfig.renderer.domElement);
    }
    
    ThreeConfig.dispose();
    this.threeConfig = null;
    this.loadedModel = null;
  };

  private onMouseDown = (event: MouseEvent) => {
    this.isMouseDown = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isMouseDown || !this.loadedModel) return;

    const deltaMove = {
      x: event.clientX - this.previousMousePosition.x,
      y: event.clientY - this.previousMousePosition.y
    };

    const rotationSpeed = 0.005;
    this.modelRotation.y += deltaMove.x * rotationSpeed;
    this.modelRotation.x += deltaMove.y * rotationSpeed;

    this.loadedModel.rotation.y = this.modelRotation.y;
    this.loadedModel.rotation.x = this.modelRotation.x;

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.threeConfig) return;
    
    const { camera } = this.threeConfig;
    const zoomSpeed = 0.1;
    const direction = event.deltaY > 0 ? 1 : -1;
    
    camera.position.multiplyScalar(1 + direction * zoomSpeed);
    camera.position.clampLength(2, 50);
  };

  public rotateCameraSingleFinger = (deltaX: number, deltaY: number): void => {
    if (!this.threeConfig) return;
    
    const { camera } = this.threeConfig;
    
    const spherical = new THREE.Spherical();
    const offset = new THREE.Vector3();
    
    offset.copy(camera.position);
    spherical.setFromVector3(offset);
    
    spherical.theta -= deltaX * this.touchState.rotationSpeed;
    spherical.phi += deltaY * this.touchState.rotationSpeed;
    
    spherical.phi = Math.max(CAMERA_CONSTANTS.MIN_POLAR_ANGLE, Math.min(CAMERA_CONSTANTS.MAX_POLAR_ANGLE, spherical.phi));
    
    offset.setFromSpherical(spherical);
    camera.position.copy(offset);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  };

  public zoomCamera = (zoomDelta: number): void => {
    if (!this.threeConfig) return;
    
    const { camera } = this.threeConfig;
    
    const direction = camera.position.clone().normalize();
    const zoomAmount = zoomDelta * TOUCH_CONSTANTS.ZOOM_SENSITIVITY_MULTIPLIER;
    
    camera.position.add(direction.multiplyScalar(-zoomAmount));
    
    const distance = camera.position.length();
    const minDistance = CAMERA_CONSTANTS.MIN_DISTANCE;
    const maxDistance = CAMERA_CONSTANTS.MAX_DISTANCE;
    
    if (distance < minDistance) {
      camera.position.normalize().multiplyScalar(minDistance);
    } else if (distance > maxDistance) {
      camera.position.normalize().multiplyScalar(maxDistance);
    }
  };

  public rotateCameraTwoFinger = (angleDelta: number): void => {
    if (!this.threeConfig) return;
    
    const { camera } = this.threeConfig;
    
    camera.rotateZ(-angleDelta * TOUCH_CONSTANTS.TWO_FINGER_ROTATION_MULTIPLIER);
  };
}

export const createSceneService = (options: SceneServiceOptions): SceneService => {
  return new SceneService(options);
};
