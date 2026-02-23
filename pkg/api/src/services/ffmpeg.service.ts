// Сервис для обработки изображений с помощью FFmpeg
// Изменяет размер изображений до указанных параметров

import { unlink } from 'fs/promises';
import { logger } from '../lib/logger';

export interface ResizeOptions {
  width: number;
  height: number;
}

export abstract class FFmpegService {
  /**
   * Изменяет размер изображения до указанных параметров
   * @param image - изображение в виде Buffer, Blob, File или путь к файлу
   * @param options - параметры изменения размера (width, height)
   * @returns Обработанное изображение в виде Buffer
   */
  static async resizeImage(
    image: Buffer | Blob | File | string,
    options: ResizeOptions
  ): Promise<Buffer> {
    const { width, height } = options;

    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive numbers');
    }

    try {
      // Конвертируем входные данные в Buffer
      let inputBuffer: Buffer;
      if (typeof image === 'string') {
        // Если это путь к файлу, читаем его
        inputBuffer = await Bun.file(image)
          .arrayBuffer()
          .then((ab) => Buffer.from(ab));
      } else if (image instanceof Blob || image instanceof File) {
        inputBuffer = Buffer.from(await image.arrayBuffer());
      } else {
        inputBuffer = image;
      }

      // Определяем расширение исходного файла для сохранения формата
      let fileExtension = 'png'; // По умолчанию PNG для максимального качества
      if (typeof image === 'string') {
        const ext = image.split('.').pop()?.toLowerCase();
        if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
          fileExtension = ext === 'jpeg' ? 'jpg' : ext;
        }
      } else if (image instanceof Blob || image instanceof File) {
        // Определяем формат из MIME типа
        const mimeType = image.type.toLowerCase();
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          fileExtension = 'jpg';
        } else if (mimeType.includes('png')) {
          fileExtension = 'png';
        } else if (mimeType.includes('webp')) {
          fileExtension = 'webp';
        } else if (mimeType.includes('gif')) {
          fileExtension = 'gif';
        }
      }

      // Создаём временный файл для входного изображения
      const inputTempFile = `/tmp/ffmpeg-input-${crypto.randomUUID()}`;
      await Bun.write(inputTempFile, inputBuffer);

      // Создаём временный файл для выходного изображения
      const outputTempFile = `/tmp/ffmpeg-output-${crypto.randomUUID()}.${fileExtension}`;

      try {
        // Формируем параметры команды для максимального качества
        const ffmpegArgs = [
          'ffmpeg',
          '-i',
          inputTempFile,
          '-vf',
          `scale=${width}:${height}:flags=lanczos`, // lanczos - высококачественный алгоритм масштабирования
          '-sws_flags',
          'lanczos', // Дополнительная настройка для качества
        ];

        // Добавляем параметры качества в зависимости от формата
        if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
          ffmpegArgs.push(
            '-q:v',
            '2' // Высокое качество JPEG (1-31, где 1 - наилучшее качество)
          );
        } else if (fileExtension === 'png') {
          ffmpegArgs.push(
            '-compression_level',
            '1' // Минимальное сжатие PNG для максимального качества
          );
        } else if (fileExtension === 'webp') {
          ffmpegArgs.push(
            '-quality',
            '100' // Максимальное качество WebP (0-100)
          );
        }

        ffmpegArgs.push(
          '-y', // Перезаписывать выходной файл, если он существует
          outputTempFile
        );

        // Выполняем команду ffmpeg для изменения размера
        const process = Bun.spawn(ffmpegArgs, {
          stdout: 'pipe',
          stderr: 'pipe',
        });

        const exitCode = await process.exited;

        if (exitCode !== 0) {
          const errorOutput = await new Response(process.stderr).text();
          throw new Error(`FFmpeg failed with exit code ${exitCode}: ${errorOutput}`);
        }

        // Читаем обработанное изображение
        const outputFile = Bun.file(outputTempFile);
        const outputBuffer = Buffer.from(await outputFile.arrayBuffer());

        logger.info('Изображение успешно обработано', {
          width,
          height,
          inputSize: inputBuffer.length,
          outputSize: outputBuffer.length,
        });

        return outputBuffer;
      } finally {
        // Удаляем временные файлы
        try {
          await unlink(inputTempFile);
        } catch (error) {
          logger.warn('Не удалось удалить временный входной файл', {
            file: inputTempFile,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        try {
          await unlink(outputTempFile);
        } catch (error) {
          logger.warn('Не удалось удалить временный выходной файл', {
            file: outputTempFile,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.error(
        'Ошибка при изменении размера изображения',
        error instanceof Error ? error : new Error(String(error)),
        { width, height }
      );
      throw error;
    }
  }
}
