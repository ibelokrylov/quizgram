import { FileInput, Snackbar, Text } from '@telegram-apps/telegram-ui';
import { useContext, useState } from 'react';
import type { QuizQuestionFile } from '../../../App.context';
import { QuestionContext } from '../Question.context';

const label = {
  all: 'Загрузите файл',
  image: 'Загрузите изображение',
  video: 'Загрузите видео',
  docs: 'Загрузите документ',
};

const maxFileSize = 20 * 1024 * 1024;

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(0)} MB`;
}

const allowedMimeTypes = {
  all: null, // разрешены все типы
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  docs: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

export const FileQuestion = () => {
  const { questions, current, sendAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionFile;
  const type = question.content.type;

  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Проверка размера файла
    if (file.size > maxFileSize) {
      setError(`Файл "${file.name}" слишком большой (${formatFileSize(file.size)}). Максимальный размер: ${formatFileSize(maxFileSize)}`);
      e.target.value = ''; // Сбросить выбор файла
      return;
    }

    // Проверка типа файла
    const allowedTypes = allowedMimeTypes[type];
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      setError(`Файл "${file.name}" имеет недопустимый тип (${file.type}). Пожалуйста, выберите файл правильного типа.`);
      e.target.value = ''; // Сбросить выбор файла
      return;
    }

    // Все проверки пройдены
    setError(null);
    sendAnswer({
      question_uid: question.uid,
      answer: file,
      question: question,
    });
  }
  return (
    <div className='files__container'>
      <div className='files__size'>
        <Text>{formatFileSize(maxFileSize)}</Text>
      </div>
      <FileInput
        onChange={handleChange}
        label={label[type]}
      />
      {error ? <Snackbar onClose={() => setError(null)}>{error}</Snackbar> : null}
    </div>
  );
};
