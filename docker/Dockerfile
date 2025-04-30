# Использовать актуальный образ Ubuntu LTS
FROM ubuntu:22.04

# Установить переменные окружения для неинтерактивной установки
ENV DEBIAN_FRONTEND=noninteractive

# Обновить список пакетов и установить базовые зависимости и ПО
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

# --- Установка FFmpeg 7.1+ из исходников ---
# Создать рабочую директорию
WORKDIR /ffmpeg_sources

# Клонировать репозиторий FFmpeg (указываем ветку релиза n7.1)
RUN git clone --depth 1 --branch n7.1 https://git.ffmpeg.org/ffmpeg.git ffmpeg

# Сконфигурировать и собрать FFmpeg
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

# Очистить исходники для уменьшения размера образа
WORKDIR /
RUN rm -rf /ffmpeg_sources

# --- Настройка скрипта транскодирования ---
# Создать директорию для приложения
WORKDIR /app

# Скопировать скрипт транскодирования в образ
COPY transcode.sh /app/transcode.sh

# Сделать скрипт исполняемым
RUN chmod +x /app/transcode.sh

# Установить точку входа для контейнера
ENTRYPOINT ["/app/transcode.sh"]

# Установить команду по умолчанию (можно переопределить при запуске)
CMD ["--help"]
