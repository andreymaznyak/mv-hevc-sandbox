# HEIC Spatial Photo Parser

Demonstration of parsing iPhone spatial photos (HEIC format) using libheif-js.

## Demo

This example shows how to:
1. Extract all images from HEIC file
2. Correctly process spatial photos
3. Display results in the browser

## Usage

```html
<script type="module">
    import { initHeicViewer } from './heic-parser.js';

    // Parser initialization
    const files = ['photo.HEIC'];
    const results = await initHeicViewer(files, status => console.log(status));
    
    // Processing results
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

### 1. libheif Initialization

```javascript
const heif = await import('https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif-wasm/libheif-bundle.mjs');
const decoder = new heif.default.HeifDecoder();
```

### 2. HEIC Decoding

```javascript
const images = decoder.decode(new Uint8Array(arrayBuffer));
```

### 3. Image Processing

It's important to properly initialize ImageData with alpha channel set:

```javascript
const imageData = new ImageData(width, height);
for (let i = 3; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255; // Setting alpha channel
}
```

### 4. Displaying Results

```javascript
image.display(imageData, (displayData) => {
    if (!displayData) return;
    // displayData contains pixel data of the image
});
```

## Implementation Details

1. **Alpha Channel Pre-initialization**
   - Required for correct display
   - Prevents transparency issues

2. **Image Validation**
   ```javascript
   images = images.filter(img => {
       try {
           img.get_height();
           return true;
       } catch (e) {
           return false;
       }
   });
   ```

3. **Data URL Conversion**
   ```javascript
   function imageDataToDataURL(imageData) {
       const canvas = document.createElement('canvas');
       canvas.width = imageData.width;
       canvas.height = imageData.height;
       const ctx = canvas.getContext('2d');
       ctx.putImageData(imageData, 0, 0);
       return canvas.toDataURL('image/jpeg');
   }
   ```

## Debug Information

The parser provides debug information for each image:
- Number of non-zero pixels
- Total pixel count
- First bytes of the image
- Image dimensions

## Requirements

- Modern browser with WebAssembly support and ES Modules
- libheif-js v1.18.2 or higher
- HTML5 Canvas API support

## Limitations

1. Works only with valid HEIC files
2. Requires WebAssembly browser support
3. May require significant resources when processing large images
4. Browser must support ES Modules

## Troubleshooting

1. **ERR_LIBHEIF format not supported**
   - Check libheif-js version
   - Verify HEIC file validity

2. **Empty image**
   - Check alpha channel initialization
   - Verify imageData dimensions

3. **Too many auxiliary image references**
   - Normal message for spatial photos
   - Ensure correct processing sequence