import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

let camera, scene, renderer;
let video, texture, material;
let meshL, meshR; // Separate meshes for left and right eyes

init();
animate();

function init() {
    // --- Basic Three.js setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(63.4, window.innerWidth / window.innerHeight, 0.1, 100); // Using original video's FOV
    camera.position.set(0, 1.6, 0); // Approximate eye height

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Add VR button
    document.body.appendChild(VRButton.createButton(renderer));

    // --- Video and texture setup ---
    video = document.getElementById('sbsVideo');
    video.preload = 'auto';

    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    // --- Creating geometry and materials for SBS ---
    const geometry = new THREE.PlaneGeometry(3.2, 1.8); // 16:9 but smaller for more comfortable viewing

    material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    });

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
    meshL = new THREE.Mesh(geometryL, material);
    meshR = new THREE.Mesh(geometryR, material);

    // Set layers for WebXR
    meshL.layers.set(1); // Left eye
    meshR.layers.set(2); // Right eye

    // Position screens with proper stereo separation based on video metadata
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

    // Start video on click (for browsers blocking autoplay)
    document.addEventListener('click', () => {
        if (video.paused) {
            video.play().catch(e => console.error("Video playback error:", e));
        }
    }, { once: true });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSessionStart() {
    if (video.paused) {
        video.play().catch(e => console.error("Video playback error at session start:", e));
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
}
