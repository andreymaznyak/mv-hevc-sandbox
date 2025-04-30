import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

let camera, scene, renderer;
let currentVideoIndex = 0;
let videos = [];
let textures = [];
let materials = [];
let meshL, meshR;

// UI elements
const prevButton = document.getElementById('prevVideo');
const nextButton = document.getElementById('nextVideo');
const currentVideoText = document.getElementById('currentVideo');

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

    // --- Videos setup ---
    videos = [
        document.getElementById('video1'),
        document.getElementById('video2'),
        document.getElementById('video3')
    ];

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

    // Setup UV coordinates for left eye (left half of texture)
    const uvsL = geometryL.attributes.uv;
    for (let i = 0; i < uvsL.count * 2; i += 2) {
        uvsL.array[i] *= 0.5;
    }
    uvsL.needsUpdate = true;

    // Setup UV coordinates for right eye (right half of texture)
    const uvsR = geometryR.attributes.uv;
    for (let i = 0; i < uvsR.count * 2; i += 2) {
        uvsR.array[i] *= 0.5;
        uvsR.array[i] += 0.5;
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
    prevButton.addEventListener('click', () => switchVideo('prev'));
    nextButton.addEventListener('click', () => switchVideo('next'));

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') switchVideo('prev');
        if (event.key === 'ArrowRight') switchVideo('next');
    });

    // Start first video on click (for browsers blocking autoplay)
    document.addEventListener('click', () => {
        if (videos[currentVideoIndex].paused) {
            videos[currentVideoIndex].play()
                .catch(e => console.error("Video playback error:", e));
        }
    }, { once: true });

    updateVideoUI();
}

function switchVideo(direction) {
    // Stop current video
    videos[currentVideoIndex].pause();

    // Update index
    if (direction === 'next') {
        currentVideoIndex = (currentVideoIndex + 1) % videos.length;
    } else {
        currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
    }

    // Update materials
    meshL.material = materials[currentVideoIndex];
    meshR.material = materials[currentVideoIndex];

    // Start new video
    videos[currentVideoIndex].play()
        .catch(e => console.error("Video playback error when switching:", e));

    updateVideoUI();
}

function updateVideoUI() {
    currentVideoText.textContent = `Video ${currentVideoIndex + 1}/${videos.length}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSessionStart() {
    if (videos[currentVideoIndex].paused) {
        videos[currentVideoIndex].play()
            .catch(e => console.error("Video playback error at session start:", e));
    }

    // Add VR controller event listeners
    renderer.xr.getController(0).addEventListener('select', () => switchVideo('prev'));
    renderer.xr.getController(1).addEventListener('select', () => switchVideo('next'));
}

function onSessionEnd() {
    console.log("WebXR session ended");
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    renderer.render(scene, camera);
}
