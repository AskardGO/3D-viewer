import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeConfig, type ThreeJSConfigOptions } from '../../../shared/config/Three';

export interface SceneManagerOptions {
  config?: ThreeJSConfigOptions;
  container: HTMLElement;
}

export class SceneManagerService {
  private threeConfig: ThreeConfig;
  private controls!: OrbitControls;
  private animationId: number | null = null;
  private container: HTMLElement;

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.threeConfig = ThreeConfig.getInstance(options.config);
    
    this.setupRenderer();
    this.setupControls();
    this.setupDefaultScene();
    this.startAnimation();
  }

  private setupRenderer = (): void => {
    const { renderer } = this.threeConfig;
    const { clientWidth, clientHeight } = this.container;
    
    renderer.setSize(clientWidth, clientHeight);
    this.container.appendChild(renderer.domElement);
    
    this.updateCameraAspect(clientWidth, clientHeight);
  };

  private setupControls = (): void => {
    const { camera, renderer } = this.threeConfig;
    
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    this.setupMobileControls();
  };

  private setupMobileControls = (): void => {
    const isTouchDevice = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0 || 
                         window.innerWidth <= 768;
    
    if (isTouchDevice) {
      this.controls.enableRotate = true;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      
      this.controls.rotateSpeed = 1.0;
      this.controls.zoomSpeed = 1.2;
      this.controls.panSpeed = 0.8;
      
      this.controls.minDistance = 2;
      this.controls.maxDistance = 20;
      this.controls.maxPolarAngle = Math.PI * 0.9;
      this.controls.minPolarAngle = Math.PI * 0.1;
      
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.1;
      
      this.controls.domElement?.addEventListener('touchstart', (e) => {
        e.preventDefault();
      }, { passive: false });
      
      this.controls.domElement?.addEventListener('touchmove', (e) => {
        e.preventDefault();
      }, { passive: false });
    }
  };

  private setupDefaultScene = (): void => {
    const { scene } = this.threeConfig;

    const testGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const testMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4f46e5,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.7
    });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.name = 'testCube';
    testCube.position.set(0, -1.75, 0);
    testCube.castShadow = true;
    testCube.receiveShadow = true;
    scene.add(testCube);

    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x404040 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    plane.name = 'groundPlane';
    scene.add(plane);
  };

  private startAnimation = (): void => {
    const animate = () => {
      const { renderer, scene, camera } = this.threeConfig;
      
      this.controls.update();
      renderer.render(scene, camera);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  };

  addModel = (model: THREE.Object3D): void => {
    const { scene, camera } = this.threeConfig;

    const existingModel = scene.getObjectByName('loadedModel');
    if (existingModel) {
      scene.remove(existingModel);
    }

    const testCube = scene.getObjectByName('testCube');
    if (testCube) {
      testCube.visible = false;
    }

    model.name = 'loadedModel';
    this.setupModelTransform(model);
    this.enableShadows(model);
    scene.add(model);
    
    this.setupCameraForModel(model);
  };

  private setupModelTransform = (model: THREE.Object3D): void => {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (maxDimension > 0) {
      const scale = 3 / maxDimension;
      model.scale.setScalar(scale);
      
      const scaledBox = new THREE.Box3().setFromObject(model);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      
      model.position.set(
        -scaledCenter.x,
        -2 + scaledSize.y / 2 - scaledCenter.y,
        -scaledCenter.z
      );
    }
  };

  private enableShadows = (model: THREE.Object3D): void => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  };

  private setupCameraForModel = (model: THREE.Object3D): void => {
    const { camera } = this.threeConfig;
    
    const finalBox = new THREE.Box3().setFromObject(model);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    
    this.controls.target.copy(finalCenter);
    
    const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
    
    const cameraPosition = new THREE.Vector3(
      finalCenter.x + cameraDistance * 0.7,
      finalCenter.y + cameraDistance * 0.5,
      finalCenter.z + cameraDistance * 0.7
    );
    
    camera.position.copy(cameraPosition);
    camera.lookAt(finalCenter);
    this.controls.update();
  };

  updateCameraAspect = (width: number, height: number): void => {
    this.threeConfig.updateRendererSize(width, height);
  };

  handleResize = (): void => {
    const { clientWidth, clientHeight } = this.container;
    this.updateCameraAspect(clientWidth, clientHeight);
  };

  dispose = (): void => {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.controls?.dispose();
    
    if (this.container && this.threeConfig.renderer.domElement) {
      this.container.removeChild(this.threeConfig.renderer.domElement);
    }
    
    this.threeConfig?.dispose();
  };
}

export const createSceneManager = (options: SceneManagerOptions): SceneManagerService => {
  return new SceneManagerService(options);
};
