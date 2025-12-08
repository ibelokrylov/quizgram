// Сервис для работы с S3 (AWS S3 и S3-совместимые хранилища)
// Аналог S3Service из Go API

import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../lib/logger";

const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_URL = process.env.S3_URL; // Базовый URL для S3-совместимого хранилища

export interface UploadResult {
  fileName: string;
  fileURL: string;
  fileKey: string;
}

let s3Client: S3Client | null = null;

/**
 * Инициализация S3 клиента
 */
function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  if (!S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "S3 credentials are not set in environment variables (S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY)",
    );
  }

  if (!S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME is not set in environment variables");
  }

  const clientConfig: any = {
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  };

  // Если указан S3_URL, настраиваем кастомный endpoint (для S3-совместимых хранилищ)
  if (S3_URL) {
    clientConfig.endpoint = S3_URL;
    clientConfig.forcePathStyle = true; // Используем path-style адресацию
  }

  s3Client = new S3Client(clientConfig);
  logger.info("S3 сервис инициализирован успешно", {
    region: S3_REGION,
    bucket: S3_BUCKET_NAME,
    endpoint: S3_URL || "default",
  });
  return s3Client;
}

/**
 * Получение имени бакета
 */
function getBucket(): string {
  if (!S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME is not set in environment variables");
  }
  return S3_BUCKET_NAME;
}

/**
 * Формирование URL файла
 */
function buildFileURL(fileKey: string): string {
  const bucket = getBucket();
  if (S3_URL) {
    // Для S3-совместимых хранилищ используем path-style URL
    return `${S3_URL}/${bucket}/${fileKey}`;
  } else {
    // Для AWS S3 используем стандартный URL
    return `https://${bucket}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
  }
}

export abstract class S3Service {
  /**
   * Загрузка файла в S3
   * @param file - поток данных файла, Buffer, Uint8Array или Blob
   * @param originalFileName - оригинальное имя файла
   * @param folder - папка в бакете (опционально)
   * @returns Результат загрузки с именем файла, ключом и URL
   */
  static async uploadFile(
    file: ReadableStream | Buffer | Uint8Array | Blob | any,
    originalFileName: string,
    folder?: string,
  ): Promise<UploadResult> {
    const client = getS3Client();
    const bucket = getBucket();

    // Генерируем уникальное имя файла
    const ext = originalFileName.includes(".")
      ? originalFileName.substring(originalFileName.lastIndexOf("."))
      : "";
    const fileName = `${crypto.randomUUID()}${ext}`;

    // Формируем ключ файла (путь в бакете)
    const fileKey = folder ? `${folder}/${fileName}` : fileName;

    try {
      // Используем Upload для поддержки больших файлов и автоматической multipart загрузки
      // Upload автоматически обрабатывает разные типы входных данных
      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: fileKey,
          Body: file,
        },
      });

      await upload.done();

      // Формируем URL файла
      const fileURL = buildFileURL(fileKey);

      logger.info("Файл успешно загружен в S3", {
        bucket,
        fileKey,
        fileURL,
        originalFileName,
      });

      return {
        fileName,
        fileKey,
        fileURL,
      };
    } catch (error) {
      logger.error(
        "Ошибка при загрузке файла в S3",
        error instanceof Error ? error : new Error(String(error)),
        { bucket, fileKey, originalFileName },
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to upload file to S3: ${errorMessage}`);
    }
  }

  /**
   * Получение файла из S3
   * @param fileKey - ключ файла в бакете
   * @returns Содержимое файла в виде Buffer
   */
  static async getFile(fileKey: string): Promise<Buffer> {
    const client = getS3Client();
    const bucket = getBucket();

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      });

      const response = await client.send(command);

      if (!response.Body) {
        throw new Error("File body is empty");
      }

      // Преобразуем поток в Buffer
      const chunks: Uint8Array[] = [];
      
      // response.Body может быть ReadableStream или другим типом
      if (response.Body instanceof ReadableStream) {
        const reader = response.Body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } else {
        // Для других типов (например, в Node.js это может быть Readable)
        const stream = response.Body as any;
        if (stream[Symbol.asyncIterator]) {
          for await (const chunk of stream) {
            chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
          }
        } else {
          // Fallback: пытаемся преобразовать в Buffer напрямую
          const arrayBuffer = await stream.arrayBuffer();
          chunks.push(new Uint8Array(arrayBuffer));
        }
      }

      const buffer = Buffer.concat(chunks);

      logger.info("Файл успешно загружен из S3", {
        bucket,
        fileKey,
      });

      return buffer;
    } catch (error) {
      logger.error(
        "Ошибка при загрузке файла из S3",
        error instanceof Error ? error : new Error(String(error)),
        { bucket, fileKey },
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to download file from S3: ${errorMessage}`);
    }
  }

  /**
   * Генерация временной ссылки для доступа к файлу (presigned URL)
   * @param fileKey - ключ файла в бакете
   * @param expirationSeconds - время жизни ссылки в секундах (по умолчанию 3600 = 1 час)
   * Максимальное время жизни presigned URL в S3 - 7 дней (604800 секунд)
   * @returns Presigned URL
   */
  static async getPresignedURL(
    fileKey: string,
    expirationSeconds: number = 3600,
  ): Promise<string> {
    const client = getS3Client();
    const bucket = getBucket();

    // Максимальное время жизни presigned URL в S3 - 7 дней
    const maxExpiration = 7 * 24 * 60 * 60; // 604800 секунд
    const expiration = Math.min(expirationSeconds, maxExpiration);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      });

      const url = await getSignedUrl(client, command, {
        expiresIn: expiration,
      });

      logger.info("Presigned URL успешно сгенерирован", {
        bucket,
        fileKey,
        expiration,
      });

      return url;
    } catch (error) {
      logger.error(
        "Ошибка при генерации presigned URL",
        error instanceof Error ? error : new Error(String(error)),
        { bucket, fileKey },
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate presigned URL: ${errorMessage}`);
    }
  }

  /**
   * Удаление файла из S3
   * @param fileKey - ключ файла в бакете
   */
  static async deleteFile(fileKey: string): Promise<void> {
    const client = getS3Client();
    const bucket = getBucket();

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      });

      await client.send(command);

      logger.info("Файл успешно удален из S3", {
        bucket,
        fileKey,
      });
    } catch (error) {
      logger.error(
        "Ошибка при удалении файла из S3",
        error instanceof Error ? error : new Error(String(error)),
        { bucket, fileKey },
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to delete file from S3: ${errorMessage}`);
    }
  }
}
