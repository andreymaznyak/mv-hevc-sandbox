import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';
import { initHeicViewer } from '../spatial-photos/heic-parser.js';

// Global variables
let camera, scene, renderer;
let meshL, meshR;
let progressMesh;
let controllers = [];
let currentPhotoIndex = 5;
const availablePhotos = [4, 5, 6, 7];

init();

async function init() {
    initThreeJS();
    setupPhotoButtons();
    setupVRButton();
    await loadSpatialPhoto(currentPhotoIndex);

    window.addEventListener('resize', onWindowResize);
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    animate();
}

function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Setup VR camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // User eye height
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    
    // VR optimizations
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Add renderer to DOM
    document.body.appendChild(renderer.domElement);

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
}

function setupVRButton() {
    const vrButton = document.getElementById('vr-button');
    vrButton.addEventListener('click', enterVR);
    
    // Check WebXR support
    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
            if (!supported) {
                vrButton.disabled = true;
                vrButton.textContent = 'VR not supported';
            }
        });
    } else {
        vrButton.disabled = true;
        vrButton.textContent = 'WebXR not supported';
    }
}

function setupPhotoButtons() {
    const buttons = document.querySelectorAll('.photo-button');
    buttons.forEach(button => {
        const photoIndex = parseInt(button.dataset.index);
        if (photoIndex === currentPhotoIndex) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => switchPhoto(photoIndex));
    });
}

async function switchPhoto(index) {
    if (currentPhotoIndex === index) return;
    
    currentPhotoIndex = index;
    
    // Update button states
    document.querySelectorAll('.photo-button').forEach(button => {
        button.classList.toggle('active', parseInt(button.dataset.index) === index);
    });
    
    // Clear current scene
    if (meshL) scene.remove(meshL);
    if (meshR) scene.remove(meshR);
    
    // Load new photo
    await loadSpatialPhoto(index);
}

async function loadSpatialPhoto(index) {
    try {
        const photoPath = `../assets/photos/example-${index}.HEIC`;
        const results = await initHeicViewer([photoPath], status => {
            document.getElementById('status').textContent = status;
            
            // Extract progress percentage from status
            const match = status.match(/(\d+)%/);
            if (match) {
                const progress = parseInt(match[1]);
                updateProgress(progress);
            } else if (status.includes('успешно')) {
                updateProgress(100);
            }
        });

        if (!results[0].success) {
            throw new Error(`Failed to load spatial photo: ${results[0].error}`);
        }

        const { images } = results[0];
        const rightImage = images[1];
        const leftImage = images[2];

        if (!rightImage || !leftImage) {
            throw new Error('Missing stereo images in spatial photo');
        }

        // Update regular view
        updateRegularView(leftImage, rightImage);
        
        // Setup VR view
        await setupVRView(leftImage, rightImage);

        document.getElementById('status').textContent = `Photo ${index} loaded successfully`;
    } catch (error) {
        console.error('Error loading spatial photo:', error);
        document.getElementById('status').textContent = `Error: ${error.message}`;
    }
}

function updateRegularView(leftImage, rightImage) {
    const leftEyeImg = document.getElementById('left-eye');
    const rightEyeImg = document.getElementById('right-eye');
    
    if (leftEyeImg && rightEyeImg) {
        leftEyeImg.src = leftImage.dataUrl;
        rightEyeImg.src = rightImage.dataUrl;
    }
}

async function setupVRView(leftImage, rightImage) {
    // Calculate image aspect ratio
    const aspectRatio = leftImage.width / leftImage.height;
    
    // Base height for VR viewing
    const baseHeight = 2;
    const baseWidth = baseHeight * aspectRatio;
    
    // Create geometry with correct proportions
    const geometry = new THREE.PlaneGeometry(baseWidth, baseHeight);
    
    // Load textures
    const [leftTexture, rightTexture] = await Promise.all([
        createTextureFromDataUrl(leftImage.dataUrl),
        createTextureFromDataUrl(rightImage.dataUrl)
    ]);

    // Setup textures
    [leftTexture, rightTexture].forEach(texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
    });

    // Create meshes for each eye
    meshL = createEyeMesh(geometry.clone(), leftTexture, 1);
    meshR = createEyeMesh(geometry.clone(), rightTexture, 2);

    // Position images
    const distance = 2; // Distance from camera to image
    const basePosition = new THREE.Vector3(0, 1.6, -distance);
    const stereoOffset = 0.032; // Interpupillary distance (IPD)

    meshL.position.copy(basePosition).setX(-stereoOffset);
    meshR.position.copy(basePosition).setX(stereoOffset);

    // Rotate images towards camera
    meshL.lookAt(new THREE.Vector3(-stereoOffset, 1.6, 0));
    meshR.lookAt(new THREE.Vector3(stereoOffset, 1.6, 0));

    scene.add(meshL);
    scene.add(meshR);
}

function createEyeMesh(geometry, texture, layerIndex) {
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.layers.set(layerIndex);
    return mesh;
}

function createTextureFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            dataUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false; // Disable for performance
                resolve(texture);
            },
            (progress) => {
                if (progress.lengthComputable) {
                    const percentage = (progress.loaded / progress.total * 100).toFixed(2);
                    document.getElementById('status').textContent = `Loading texture: ${percentage}%`;
                }
            },
            (error) => {
                console.error('Error loading texture:', error);
                reject(error);
            }
        );
    });
}

async function enterVR() {
    const vrButton = document.getElementById('vr-button');
    
    if (renderer.xr.isPresenting) {
        try {
            const session = renderer.xr.getSession();
            await session.end();
        } catch (err) {
            console.error('Error exiting VR:', err);
        }
        return;
    }

    try {
        // Request VR session with required features
        const session = await navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor', 'bounded-floor'],
            optionalFeatures: ['hand-tracking']
        });

        // Setup reference space
        session.addEventListener('end', onSessionEnd);
        
        // Set base reference space
        const refSpace = await session.requestReferenceSpace('local-floor');
        renderer.xr.setReferenceSpace(refSpace);
        
        // Set session
        await renderer.xr.setSession(session);

        // Update button state
        vrButton.textContent = 'Exit VR';
        document.getElementById('status').textContent = 'VR mode active';
    } catch (err) {
        console.error('Error entering VR:', err);
        document.getElementById('status').textContent = 'Error entering VR: ' + err.message;
        vrButton.textContent = 'VR Error';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSessionStart() {
    document.body.classList.add('xr-active');
    const vrButton = document.getElementById('vr-button');
    vrButton.textContent = 'Exit VR';
    
    // Hide UI elements in VR
    document.getElementById('ui-container').style.display = 'none';
    
    // Set initial camera position in VR
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
    
    // Initialize controllers and UI
    setupControllers();
    createProgressIndicator();
    
    // Update status
    document.getElementById('status').textContent = 'VR session active';
}

function setupControllers() {
    // Clear existing controllers
    controllers.forEach(controller => {
        scene.remove(controller);
    });
    controllers = [];

    // Create controllers for both hands
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.addEventListener('select', () => handleControllerSelect(i));
        controllers.push(controller);
    }
}

function handleControllerSelect(controllerIndex) {
    // Переключаем фото в зависимости от того, какой контроллер использован
    const currentIndex = availablePhotos.indexOf(currentPhotoIndex);
    if (controllerIndex === 0 && currentIndex > 0) {
        // Left controller - previous photo
        switchPhoto(availablePhotos[currentIndex - 1]);
    } else if (controllerIndex === 1 && currentIndex < availablePhotos.length - 1) {
        // Right controller - next photo
        switchPhoto(availablePhotos[currentIndex + 1]);
    }
}

function createProgressIndicator() {
    if (progressMesh) {
        scene.remove(progressMesh);
    }

    // Create semi-transparent panel for progress display
    const geometry = new THREE.PlaneGeometry(0.3, 0.05);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });

    progressMesh = new THREE.Mesh(geometry, material);
    progressMesh.position.set(0, 1.6, -1); // Place in front of user
    progressMesh.visible = false;
    
    // Add to scene for both eyes
    progressMesh.layers.enable(1);
    progressMesh.layers.enable(2);
    scene.add(progressMesh);
}

function updateProgress(progress) {
    if (!progressMesh) return;
    
    progressMesh.visible = progress < 100;
    if (progress < 100) {
        // Update progress indicator size
        progressMesh.scale.x = progress / 100;
        // Update color from red to green
        const hue = progress / 100 * 0.3; // 0.3 = green in HSL
        progressMesh.material.color.setHSL(hue, 1, 0.5);
    }
}

function onSessionEnd() {
    document.body.classList.remove('xr-active');
    const vrButton = document.getElementById('vr-button');
    vrButton.textContent = 'Enter VR';
    
    // Show UI elements after exiting VR
    document.getElementById('ui-container').style.display = 'block';
    
    // Reset camera position
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
    
    // Clear VR elements
    if (progressMesh) {
        progressMesh.visible = false;
    }
    controllers.forEach(controller => {
        scene.remove(controller);
    });
    controllers = [];
    
    // Update status
    document.getElementById('status').textContent = 'VR session ended';
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    // Render scene with correct layers for each eye
    if (renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        const xrCamera = renderer.xr.getCamera();
        
        // Process left eye
        xrCamera.cameras[0].layers.set(1);
        
        // Process right eye
        xrCamera.cameras[1].layers.set(2);
    }
    
    renderer.render(scene, camera);
}