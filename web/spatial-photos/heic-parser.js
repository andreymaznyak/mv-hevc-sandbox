// Utility functions
async function fetchArrayBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

function debugImageData(imageData) {
    let nonZeroPixels = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== 0 || 
            imageData.data[i + 1] !== 0 || 
            imageData.data[i + 2] !== 0) {
            nonZeroPixels++;
        }
    }
    return {
        width: imageData.width,
        height: imageData.height,
        totalPixels: (imageData.width * imageData.height),
        nonZeroPixels,
        firstPixels: Array.from(imageData.data.slice(0, 16))
    };
}

function imageDataToDataURL(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg');
}

function processSingleImage(image) {
    return new Promise((resolve, reject) => {
        try {
            const width = image.get_width();
            const height = image.get_height();
            console.log(`Processing image ${width}x${height}`);

            // Create ImageData with correct dimensions
            const imageData = new ImageData(width, height);
            
            // Fill alpha channel
            for (let i = 3; i < imageData.data.length; i += 4) {
                imageData.data[i] = 255;
            }

            image.display(imageData, (displayData) => {
                if (!displayData) {
                    return reject(new Error("Failed to process image"));
                }

                const debug = debugImageData(displayData);
                console.log('Display data debug:', debug);

                // Convert ImageData to Data URL
                const dataUrl = imageDataToDataURL(displayData);
                
                resolve({
                    dataUrl,
                    width,
                    height,
                    debug
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function processHeicFile(arrayBuffer, heif) {
    const decoder = new heif.HeifDecoder();
    let images = decoder.decode(new Uint8Array(arrayBuffer));
    
    if (!images || !images.length) {
        throw new Error("No images found in HEIC file");
    }

    // Filter only valid images
    images = images.filter(img => {
        try {
            img.get_height();
            return true;
        } catch (e) {
            return false;
        }
    });

    if (!images.length) {
        throw new Error("No valid images found in HEIC file");
    }

    return Promise.all(images.map(processSingleImage));
}

export async function initHeicViewer(files, statusCallback = console.log) {
    try {
        // Initialize libheif
        const heifModule = await import('https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif-wasm/libheif-bundle.mjs');
        const heif = await heifModule.default();
        const results = [];

        for (const file of files) {
            statusCallback(`Processing ${file}...`);
            try {
                const arrayBuffer = await fetchArrayBuffer(file);
                const images = await processHeicFile(arrayBuffer, heif);
                results.push({ file, images, success: true });
            } catch (error) {
                console.error(`Error processing ${file}:`, error);
                results.push({ file, error: error.message, success: false });
            }
        }

        statusCallback('All files processed');
        return results;
    } catch (error) {
        console.error('Init error:', error);
        throw error;
    }
}