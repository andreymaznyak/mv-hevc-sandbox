# Use latest Ubuntu LTS image
FROM ubuntu:22.04

# Set environment variables for non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package list and install base dependencies and software
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libass-dev \
    libfreetype6-dev \
    libgnutls28-dev \
    libmp3lame-dev \
    libsdl2-dev \
    libtool \
    libva-dev \
    libvdpau-dev \
    libvorbis-dev \
    libxcb1-dev \
    libxcb-shm0-dev \
    libxcb-xfixes0-dev \
    meson \
    ninja-build \
    pkg-config \
    texinfo \
    wget \
    yasm \
    zlib1g-dev \
    software-properties-common \
    libx264-dev \
    nasm \
    && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# --- Install FFmpeg 7.1+ from source ---
# Create working directory
WORKDIR /ffmpeg_sources

# Clone FFmpeg repository (specify release branch n7.1)
RUN git clone --depth 1 --branch n7.1 https://git.ffmpeg.org/ffmpeg.git ffmpeg

# Configure and build FFmpeg
WORKDIR /ffmpeg_sources/ffmpeg
RUN ./configure \
    --enable-gpl \
    --enable-libass \
    --enable-libfreetype \
    --enable-libmp3lame \
    --enable-libvorbis \
    --enable-libx264 \
    --enable-nonfree \
    --extra-ldflags="-Wl,--allow-shlib-undefined" \
    && \
    make -j$(nproc) && \
    make install && \
    ldconfig

# Clean up source files to reduce image size
WORKDIR /
RUN rm -rf /ffmpeg_sources

# --- Setup transcoding script ---
# Create application directory
WORKDIR /app

# Copy transcoding script to image
COPY transcode.sh /app/transcode.sh

# Make script executable
RUN chmod +x /app/transcode.sh

# Set container entrypoint
ENTRYPOINT ["/app/transcode.sh"]

# Set default command (can be overridden at runtime)
CMD ["--help"]
