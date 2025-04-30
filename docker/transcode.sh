#!/bin/bash

# Check for arguments
if [ "$1" == "--help" ] || [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <input_MVHEVC_path> <output_SBS_path>"
  echo "Example: $0 /input/spatial_video.mov /output/output_sbs.mp4"
  exit 1
fi

INPUT_MVHEVC="$1"
OUTPUT_SBS="$2"

# Check if input file exists
if [ ! -f "$INPUT_MVHEVC" ]; then
    echo "Error: Input file not found: $INPUT_MVHEVC"
    exit 1
fi

# Check write permissions for output directory
OUTPUT_DIR=$(dirname "$OUTPUT_SBS")
if [ ! -w "$OUTPUT_DIR" ]; then
    echo "Error: No write permission for directory: $OUTPUT_DIR"
    # Try to create directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"
    if [ ! -w "$OUTPUT_DIR" ]; then
        echo "Error: Failed to create or get write permission for directory: $OUTPUT_DIR"
        exit 1
    fi
fi

echo "Starting transcoding:"
echo "  Input: $INPUT_MVHEVC"
echo "  Output: $OUTPUT_SBS"

# FFmpeg command for transcoding MV-HEVC to SBS H.264
ffmpeg -i "$INPUT_MVHEVC" \
       -filter_complex "[0:v:view:0][0:v:view:1]hstack" \
       -c:v libx264 \
       -b:v 5M \
       -c:a copy \
       -y \
       "$OUTPUT_SBS"

# Check FFmpeg exit status
if [ $? -ne 0 ]; then
  echo "Error: FFmpeg finished with error."
  exit 1
else
  echo "Transcoding completed successfully: $OUTPUT_SBS"
  exit 0
fi
