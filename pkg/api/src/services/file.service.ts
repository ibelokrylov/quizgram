// Сервис для работы с файлами пользователей
// Обрабатывает валидацию, загрузку в S3 и сохранение в БД

import { eq } from "drizzle-orm";
import { db, userFileTable, type NewUserFile } from "../db";
import { FileType, validateFileTypeAndSize } from "../helpers/file.helper";
import { logger } from "../lib/logger";
import { S3Service, type UploadResult } from "./s3.service";

export abstract class FileService {
  /**
   * Определение папки в S3 в зависимости от типа файла
   */
  private static getFolderByFileType(fileType: FileType): string {
    switch (fileType) {
      case FileType.Image:
        return "images";
      case FileType.Video:
        return "videos";
      case FileType.Document:
        return "documents";
      default:
        return "files";
    }
  }

  /**
   * Загрузка файла: валидация, определение папки и загрузка в S3
   * @param file - файл (Blob, File или Buffer)
   * @param contentType - MIME тип файла
   * @param fileName - оригинальное имя файла
   * @param fileSize - размер файла в байтах
   * @param userId - ID пользователя
   * @returns Результат загрузки
   */
  static async uploadFile(
    file: Blob | File | Buffer | Uint8Array | any,
    contentType: string,
    fileName: string,
    fileSize: number,
    userId: number,
  ): Promise<UploadResult> {
    // Проверяем тип и размер файла
    const validation = validateFileTypeAndSize(contentType, fileSize);
    if (validation.error) {
      logger.error(
        "Ошибка валидации файла",
        validation.error,
        { fileName, contentType, fileSize },
      );
      throw new Error(`file validation failed: ${validation.error.message}`);
    }

    // Определяем папку в зависимости от типа файла
    const folder = this.getFolderByFileType(validation.fileType);

    // Загружаем файл в S3
    let uploadResult: UploadResult;
    try {
      uploadResult = await S3Service.uploadFile(file, fileName, folder);
    } catch (error) {
      logger.error(
        "Ошибка при загрузке файла в S3",
        error instanceof Error ? error : new Error(String(error)),
        { fileName, folder },
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`failed to upload file: ${errorMessage}`);
    }

    logger.info("Файл успешно загружен", {
      fileName,
      fileKey: uploadResult.fileKey,
      fileURL: uploadResult.fileURL,
      folder,
      userId,
    });

    // Сохраняем информацию о файле в БД
    try {
      const newFile: NewUserFile = {
        uid: crypto.randomUUID(),
        userId,
        fileName: fileName,
        fileKey: uploadResult.fileKey,
        fileUrl: uploadResult.fileURL,
      };

      await db.insert(userFileTable).values(newFile);
    } catch (error) {
      // Если не удалось сохранить в БД, удаляем файл из S3
      try {
        await S3Service.deleteFile(uploadResult.fileKey);
      } catch (deleteError) {
        logger.error(
          "Ошибка при удалении файла из S3 после ошибки БД",
          deleteError instanceof Error ? deleteError : new Error(String(deleteError)),
          { fileKey: uploadResult.fileKey },
        );
      }
      throw error;
    }

    return uploadResult;
  }

  /**
   * Удаление файла: удаление из БД и S3
   * @param fileURL - URL файла
   * @param userId - ID пользователя
   */
  static async deleteFile(fileURL: string, userId: number): Promise<void> {
    // Находим файл в БД
    const files = await db
      .select()
      .from(userFileTable)
      .where(eq(userFileTable.fileUrl, fileURL))
      .limit(1);

    const file = files[0];
    if (!file || file.userId !== userId) {
      throw new Error("File not found or access denied");
    }

    // Удаляем из БД
    await db.delete(userFileTable).where(eq(userFileTable.id, file.id));

    // Удаляем из S3
    try {
      await S3Service.deleteFile(file.fileKey);
    } catch (error) {
      logger.error(
        "Ошибка при удалении файла из S3",
        error instanceof Error ? error : new Error(String(error)),
        { fileKey: file.fileKey, userId },
      );
      // Не прерываем процесс, если не удалось удалить из S3
      // Файл уже удален из БД
    }
  }
}
