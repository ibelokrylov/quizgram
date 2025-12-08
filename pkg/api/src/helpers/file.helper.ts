// Helper для валидации файлов
// Аналог file.helper.go из Go API

export enum FileType {
  Image = "image",
  Video = "video",
  Document = "document",
  Unknown = "unknown",
}

// Максимальные размеры файлов в байтах
export const MaxImageSize = 5 * 1024 * 1024; // 5 MB
export const MaxVideoSize = 150 * 1024 * 1024; // 150 MB
export const MaxDocumentSize = 100 * 1024 * 1024; // 100 MB

/**
 * Проверка типа и размера файла
 * Возвращает тип файла и ошибку, если файл не соответствует требованиям
 */
export function validateFileTypeAndSize(
  contentType: string,
  fileSize: number,
): { fileType: FileType; error: null } | { fileType: FileType.Unknown; error: Error } {
  if (!contentType) {
    return {
      fileType: FileType.Unknown,
      error: new Error("content type is required"),
    };
  }

  // Парсим MIME тип
  const parts = contentType.split("/");
  if (parts.length !== 2) {
    return {
      fileType: FileType.Unknown,
      error: new Error("invalid content type format"),
    };
  }

  const mediaType = parts[0];
  const subType = parts[1];

  let fileType: FileType;
  let maxSize: number;

  // Проверяем изображения
  if (mediaType === "image") {
    fileType = FileType.Image;
    maxSize = MaxImageSize;
  } else if (mediaType === "video") {
    // Проверяем видео
    fileType = FileType.Video;
    maxSize = MaxVideoSize;
  } else if (mediaType === "application" || mediaType === "text") {
    // Проверяем документы
    // Разрешаем PDF, Office документы, текстовые файлы
    const allowedDocumentSubtypes = [
      "pdf",
      "msword",
      "vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "vnd.ms-excel", // .xls
      "vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "vnd.ms-powerpoint", // .ppt
      "vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "rtf",
      "zip",
      "x-zip-compressed",
      "vnd.rar",
      "x-rar-compressed",
    ];

    // Проверяем, является ли это разрешенным типом документа
    let isAllowed = false;
    for (const allowed of allowedDocumentSubtypes) {
      if (subType.includes(allowed)) {
        isAllowed = true;
        break;
      }
    }

    // Также разрешаем все text/* типы
    if (mediaType === "text") {
      isAllowed = true;
    }

    if (!isAllowed) {
      return {
        fileType: FileType.Unknown,
        error: new Error("file type not supported"),
      };
    }

    fileType = FileType.Document;
    maxSize = MaxDocumentSize;
  } else {
    return {
      fileType: FileType.Unknown,
      error: new Error("file type not supported"),
    };
  }

  // Проверяем размер файла
  if (fileSize > maxSize) {
    let sizeLimit: string;
    switch (fileType) {
      case FileType.Image:
        sizeLimit = "5MB";
        break;
      case FileType.Video:
        sizeLimit = "150MB";
        break;
      case FileType.Document:
        sizeLimit = "100MB";
        break;
      default:
        sizeLimit = "unknown";
    }
    return {
      fileType: FileType.Unknown,
      error: new Error(`file size exceeds maximum limit of ${sizeLimit}`),
    };
  }

  return { fileType, error: null };
}
