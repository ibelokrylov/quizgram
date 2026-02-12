import type {
  Quiz,
  QuizStartPageStandard,
  QuizQuestionVariantImage,
  QuizQuestionVariantImageText,
  QuizQuestionPage,
  QuizQuestionGroup,
} from '../App.context';

/**
 * Предзагружает все изображения из квиза для улучшения UX
 */
export async function preloadQuizMedia(quiz: Quiz): Promise<void> {
  const imageUrls: string[] = [];

  // Собираем все URL изображений из квиза

  // 1. Логотип стартовой страницы
  if (quiz.startPage && typeof quiz.startPage === 'object' && 'content' in quiz.startPage) {
    const startPage = quiz.startPage as QuizStartPageStandard;
    if (startPage.content?.logo_url) {
      imageUrls.push(startPage.content.logo_url);
    }
  }

  // 2. Изображения из вопросов
  if (quiz.question && Array.isArray(quiz.question)) {
    for (const question of quiz.question) {
      // Изображения из вариантов ответов (variant_image и variant_image_text)
      if (
        (question.type === 'variant_image' || question.type === 'variant_image_text') &&
        question.content &&
        'variants' in question.content &&
        Array.isArray(question.content.variants)
      ) {
        const variantQuestion = question as QuizQuestionVariantImage | QuizQuestionVariantImageText;
        for (const variant of variantQuestion.content.variants) {
          if (variant.url) {
            imageUrls.push(variant.url);
          }
        }
      }

      // Изображение из страницы (page type)
      if (
        question.type === 'page' &&
        question.content &&
        'url' in question.content &&
        question.content.url
      ) {
        const pageQuestion = question as QuizQuestionPage;
        if (pageQuestion.content?.url) {
          imageUrls.push(pageQuestion.content.url);
        }
      }

      // Изображения из вложенных вопросов (question_group)
      if (question.type === 'question_group' && 'questions' in question.content) {
        const groupQuestion = question as QuizQuestionGroup;
        if (Array.isArray(groupQuestion.content.questions)) {
          for (const subQuestion of groupQuestion.content.questions) {
            // Изображения из вариантов ответов вложенных вопросов
            if (
              (subQuestion.type === 'variant_image' || subQuestion.type === 'variant_image_text') &&
              subQuestion.content &&
              'variants' in subQuestion.content &&
              Array.isArray(subQuestion.content.variants)
            ) {
              const variantSubQuestion = subQuestion as
                | QuizQuestionVariantImage
                | QuizQuestionVariantImageText;
              for (const variant of variantSubQuestion.content.variants) {
                if (variant.url) {
                  imageUrls.push(variant.url);
                }
              }
            }
            // Изображение из страницы вложенных вопросов
            if (
              subQuestion.type === 'page' &&
              subQuestion.content &&
              'url' in subQuestion.content &&
              subQuestion.content.url
            ) {
              const pageSubQuestion = subQuestion as QuizQuestionPage;
              if (pageSubQuestion.content?.url) {
                imageUrls.push(pageSubQuestion.content.url);
              }
            }
          }
        }
      }
    }
  }

  // 3. Изображение страницы благодарности
  // QuizThxPage не имеет поля url, пропускаем

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
