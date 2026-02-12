import { Cell, FileInput, Snackbar, Text } from '@telegram-apps/telegram-ui';
import { type ChangeEvent, useContext, useState } from 'react';
import type { QuizQuestionFile } from '../../../App.context';
import { QuestionContext } from '../Question.context';

const label = {
  single: {
    all: "Загрузите файл",
    image: "Загрузите изображение",
    video: "Загрузите видео",
    docs: "Загрузите документ",
  },
  many: {
    all: "Загрузите файлы",
    image: "Загрузите изображения",
    video: "Загрузите видео",
    docs: "Загрузите документы",
  },
};

const maxFileSize = 20 * 1024 * 1024;

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(0)} MB`;
}

const allowedMimeTypes = {
  all: null, // разрешены все типы
  image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
  docs: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

export const FileQuestion = () => {
  const { questions, current, sendAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionFile;
  const type = question.content.type;

  const [files, setFiles] = useState<FileList | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function fileCheck(file: File, e: ChangeEvent<HTMLInputElement>) {
    if (file.size > maxFileSize) {
      setError(
        `Файл "${file.name}" слишком большой (${formatFileSize(file.size)}). Максимальный размер: ${formatFileSize(maxFileSize)}`,
      );
      e.target.value = ""; // Сбросить выбор файла
      return;
    }

    // Проверка типа файла
    const allowedTypes = allowedMimeTypes[type];
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      setError(
        `Файл "${file.name}" имеет недопустимый тип (${file.type}). Пожалуйста, выберите файл правильного типа.`,
      );
      e.target.value = ""; // Сбросить выбор файла
      return;
    }
  }

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (question?.content?.manyFiles === true) {
      if (files.length > 10) {
        setError("Кол-во файлов не должно быть больше 10 штук");
      }
      for (const file of files) {
        fileCheck(file, e);
      }
    } else {
      const file = files[0];
      fileCheck(file, e);
    }

    // Все проверки пройдены
    setError(null);
    setUploading(true);
    setFiles(files);

    try {
      sendAnswer({
        question_uid: question.uid,
        answer: question.content?.manyFiles === true ? files : files[0],
      });
    } catch (err) {
      console.error("Failed to upload file:", err);
      setError(
        `Ошибка при загрузке файла: ${err instanceof Error ? err.message : "Неизвестная ошибка"}`,
      );
      e.target.value = ""; // Сбросить выбор файла
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="files__container">
      <div className="files__size">
        <Text>{formatFileSize(maxFileSize)}</Text>
      </div>
      <FileInput
        multiple={question?.content?.manyFiles}
        onChange={handleChange}
        label={question?.content?.manyFiles ? label.many[type] : label.single[type]}
        disabled={uploading}
      >
        {files &&
          Array.from(files).map((file) => (
            <Cell key={file.name} subtitle={`${file.size} bytes`}>
              {file.name}
            </Cell>
          ))}
      </FileInput>
      {uploading ? <Text>Загрузка файла...</Text> : null}
      {error ? (
        <Snackbar onClose={() => setError(null)}>
          <Text>{error}</Text>
        </Snackbar>
      ) : null}
    </div>
  );
};
