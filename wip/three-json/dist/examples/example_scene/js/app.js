import { updateProgress } from './utils/progress.js';
import { handleResize } from './utils/resize.js';

class SceneManager {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById('container');
        
        this.initScene();
        this.initRenderer();
        this.initCamera();
        this.initControls();
        this.initLights();
        this.loadModel();
        
        window.addEventListener('resize', () => this.handleResize());
    }
    
    initScene() {
        this.scene = new THREE.Scene();
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = this.config.shadows ?? true;
        this.renderer.setClearColor(this.config.backgroundColor ?? 0xeeeeee, 1);
        this.container.appendChild(this.renderer.domElement);
    }
    
    initCamera() {
        // Create a default camera - we'll update its position when the model loads
        this.camera = new THREE.PerspectiveCamera(
            35, // default FOV
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            10000
        );
        
        // Set a default position that will be updated later
        this.camera.position.set(0, 0, 10);
    }
    
    initControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = true;
        this.controls.maxPolarAngle = Math.PI / 2;
    }
    
    initLights() {
        THREE.RectAreaLightUniformsLib.init();
    }
    
    fitCameraToObject(object, offset = 0.5) {
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(object);
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        
        // Get the max side of the bounding box
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        
        // Apply the offset
        cameraZ *= offset;
        
        // Update camera position and look at center
        this.camera.position.set(center.x, center.y, center.z + cameraZ);
        this.controls.target.copy(center);
        
        // Update the camera
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }
    
    loadModel() {
        const loader = new THREE.ObjectLoader();
        
        console.log('Loading model from:', this.config.model);
        
        loader.load(
            this.config.model,
            (obj) => {
                console.log('Model loaded successfully:', obj);
                document.getElementById('progress')?.remove();
                this.scene = obj;
                
                // Find cameras in the loaded scene
                const cameras = obj.children.filter(child => child instanceof THREE.Camera);
                
                if (cameras.length > 0) {
                    // Use the first camera found in the scene
                    this.camera = cameras[0];
                    // Update aspect ratio to match container
                    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                    this.camera.updateProjectionMatrix();
                    // Update controls to use the new camera
                    this.controls.object = this.camera;
                    this.controls.update();
                } else {
                    // No cameras found, use fitCameraToObject
                    this.fitCameraToObject(obj);
                }
            },
            (xhr) => {
                console.log('Loading progress:', xhr);
                updateProgress(this.container, xhr);
            },
            (err) => {
                console.error('Error loading model:', err);
                console.error('Model path was:', this.config.model);
            }
        );
    }
    
    handleResize() {
        handleResize(this.camera, this.renderer, this.container);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize scene with config
const sceneManager = new SceneManager(window.sceneConfig);
sceneManager.animate();