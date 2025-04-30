import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

let camera, scene, renderer;
let video, texture, material;
let meshL, meshR; // Отдельные меши для левого и правого глаза

init();
animate();

function init() {
    // --- Базовая настройка Three.js ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 0); // Примерная высота глаз

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Добавляем кнопку VR
    document.body.appendChild(VRButton.createButton(renderer));

    // --- Настройка видео и текстуры ---
    video = document.getElementById('sbsVideo');
    video.preload = 'auto';

    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    // --- Создание геометрии и материалов для SBS ---
    const geometry = new THREE.PlaneGeometry(4, 2.25); // 16:9

    material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    });

    // Клонируем геометрию для каждого глаза
    const geometryL = geometry.clone();
    const geometryR = geometry.clone();

    // Настройка UV-координат для левого глаза (левая половина текстуры)
    const uvsL = geometryL.attributes.uv;
    for (let i = 0; i < uvsL.count * 2; i += 2) {
        uvsL.array[i] *= 0.5;
    }
    uvsL.needsUpdate = true;

    // Настройка UV-координат для правого глаза (правая половина текстуры)
    const uvsR = geometryR.attributes.uv;
    for (let i = 0; i < uvsR.count * 2; i += 2) {
        uvsR.array[i] *= 0.5;
        uvsR.array[i] += 0.5;
    }
    uvsR.needsUpdate = true;

    // Создаем и позиционируем меши
    meshL = new THREE.Mesh(geometryL, material);
    meshR = new THREE.Mesh(geometryR, material);

    // Устанавливаем слои для WebXR
    meshL.layers.set(1); // Левый глаз
    meshR.layers.set(2); // Правый глаз

    // Позиционируем экраны
    const position = new THREE.Vector3(0, 1.6, -2.5);
    meshL.position.copy(position);
    meshR.position.copy(position);

    scene.add(meshL);
    scene.add(meshR);

    // --- Обработчики событий ---
    window.addEventListener('resize', onWindowResize);
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    // Запуск видео по клику (для браузеров, блокирующих автовоспроизведение)
    document.addEventListener('click', () => {
        if (video.paused) {
            video.play().catch(e => console.error("Ошибка воспроизведения видео:", e));
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
        video.play().catch(e => console.error("Ошибка воспроизведения видео при старте сессии:", e));
    }
}

function onSessionEnd() {
    console.log("WebXR сессия завершена");
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    renderer.render(scene, camera);
}
