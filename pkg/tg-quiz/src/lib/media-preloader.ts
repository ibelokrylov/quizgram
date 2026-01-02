import type { Quiz } from "../App.context";

/**
 * Предзагружает все изображения из квиза для улучшения UX
 */
export async function preloadQuizMedia(quiz: Quiz): Promise<void> {
  const imageUrls: string[] = [];

  // Собираем все URL изображений из квиза
  
  // 1. Логотип стартовой страницы
  if (quiz.startPage?.logo) {
    imageUrls.push(quiz.startPage.logo);
  }

  // 2. Изображения из вопросов
  if (quiz.question && Array.isArray(quiz.question)) {
    for (const question of quiz.question) {
      // Изображения из вариантов ответов
      if (question.content?.variants && Array.isArray(question.content.variants)) {
        for (const variant of question.content.variants) {
          if (variant.url) {
            imageUrls.push(variant.url);
          }
        }
      }

      // Изображение из страницы (page type)
      if (question.content?.url) {
        imageUrls.push(question.content.url);
      }

      // Изображения из вложенных вопросов (question_group)
      if (question.content?.questions && Array.isArray(question.content.questions)) {
        for (const subQuestion of question.content.questions) {
          if (subQuestion.content?.variants && Array.isArray(subQuestion.content.variants)) {
            for (const variant of subQuestion.content.variants) {
              if (variant.url) {
                imageUrls.push(variant.url);
              }
            }
          }
          if (subQuestion.content?.url) {
            imageUrls.push(subQuestion.content.url);
          }
        }
      }
    }
  }

  // 3. Изображение страницы благодарности
  if (quiz.thxPage?.url) {
    imageUrls.push(quiz.thxPage.url);
  }

  // Убираем дубликаты
  const uniqueUrls = [...new Set(imageUrls)];

  // Предзагружаем изображения асинхронно
  const promises = uniqueUrls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`Не удалось предзагрузить изображение: ${url}`);
        resolve(); // Не блокируем на ошибках
      };
      img.src = url;
    });
  });

  await Promise.all(promises);
  console.log(`Предзагружено ${uniqueUrls.length} изображений`);
}

