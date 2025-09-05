import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeConfig, type ThreeJSConfigOptions } from '../../../shared/config/Three';
import { SCENE_CONSTANTS, TOUCH_CONSTANTS, CAMERA_CONSTANTS, MODEL_CONSTANTS } from '../../../shared/config/Constants';

export interface SceneManagerOptions {
  config?: ThreeJSConfigOptions;
  container: HTMLElement;
}

export class SceneManagerService {
  private threeConfig: ThreeConfig;
  private controls!: OrbitControls;
  private animationId: number | null = null;
  private container: HTMLElement;
  
  private touchState = {
    isRotating: false,
    isZooming: false,
    lastTouchPositions: [] as Array<{ x: number; y: number }>,
    lastDistance: TOUCH_CONSTANTS.INITIAL_DISTANCE,
    lastCenter: { x: 0, y: 0 },
    rotationSpeed: TOUCH_CONSTANTS.ROTATION_SPEED,
    zoomSpeed: TOUCH_CONSTANTS.ZOOM_SPEED
  };

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.threeConfig = ThreeConfig.getInstance(options.config);
    
    this.setupRenderer();
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

  public initializeControls = (canvas: HTMLCanvasElement): void => {
    this.controls = new OrbitControls(this.threeConfig.camera, canvas);
    
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isMobile) {
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      
      this.controls.enableRotate = true;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      
      this.setupMobileControls();
    } else {
      this.controls.enabled = false;
    }
    
    this.setupCustomTouchControls(canvas);
  };

  private setupMobileControls = (): void => {
    this.controls.rotateSpeed = CAMERA_CONSTANTS.ORBIT_CONTROLS.ROTATE_SPEED;
    this.controls.zoomSpeed = CAMERA_CONSTANTS.ORBIT_CONTROLS.ZOOM_SPEED;
    this.controls.panSpeed = CAMERA_CONSTANTS.ORBIT_CONTROLS.PAN_SPEED;
    
    this.controls.minDistance = CAMERA_CONSTANTS.MIN_DISTANCE;
    this.controls.maxDistance = CAMERA_CONSTANTS.MAX_DISTANCE;
    this.controls.maxPolarAngle = Math.PI * CAMERA_CONSTANTS.ORBIT_CONTROLS.MAX_POLAR_ANGLE_FACTOR;
    this.controls.minPolarAngle = Math.PI * CAMERA_CONSTANTS.ORBIT_CONTROLS.MIN_POLAR_ANGLE_FACTOR;
    
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA_CONSTANTS.ORBIT_CONTROLS.MOBILE_DAMPING_FACTOR;
    
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
  };

  private setupCustomTouchControls = (canvas: HTMLCanvasElement): void => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    canvas.style.touchAction = 'none';
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  };

  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    
    const touches = Array.from(event.touches);
    
    this.touchState.lastTouchPositions = touches.map(touch => ({
      x: touch.clientX,
      y: touch.clientY
    }));

    if (touches.length === 1) {
      this.touchState.isRotating = true;
    } else if (touches.length === 2) {
      this.touchState.isZooming = true;
      this.touchState.lastDistance = this.getTouchDistance(touches[0], touches[1]);
      this.touchState.lastCenter = this.getTouchCenter(touches[0], touches[1]);
    }
  };

  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    
    const touches = Array.from(event.touches);
    
    if (touches.length === 1 && this.touchState.isRotating) {
      this.handleSingleFingerRotation(touches[0]);
    } else if (touches.length === 2) {
      this.handleTwoFingerGestures(touches[0], touches[1]);
    }
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
    
    
    this.touchState.isRotating = false;
    this.touchState.isZooming = false;
    this.touchState.lastTouchPositions = [];
  };

  private handleSingleFingerRotation = (touch: Touch): void => {
    const lastTouch = this.touchState.lastTouchPositions[0];
    if (!lastTouch) return;

    const deltaX = touch.clientX - lastTouch.x;
    const deltaY = touch.clientY - lastTouch.y;


    const camera = this.threeConfig.camera;
    const target = this.controls.target;
    
    const offset = new THREE.Vector3().subVectors(camera.position, target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    
    spherical.theta -= deltaX * this.touchState.rotationSpeed;
    spherical.phi += deltaY * this.touchState.rotationSpeed;
    
    spherical.phi = Math.max(CAMERA_CONSTANTS.MIN_POLAR_ANGLE, Math.min(CAMERA_CONSTANTS.MAX_POLAR_ANGLE, spherical.phi));
    
    offset.setFromSpherical(spherical);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    
    this.touchState.lastTouchPositions[0] = { x: touch.clientX, y: touch.clientY };
  };

  private handleTwoFingerGestures = (touch1: Touch, touch2: Touch): void => {
    const currentDistance = this.getTouchDistance(touch1, touch2);
    const currentCenter = this.getTouchCenter(touch1, touch2);


    if (this.touchState.isZooming && this.touchState.lastDistance > 0) {
      const zoomDelta = (currentDistance - this.touchState.lastDistance) * this.touchState.zoomSpeed;
      this.handlePinchZoom(zoomDelta, currentCenter);
    }

    if (this.touchState.lastTouchPositions.length === 2) {
      this.handleTwoFingerRotation(touch1, touch2);
    }

    this.touchState.lastDistance = currentDistance;
    this.touchState.lastCenter = currentCenter;
    this.touchState.lastTouchPositions = [
      { x: touch1.clientX, y: touch1.clientY },
      { x: touch2.clientX, y: touch2.clientY }
    ];
  };

  private handlePinchZoom = (zoomDelta: number, center: { x: number; y: number }): void => {
    const camera = this.threeConfig.camera;
    const target = this.controls.target;
    
    
    const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
    const zoomAmount = zoomDelta * 5;
    
    camera.position.add(direction.multiplyScalar(-zoomAmount));
    
    const distance = camera.position.distanceTo(target);
    
    const minDistance = 2;
    const maxDistance = 20;
    
    if (distance < minDistance) {
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(minDistance));
    } else if (distance > maxDistance) {
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(maxDistance));
    }
    
  };

  private handleTwoFingerRotation = (touch1: Touch, touch2: Touch): void => {
    const lastTouch1 = this.touchState.lastTouchPositions[0];
    const lastTouch2 = this.touchState.lastTouchPositions[1];
    
    if (!lastTouch1 || !lastTouch2)
      return;

    const currentAngle = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
    const lastAngle = Math.atan2(lastTouch2.y - lastTouch1.y, lastTouch2.x - lastTouch1.x);
    
    const angleDelta = currentAngle - lastAngle;

    this.controls.object.rotateZ(-angleDelta * TOUCH_CONSTANTS.TWO_FINGER_ROTATION_MULTIPLIER);
  };

  private getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  private getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  private setupDefaultScene = (): void => {
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
    testCube.position.set(
      SCENE_CONSTANTS.TEST_CUBE.POSITION.x,
      SCENE_CONSTANTS.TEST_CUBE.POSITION.y,
      SCENE_CONSTANTS.TEST_CUBE.POSITION.z
    );
    testCube.castShadow = true;
    testCube.receiveShadow = true;
    scene.add(testCube);

    const planeGeometry = new THREE.PlaneGeometry(
      SCENE_CONSTANTS.GROUND_PLANE.SIZE,
      SCENE_CONSTANTS.GROUND_PLANE.SIZE
    );
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: SCENE_CONSTANTS.GROUND_PLANE.COLOR 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = SCENE_CONSTANTS.GROUND_PLANE.ROTATION_X;
    plane.position.y = SCENE_CONSTANTS.GROUND_PLANE.POSITION_Y;
    plane.receiveShadow = true;
    plane.name = 'groundPlane';
    scene.add(plane);
  };

  private startAnimation = (): void => {
    const animate = () => {
      const { renderer, scene, camera } = this.threeConfig;
      
      if (this.controls && this.controls.enabled) {
        this.controls.update();
      }
      
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
    if (maxDimension > MODEL_CONSTANTS.BOUNDING_BOX.MIN_DIMENSION_THRESHOLD) {
      const scale = MODEL_CONSTANTS.DEFAULT_SCALE_SIZE / maxDimension;
      model.scale.setScalar(scale);
      
      const scaledBox = new THREE.Box3().setFromObject(model);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      
      model.position.set(
        -scaledCenter.x,
        MODEL_CONSTANTS.GROUND_OFFSET + scaledSize.y / MODEL_CONSTANTS.SCALE_OFFSET_DIVISOR - scaledCenter.y,
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
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * CAMERA_CONSTANTS.DISTANCE_MULTIPLIER;
    
    const cameraPosition = new THREE.Vector3(
      finalCenter.x + cameraDistance * CAMERA_CONSTANTS.POSITION_OFFSET.X_FACTOR,
      finalCenter.y + cameraDistance * CAMERA_CONSTANTS.POSITION_OFFSET.Y_FACTOR,
      finalCenter.z + cameraDistance * CAMERA_CONSTANTS.POSITION_OFFSET.Z_FACTOR
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

  public rotateCameraSingleFinger = (deltaX: number, deltaY: number): void => {
    const camera = this.threeConfig.camera;
    const target = this.controls.target;
    
    const offset = new THREE.Vector3().subVectors(camera.position, target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    
    spherical.theta -= deltaX * this.touchState.rotationSpeed;
    spherical.phi += deltaY * this.touchState.rotationSpeed;
    
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
    
    offset.setFromSpherical(spherical);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  };

  public zoomCamera = (zoomDelta: number): void => {
    const camera = this.threeConfig.camera;
    const target = this.controls.target;
    
    const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
    const zoomAmount = zoomDelta * 5;
    
    camera.position.add(direction.multiplyScalar(-zoomAmount));
    
    const distance = camera.position.distanceTo(target);
    const minDistance = 2;
    const maxDistance = 20;
    
    if (distance < minDistance) {
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(minDistance));
    } else if (distance > maxDistance) {
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(maxDistance));
    }
    
  };

  public rotateCameraTwoFinger = (angleDelta: number): void => {
    const camera = this.threeConfig.camera;
    
    camera.rotateZ(-angleDelta * TOUCH_CONSTANTS.TWO_FINGER_ROTATION_MULTIPLIER);
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
