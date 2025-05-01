import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

let camera, scene, renderer;
let currentVideoIndex = 0;
let videos = [];
let textures = [];
let materials = [];
let meshL, meshR;
let leftCanvas, rightCanvas, leftCtx, rightCtx;

// UI elements
const prevButton = document.getElementById('prevVideo');
const nextButton = document.getElementById('nextVideo');
const currentVideoText = document.getElementById('currentVideo');
const playPauseButton = document.getElementById('playPause');

init();
animate();

function init() {
    // --- Basic Three.js setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(63.4, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 0); // Approximate eye height

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Add VR button
    document.body.appendChild(VRButton.createButton(renderer));

    // --- Canvas setup ---
    leftCanvas = document.getElementById('left-eye');
    rightCanvas = document.getElementById('right-eye');
    leftCtx = leftCanvas.getContext('2d');
    rightCtx = rightCanvas.getContext('2d');

    // Set canvas sizes (assuming 16:9 aspect ratio)
    const canvasWidth = leftCanvas.parentElement.clientWidth;
    const canvasHeight = Math.floor(canvasWidth * 9/16);
    leftCanvas.width = rightCanvas.width = canvasWidth;
    leftCanvas.height = rightCanvas.height = canvasHeight;

    // --- Videos setup ---
    videos = [
        document.getElementById('video1'),
        document.getElementById('video2'),
        document.getElementById('video3')
    ];

    // Initialize first video
    initVideo(videos[currentVideoIndex]);

    // --- Textures and materials setup ---
    videos.forEach(video => {
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.push(texture);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        materials.push(material);
    });

    // --- Creating geometry for SBS ---
    const geometry = new THREE.PlaneGeometry(3.2, 1.8); // 16:9 but smaller for comfort

    // Clone geometry for each eye
    const geometryL = geometry.clone();
    const geometryR = geometry.clone();

    // Setup UV coordinates for left eye (right half of texture)
    const uvsL = geometryL.attributes.uv;
    for (let i = 0; i < uvsL.count * 2; i += 2) {
        uvsL.array[i] *= 0.5;
        uvsL.array[i] += 0.5;
    }
    uvsL.needsUpdate = true;

    // Setup UV coordinates for right eye (left half of texture)
    const uvsR = geometryR.attributes.uv;
    for (let i = 0; i < uvsR.count * 2; i += 2) {
        uvsR.array[i] *= 0.5;
    }
    uvsR.needsUpdate = true;

    // Create and position meshes
    meshL = new THREE.Mesh(geometryL, materials[currentVideoIndex]);
    meshR = new THREE.Mesh(geometryR, materials[currentVideoIndex]);

    // Set layers for WebXR
    meshL.layers.set(1); // Left eye
    meshR.layers.set(2); // Right eye

    // Position screens with proper stereo separation
    const basePosition = new THREE.Vector3(0, 1.6, -3);
    const stereoOffset = 0.02; // From video's horizontal_disparity_adjustment
    
    meshL.position.copy(basePosition).setX(basePosition.x - stereoOffset);
    meshR.position.copy(basePosition).setX(basePosition.x + stereoOffset);

    scene.add(meshL);
    scene.add(meshR);

    // --- Event handlers ---
    window.addEventListener('resize', onWindowResize);
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    // Video controls
    prevButton.addEventListener('click', () => switchVideo('prev').catch(console.error));
    nextButton.addEventListener('click', () => switchVideo('next').catch(console.error));
    playPauseButton.addEventListener('click', () => togglePlayPause().catch(console.error));

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') switchVideo('prev').catch(console.error);
        if (event.key === 'ArrowRight') switchVideo('next').catch(console.error);
    });

    // Start first video on click (for browsers blocking autoplay)
    document.addEventListener('click', () => {
        const video = videos[currentVideoIndex];
        if (video.paused) {
            initVideo(video).catch(console.error);
        }
    }, { once: true });

    updateVideoUI();
}

async function switchVideo(direction) {
    try {
        // Stop current video
        const oldVideo = videos[currentVideoIndex];
        oldVideo.pause();

        // Update index
        if (direction === 'next') {
            currentVideoIndex = (currentVideoIndex + 1) % videos.length;
        } else {
            currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
        }

        // Update materials
        meshL.material = materials[currentVideoIndex];
        meshR.material = materials[currentVideoIndex];

        // Initialize new video
        await initVideo(videos[currentVideoIndex]);

    } catch (error) {
        console.error("Error switching video:", error);
    }
}

function updateVideoUI() {
    currentVideoText.textContent = `Video ${currentVideoIndex + 1}/${videos.length}`;
    updatePlayPauseButton();
}

function updatePlayPauseButton() {
    const video = videos[currentVideoIndex];
    playPauseButton.textContent = video.paused ? 'Play' : 'Pause';
}

async function togglePlayPause() {
    try {
        const video = videos[currentVideoIndex];
        if (video.paused) {
            await video.play();
        } else {
            video.pause();
        }
        updatePlayPauseButton();
    } catch (error) {
        console.error("Error toggling video:", error);
    }
}

async function initVideo(video) {
    return new Promise((resolve, reject) => {
        const onMetadata = async () => {
            try {
                // Set canvas sizes
                const halfWidth = video.videoWidth / 2;
                const height = video.videoHeight;
                leftCanvas.width = rightCanvas.width = halfWidth;
                leftCanvas.height = rightCanvas.height = height;

                // Start playing
                await video.play();
                updateVideoUI();
                updatePlayPauseButton();
                resolve();
            } catch (error) {
                reject(error);
            }
        };

        if (video.readyState >= 1) {
            onMetadata();
        } else {
            video.addEventListener('loadedmetadata', onMetadata, { once: true });
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function onSessionStart() {
    try {
        const video = videos[currentVideoIndex];
        if (video.paused) {
            await video.play();
            updatePlayPauseButton();
        }

        // Add VR controller event listeners
        renderer.xr.getController(0).addEventListener('select', () => switchVideo('prev').catch(console.error));
        renderer.xr.getController(1).addEventListener('select', () => switchVideo('next').catch(console.error));
    } catch (error) {
        console.error("Error starting VR session:", error);
    }
}

function onSessionEnd() {
    console.log("WebXR session ended");
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    renderer.render(scene, camera);
    updateCanvasViews();
}

function updateCanvasViews() {
    const video = videos[currentVideoIndex];
    if (video.readyState >= 2) {  // Show frames even when paused
        const halfWidth = video.videoWidth / 2;
        const height = video.videoHeight;

        try {
            // Clear canvases first
            leftCtx.clearRect(0, 0, leftCanvas.width, leftCanvas.height);
            rightCtx.clearRect(0, 0, rightCanvas.width, rightCanvas.height);

            // Update left eye view (right half of the video)
            leftCtx.drawImage(video,
                halfWidth, 0, halfWidth, height,  // Source rectangle (right half)
                0, 0, leftCanvas.width, leftCanvas.height  // Destination rectangle
            );

            // Update right eye view (left half of the video)
            rightCtx.drawImage(video,
                0, 0, halfWidth, height,  // Source rectangle (left half)
                0, 0, rightCanvas.width, rightCanvas.height  // Destination rectangle
            );
        } catch (e) {
            console.error("Error drawing video frame:", e);
        }
    }
}
