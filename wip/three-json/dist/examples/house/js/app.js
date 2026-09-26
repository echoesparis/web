import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
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
        // Press "c" to log the current view, ready to paste into config.js
        window.addEventListener('keydown', (e) => { if (e.key === 'c') console.log(this.cameraConfig()); });
    }

    initScene() {
        this.scene = new THREE.Scene();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = this.config.shadows ?? true;
        this.renderer.setClearColor(this.config.backgroundColor ?? 0xeeeeee, 1);
        this.container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        // Default camera, repositioned once the model loads
        this.camera = new THREE.PerspectiveCamera(
            35,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            10000
        );
        this.camera.position.set(0, 0, 10);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = true;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    initLights() {
        RectAreaLightUniformsLib.init();
    }

    // The scenes were exported for three.js r128 "legacy" lighting; since r155
    // lights use physical units, so match the old look: scale by PI and drop
    // the inverse-square falloff that legacy mode skipped when distance was 0
    convertLegacyLights(object) {
        if (this.config.legacyLights === false) return;
        object.traverse((child) => {
            if (!child.isLight) return;
            child.intensity *= Math.PI;
            if ((child.isPointLight || child.isSpotLight) && child.distance === 0) child.decay = 0;
        });
    }

    // Bounding box of the visible geometry, ignoring ground planes: a flat
    // object covering most of the scene would otherwise dwarf the model
    contentBox(object) {
        const boxes = [];
        object.updateMatrixWorld(true);
        object.traverse((child) => {
            if (child.isMesh || child.isLine || child.isPoints) {
                boxes.push(new THREE.Box3().setFromObject(child));
            }
        });
        const all = boxes.reduce((acc, b) => acc.union(b), new THREE.Box3());
        const allSize = all.getSize(new THREE.Vector3());
        const isGround = (b) => {
            const s = b.getSize(new THREE.Vector3());
            return s.y < 1e-3 * Math.max(s.x, s.z) && s.x * s.z > 0.25 * allSize.x * allSize.z;
        };
        const content = boxes.filter((b) => !isGround(b)).reduce((acc, b) => acc.union(b), new THREE.Box3());
        return content.isEmpty() ? all : content;
    }

    // Three-quarter view from above, far enough to fit the whole content
    fitCameraToObject(object) {
        const box = this.contentBox(object);
        const center = box.getCenter(new THREE.Vector3());
        const radius = box.getBoundingSphere(new THREE.Sphere()).radius;

        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const fitFov = this.camera.aspect < 1 ? 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect) : fov;
        const distance = 0.8 * radius / Math.sin(fitFov / 2);

        const direction = new THREE.Vector3(1, 0.8, 1.4).normalize();
        this.setView(center.clone().addScaledVector(direction, distance), center);
    }

    setView(position, target) {
        this.camera.position.copy(position);
        this.controls.target.copy(target);
        this.camera.near = Math.max(position.distanceTo(target) / 1000, 0.01);
        this.camera.far = position.distanceTo(target) * 100;
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    cameraConfig() {
        const round = (v) => v.toArray().map((n) => +n.toFixed(2));
        return JSON.stringify({ position: round(this.camera.position), target: round(this.controls.target) });
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
                this.convertLegacyLights(obj);

                // A camera stored in config.js wins, then one saved in the scene,
                // then an automatic fit
                const cameras = obj.children.filter((child) => child.isCamera);
                const view = this.config.camera;
                if (view) {
                    this.setView(new THREE.Vector3(...view.position), new THREE.Vector3(...view.target));
                } else if (cameras.length > 0) {
                    this.camera = cameras[0];
                    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                    this.camera.updateProjectionMatrix();
                    this.controls.object = this.camera;
                    this.controls.update();
                } else {
                    this.fitCameraToObject(obj);
                }
                this.loaded = true;
            },
            (xhr) => {
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
        this.renderer.setAnimationLoop(() => {
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Initialize scene with config
const sceneManager = new SceneManager(window.sceneConfig);
window.sceneManager = sceneManager;
sceneManager.animate();
