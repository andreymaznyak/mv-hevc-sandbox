#!/bin/bash

# Проверка наличия аргументов
if [ "$1" == "--help" ] || [ -z "$1" ] || [ -z "$2" ]; then
  echo "Использование: $0 <путь_к_входному_MVHEVC> <путь_к_выходному_SBS>"
  echo "Пример: $0 /input/spatial_video.mov /output/output_sbs.mp4"
  exit 1
fi

INPUT_MVHEVC="$1"
OUTPUT_SBS="$2"

# Проверка существования входного файла
if [ ! -f "$INPUT_MVHEVC" ]; then
    echo "Ошибка: Входной файл не найден: $INPUT_MVHEVC"
    exit 1
fi

# Проверка возможности записи в директорию выходного файла
OUTPUT_DIR=$(dirname "$OUTPUT_SBS")
if [ ! -w "$OUTPUT_DIR" ]; then
    echo "Ошибка: Нет прав на запись в директорию: $OUTPUT_DIR"
    # Попробуем создать директорию, если ее нет
    mkdir -p "$OUTPUT_DIR"
    if [ ! -w "$OUTPUT_DIR" ]; then
        echo "Ошибка: Не удалось создать или получить права на запись в директорию: $OUTPUT_DIR"
        exit 1
    fi
fi

echo "Начало транскодирования:"
echo "  Вход: $INPUT_MVHEVC"
echo "  Выход: $OUTPUT_SBS"

# Команда FFmpeg для транскодирования MV-HEVC в SBS H.264
ffmpeg -i "$INPUT_MVHEVC" \
       -filter_complex "[0:v:view:0][0:v:view:1]hstack" \
       -c:v libx264 \
       -b:v 5M \
       -c:a copy \
       -y \
       "$OUTPUT_SBS"

# Проверка статуса завершения FFmpeg
if [ $? -ne 0 ]; then
  echo "Ошибка: FFmpeg завершился с ошибкой."
  exit 1
else
  echo "Транскодирование успешно завершено: $OUTPUT_SBS"
  exit 0
fi
