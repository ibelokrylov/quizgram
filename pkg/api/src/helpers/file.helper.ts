// Helper для валидации файлов
// Аналог file.helper.go из Go API

export enum FileType {
  Image = 'image',
  Video = 'video',
  Document = 'document',
  Unknown = 'unknown',
  All = 'all',
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
  fileSize: number
): { fileType: FileType; error: null } | { fileType: FileType.Unknown; error: Error } {
  if (!contentType) {
    return {
      fileType: FileType.Unknown,
      error: new Error('content type is required'),
    };
  }

  // Парсим MIME тип
  const parts = contentType.split('/');
  if (parts.length !== 2) {
    return {
      fileType: FileType.Unknown,
      error: new Error('invalid content type format'),
    };
  }

  const mediaType = parts[0];
  const subType = parts[1];

  let fileType: FileType;
  let maxSize: number;

  // Проверяем изображения
  if (mediaType === 'image') {
    fileType = FileType.Image;
    maxSize = MaxImageSize;
  } else if (mediaType === 'video') {
    // Проверяем видео
    fileType = FileType.Video;
    maxSize = MaxVideoSize;
  } else if (mediaType === 'application' || mediaType === 'text') {
    // Проверяем документы
    // Разрешаем PDF, Office документы, текстовые файлы
    const allowedDocumentSubtypes = [
      'pdf',
      'msword',
      'vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'vnd.ms-excel', // .xls
      'vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'vnd.ms-powerpoint', // .ppt
      'vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'rtf',
      'zip',
      'x-zip-compressed',
      'vnd.rar',
      'x-rar-compressed',
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
    if (mediaType === 'text') {
      isAllowed = true;
    }

    if (!isAllowed) {
      return {
        fileType: FileType.Unknown,
        error: new Error('file type not supported'),
      };
    }

    fileType = FileType.Document;
    maxSize = MaxDocumentSize;
  } else {
    return {
      fileType: FileType.Unknown,
      error: new Error('file type not supported'),
    };
  }

  // Проверяем размер файла
  if (fileSize > maxSize) {
    let sizeLimit: string;
    switch (fileType) {
      case FileType.Image:
        sizeLimit = '5MB';
        break;
      case FileType.Video:
        sizeLimit = '150MB';
        break;
      case FileType.Document:
        sizeLimit = '100MB';
        break;
      default:
        sizeLimit = 'unknown';
    }
    return {
      fileType: FileType.Unknown,
      error: new Error(`file size exceeds maximum limit of ${sizeLimit}`),
    };
  }

  return { fileType, error: null };
}

const mimeType = {
  image: new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/svg+xml',
    'image/tiff',
    'image/bmp',
    'image/x-icon',
  ]),

  video: new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/mpeg',
    'video/3gpp',
    'video/3gpp2',
    'video/ogg',
  ]),
  docs: new Set([
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'application/rtf',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word.document.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    'application/vnd.ms-word.template.macroEnabled.12',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    'application/vnd.ms-excel.template.macroEnabled.12',
    'application/vnd.ms-excel.addin.macroEnabled.12',
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.template',
    'application/vnd.ms-powerpoint.template.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
    'application/vnd.ms-powerpoint.addin.macroEnabled.12',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
  ]),
};

const maxSizePublic = 20 * 1024 * 1024;

export function validatePublicFileTypeAndSize(
  contentType: string,
  fileSize: number,
  typeFile: 'all' | 'image' | 'docs' | 'video'
): { fileType: FileType; error: null } | { fileType: FileType.Unknown; error: Error } {
  if (typeFile !== 'all' && !contentType) {
    return {
      fileType: FileType.Unknown,
      error: new Error('content type is required'),
    };
  }

  if (fileSize > maxSizePublic)
    return {
      fileType: FileType.Unknown,
      error: new Error('Max file size 20mb'),
    };

  if (typeFile === 'all') return { fileType: FileType.Document, error: null };

  const parsedType = contentType.split(';')[0];

  if (!mimeType[typeFile].has(parsedType))
    return {
      fileType: FileType.Unknown,
      error: new Error('Filetype not supported'),
    };

  return { fileType: FileType.All, error: null };
}
