# MV-HEVC to SBS H.264 WebXR Player

A project for transcoding spatial video from MV-HEVC format to SBS H.264 and playing it in WebXR.

## Requirements

- Docker
- Web browser with WebXR support (Chrome, Edge, Firefox with WebXR enabled, Meta Quest Browser)
- VR headset compatible with WebXR
- Python 3 (for local web server)

## Project Structure

```
mv-hevc-sandbox/
├── docker/                  # Docker container for transcoding
│   ├── Dockerfile
│   └── transcode.sh
├── web/                    # Web application for viewing
│   ├── index.html
│   ├── main.js
│   └── styles/
│       └── main.css
├── example-videos/
│   ├── source/            # Source MV-HEVC videos
│   └── output/            # Transcoded SBS videos
└── README.md
```

## Usage

### 1. Building Docker Image

```bash
cd docker
docker build -t mvhevc-transcoder .
```

### 2. Video Transcoding

```bash
docker run --rm \
  -v "$(pwd)/example-videos/source:/input" \
  -v "$(pwd)/web/assets:/output" \
  mvhevc-transcoder \
  /input/example-1.mov \
  /output/example-1-sbs.mp4
```

### 3. Starting Web Server

```bash
cd web
python3 -m http.server 3000 --bind 0.0.0.0
```

### 4. VR Viewing

1. Open browser and go to `http://localhost:3000`
2. Connect VR headset
3. Click "Enter VR" button on the webpage
4. Put on VR headset

## Implementation Details

### Docker Container

- Uses Ubuntu 22.04 as base image
- Installs FFmpeg 7.1+ from source for MV-HEVC support
- Includes transcoding script with optimized parameters

### Web Application

- Uses Three.js for 3D rendering
- Supports WebXR for VR display
- Implements correct SBS video separation for left and right eyes through UV mapping
- Automatically handles various WebXR session states

## Troubleshooting

### Docker Issues

- Make sure Docker is running
- Check access permissions for source and output directories
- Ensure input video is actually in MV-HEVC format

### Web Application Issues

- Make sure you're using HTTPS or localhost for WebXR
- Check WebXR support in your browser
- Ensure video file loads successfully (check browser console)
- If playback issues occur, try clicking on the page before entering VR

### VR Issues

- Check VR headset connection
- Make sure browser has permission to access VR device
- Verify headset is properly recognized in system settings

## Technical Details

### Transcoding Parameters

FFmpeg uses the following key parameters:
- `-filter_complex "[0:v:view:0][0:v:view:1]hstack"` - combining views into SBS format
- `-c:v libx264` - encoding to H.264
- `-b:v 5M` - sets constant bitrate to 5 Mbps (if not specified, would use CRF mode with default value of 23)
- `-c:a copy` - copies audio stream without re-encoding
- `-y` - automatically overwrite output file if it exists

### WebXR Rendering

- Uses separate meshes for left and right eyes
- UV coordinates are modified for correct SBS display
- Supports automatic scaling when window size changes
- Implements WebXR session interruption handling

## License

MIT
