# Spatial Photo WebXR Viewer

Demonstration of displaying iPhone spatial photos (HEIC format) in VR mode using WebXR and Three.js.

## Demo

This example shows how to:
1. Extract images from HEIC file
2. Properly process spatial photos
3. Display the result in VR mode via WebXR

## Usage

```html
<script type="module">
    import { initHeicViewer } from './heic-parser.js';

    // Initialize parser
    const files = ['photo.HEIC'];
    const results = await initHeicViewer(files, status => console.log(status));
    
    // Process results
    results.forEach(result => {
        if (result.success) {
            result.images.forEach(img => {
                // img.dataUrl - ready image
                // img.width, img.height - dimensions
                // img.debug - debug information
            });
        }
    });
</script>
```

## How it works

### 1. Initialize libheif

```javascript
const heif = await import('https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif-wasm/libheif-bundle.mjs');
const decoder = new heif.default.HeifDecoder();
```

### 2. Decode HEIC

```javascript
const images = decoder.decode(new Uint8Array(arrayBuffer));
```

### 3. Process image

It's important to properly initialize ImageData with alpha channel:

```javascript
const imageData = new ImageData(width, height);
for (let i = 3; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255; // Set alpha channel
}
```

### 4. Display in VR

```javascript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Create material from image
const texture = new THREE.TextureLoader().load(imageDataUrl);
const material = new THREE.MeshBasicMaterial({ map: texture });

// Create mesh
const geometry = new THREE.PlaneGeometry(16, 9);
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);
```

## Requirements

- Modern browser with WebAssembly and WebXR support
- libheif-js v1.18.2 or higher
- Three.js
- HTML5 Canvas API

## Limitations

1. Works only with valid HEIC files
2. Requires WebAssembly support
3. May require significant resources when processing large images
4. Browser must support WebXR and ES Modules

## Troubleshooting

1. **ERR_LIBHEIF format not supported**
    - Check libheif-js version
    - Check HEIC file validity

2. **Empty image**
    - Check alpha channel initialization
    - Check imageData dimensions

3. **Too many auxiliary image references**
    - Normal message for spatial photos
    - Ensure correct processing sequence

4. **WebXR not supported**
    - Check WebXR support in browser
    - Make sure VR device is connected and recognized