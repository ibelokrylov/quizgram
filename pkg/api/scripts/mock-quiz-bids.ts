// Скрипт для генерации тестовых данных в таблице quiz_bid
// Использование: bun run scripts/mock-quiz-bids.ts --isFull 30 --isEmpty 40 --repeated 50 --quiz-uid acc55c8c-4d20-4f22-bd7c-94f06aa9aaaf

import { and, asc, eq, sql } from 'drizzle-orm';
import {
  db,
  quizBidTable,
  quizContactTable,
  quizOpenTable,
  quizQuestionTable,
  quizTable,
  userPaymentTable,
} from '../src/db';
import { logger } from '../src/lib/logger';

interface Args {
  isFull?: number;
  isEmpty?: number;
  repeated?: number;
  quizUid?: string;
}

// Парсинг аргументов командной строки
function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--isFull' && i + 1 < argv.length) {
      args.isFull = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === '--isEmpty' && i + 1 < argv.length) {
      args.isEmpty = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === '--repeated' && i + 1 < argv.length) {
      args.repeated = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === '--quiz-uid' && i + 1 < argv.length) {
      args.quizUid = argv[i + 1];
      i++;
    }
  }

  return args;
}

// Генерация случайного UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Генерация ответа на вопрос в зависимости от типа
function generateAnswerForQuestion(question: any): any {
  const type = question.type;
  const content = question.content || {};

  switch (type) {
    case 'answer_option':
    case 'variant_image':
    case 'variant_image_text':
      // Выбираем случайный вариант
      const variants = content.variants || [];
      if (variants.length > 0) {
        const randomVariant = variants[Math.floor(Math.random() * variants.length)];
        return randomVariant.value || randomVariant.text || randomVariant.uid || 'Вариант 1';
      }
      return 'Вариант 1';

    case 'emoji':
      const emojis = content.emojis || [];
      if (emojis.length > 0) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        return randomEmoji.value || randomEmoji.emoji || '😊';
      }
      return '😊';

    case 'input':
      return `Тестовый ответ на вопрос "${content.title || 'Вопрос'}"`;

    case 'select':
      const options = content.options || [];
      if (options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        return randomOption.value || randomOption.text || options[0];
      }
      return 'Опция 1';

    case 'date':
      // Генерируем случайную дату за последний год
      const now = new Date();
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const randomDate = new Date(
        yearAgo.getTime() + Math.random() * (now.getTime() - yearAgo.getTime())
      );
      return randomDate.toISOString().split('T')[0];

    case 'slide':
      return Math.floor(Math.random() * 100);

    case 'rating':
      const maxRating = content.max || 5;
      return Math.floor(Math.random() * maxRating) + 1;

    case 'file':
      // Для файлов возвращаем объект с URL (симуляция)
      return {
        type: 'file',
        fileName: 'test-file.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
        url: 'https://example.com/test-file.jpg',
        s3Key: 'test/key/test-file.jpg',
      };

    case 'question_group':
      // Для группы вопросов возвращаем массив ответов
      const subQuestions = content.questions || [];
      return subQuestions.map((subQ: any) => ({
        question_uid: subQ.uid || generateUUID(),
        answer: generateAnswerForQuestion(subQ),
        question: subQ,
      }));

    case 'page':
      // Страницы не требуют ответа
      return null;

    default:
      return 'Тестовый ответ';
  }
}

// Генерация ответов на контакты
// Для isFull заполняются только обязательные поля (required: true)
// Для isEmpty можно вернуть null или частичное заполнение
function generateContacts(
  contactsForm: any[] | null,
  isFull: boolean = false
): Record<string, string> | null {
  if (!contactsForm || contactsForm.length === 0) {
    return null;
  }

  const contacts: Record<string, string> = {};

  for (const field of contactsForm) {
    const fieldType = field.type || 'text';
    const fieldName = field.name || field.uid || 'field';
    const isRequired = field.required === true;

    // Для полностью пройденных квизов заполняем только обязательные поля
    // Для неполных можно пропустить
    if (isFull && !isRequired) {
      continue;
    }

    switch (fieldType) {
      case 'name':
        contacts[fieldName] = `Тестовый Пользователь ${Math.floor(Math.random() * 1000)}`;
        break;
      case 'email':
        contacts[fieldName] = `test${Math.floor(Math.random() * 10000)}@example.com`;
        break;
      case 'phone':
        contacts[fieldName] = `+7${Math.floor(9000000000 + Math.random() * 1000000000)}`;
        break;
      case 'text':
        contacts[fieldName] = `Тестовое значение для ${fieldName}`;
        break;
      default:
        contacts[fieldName] = `Тестовое значение для ${fieldName}`;
    }
  }

  // Если для isFull не было обязательных полей, возвращаем null
  // (это нормально, если в форме нет обязательных полей)
  if (isFull && Object.keys(contacts).length === 0) {
    return null;
  }

  return Object.keys(contacts).length > 0 ? contacts : null;
}

// Генерация случайной даты создания (от даты создания квиза до текущего момента)
function generateCreatedAt(quizCreatedAt: Date): Date {
  const now = new Date();
  const timeDiff = now.getTime() - quizCreatedAt.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(quizCreatedAt.getTime() + randomTime);
}

// Генерация даты обновления (не более 5 минут после создания)
function generateUpdatedAt(createdAt: Date): Date {
  const maxMinutes = 5;
  const randomMinutes = Math.random() * maxMinutes;
  return new Date(createdAt.getTime() + randomMinutes * 60 * 1000);
}

// Создание полностью пройденного квиза (isFull)
async function createFullBid(
  quizId: number,
  userId: number,
  questions: any[],
  contactsForm: any[] | null,
  quizCreatedAt: Date
): Promise<void> {
  const key = generateUUID();
  const answers = questions.map((q) => ({
    question_uid: q.uid,
    answer: generateAnswerForQuestion(q),
    question: q,
  }));

  const contacts = generateContacts(contactsForm, true); // Для isFull заполняем только обязательные поля

  // Проверяем и обновляем лимит платежа
  let isEqualPaymentLimit = false;
  try {
    const userPayments = await db
      .select()
      .from(userPaymentTable)
      .where(and(eq(userPaymentTable.userId, userId), eq(userPaymentTable.isActive, true)))
      .limit(1);

    if (userPayments.length > 0 && userPayments[0]) {
      const userPayment = userPayments[0];

      if (userPayment.currentLimit < userPayment.limit) {
        await db
          .update(userPaymentTable)
          .set({
            currentLimit: sql`${userPaymentTable.currentLimit} + 1`,
          })
          .where(eq(userPaymentTable.id, userPayment.id));

        isEqualPaymentLimit = true;

        logger.info('Лимит платежа увеличен при создании тестовой записи', {
          userId,
          userPaymentId: userPayment.id,
          currentLimit: userPayment.currentLimit + 1,
          limit: userPayment.limit,
        });
      }
    }
  } catch (error) {
    logger.error(
      'Ошибка при проверке лимита платежа',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
  }

  const createdAt = generateCreatedAt(quizCreatedAt);
  const updatedAt = generateUpdatedAt(createdAt);

  await db.insert(quizBidTable).values({
    quizId,
    key,
    answer: answers,
    questions: questions,
    contacts: contacts,
    contactsForm: contactsForm,
    first: true,
    status: 'create',
    isFull: true,
    isRead: false,
    isEqualPaymentLimit,
    info: null, // Явно указываем null вместо строки "null"
    initData: null, // Явно указываем null вместо пустой строки
    userInfo: null, // Явно указываем null вместо строки "null"
    ipLocation: null, // Явно указываем null вместо строки "null"
    createdAt,
    updatedAt,
  });

  logger.debug('Создана полностью пройденная запись', { quizId, key, isEqualPaymentLimit });
}

// Создание неполной записи (isEmpty) - вариант 1: не заполнен контакт
async function createEmptyBidNoContacts(
  quizId: number,
  questions: any[],
  contactsForm: any[] | null,
  quizCreatedAt: Date
): Promise<void> {
  const key = generateUUID();
  const answers = questions.map((q) => ({
    question_uid: q.uid,
    answer: generateAnswerForQuestion(q),
    question: q,
  }));

  const createdAt = generateCreatedAt(quizCreatedAt);
  const updatedAt = generateUpdatedAt(createdAt);

  await db.insert(quizBidTable).values({
    quizId,
    key,
    answer: answers,
    questions: questions,
    contacts: null, // Контакты не заполнены
    contactsForm: contactsForm,
    first: true,
    status: 'create',
    isFull: false,
    isRead: false,
    isEqualPaymentLimit: false,
    info: null, // Явно указываем null вместо строки "null"
    initData: null, // Явно указываем null вместо пустой строки
    userInfo: null, // Явно указываем null вместо строки "null"
    ipLocation: null, // Явно указываем null вместо строки "null"
    createdAt,
    updatedAt,
  });

  logger.debug('Создана запись без контактов', { quizId, key });
}

// Создание неполной записи (isEmpty) - вариант 2: заполнен только первый вопрос
async function createEmptyBidOneQuestion(
  quizId: number,
  questions: any[],
  contactsForm: any[] | null,
  quizCreatedAt: Date
): Promise<void> {
  if (questions.length === 0) {
    return;
  }

  const key = generateUUID();
  const firstQuestion = questions[0];
  const answers = [
    {
      question_uid: firstQuestion.uid,
      answer: generateAnswerForQuestion(firstQuestion),
      question: firstQuestion,
    },
  ];

  const createdAt = generateCreatedAt(quizCreatedAt);
  const updatedAt = generateUpdatedAt(createdAt);

  await db.insert(quizBidTable).values({
    quizId,
    key,
    answer: answers,
    questions: questions,
    contacts: null,
    contactsForm: contactsForm,
    first: true,
    status: 'create',
    isFull: false,
    isRead: false,
    isEqualPaymentLimit: false,
    info: null, // Явно указываем null вместо строки "null"
    initData: null, // Явно указываем null вместо пустой строки
    userInfo: null, // Явно указываем null вместо строки "null"
    ipLocation: null, // Явно указываем null вместо строки "null"
    createdAt,
    updatedAt,
  });

  logger.debug('Создана запись с одним вопросом', { quizId, key });
}

// Создание неполной записи (isEmpty) - вариант 3: просто открыл и вышел
async function createEmptyBidMinimal(
  quizId: number,
  questions: any[],
  contactsForm: any[] | null,
  quizCreatedAt: Date
): Promise<void> {
  const key = generateUUID();
  const createdAt = generateCreatedAt(quizCreatedAt);
  const updatedAt = generateUpdatedAt(createdAt);

  await db.insert(quizBidTable).values({
    quizId,
    key,
    answer: [], // Пустой массив ответов
    questions: questions,
    contacts: null,
    contactsForm: contactsForm,
    first: true,
    status: 'create',
    isFull: false,
    isRead: false,
    isEqualPaymentLimit: false,
    info: null, // Явно указываем null вместо строки "null"
    initData: null, // Явно указываем null вместо пустой строки
    userInfo: null, // Явно указываем null вместо строки "null"
    ipLocation: null, // Явно указываем null вместо строки "null"
    createdAt,
    updatedAt,
  });

  logger.debug('Создана минимальная запись', { quizId, key });
}

// Пересчет статистики quiz_open для квиза
async function recalculateQuizStats(
  quizUid: string,
  quizId: number,
  repeatedOpenings: number = 0
): Promise<void> {
  try {
    // Подсчитываем статистику из quiz_bid
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*)::bigint as opened,
        COUNT(DISTINCT key)::bigint as opened_unique,
        COUNT(*) FILTER (WHERE is_full = true)::bigint as full
      FROM quiz_bid
      WHERE quiz_id = ${quizId} AND deleted_at IS NULL
    `);

    const stats = (
      statsResult as unknown as Array<{
        opened: number | string;
        opened_unique: number | string;
        full: number | string;
      }>
    )[0];

    const openedUnique = Number(stats?.opened_unique || 0);
    const full = Number(stats?.full || 0);
    // opened = уникальные открытия + повторные открытия
    const opened = openedUnique + repeatedOpenings;

    // Обновляем или создаем запись в quiz_open
    await db
      .insert(quizOpenTable)
      .values({
        quizUid,
        opened,
        openedUnique,
        full,
      })
      .onConflictDoUpdate({
        target: quizOpenTable.quizUid,
        set: {
          opened,
          openedUnique,
          full,
        },
      });

    logger.info('Статистика quiz_open пересчитана', {
      quizUid,
      opened,
      openedUnique,
      full,
      repeatedOpenings,
    });

    console.log(`\n📊 Статистика квиза обновлена:`);
    console.log(
      `   Открытий: ${opened} (${openedUnique} уникальных + ${repeatedOpenings} повторных)`
    );
    console.log(`   Уникальных открытий: ${openedUnique}`);
    console.log(`   Прохождений: ${full}`);
  } catch (error) {
    logger.error(
      'Ошибка при пересчете статистики quiz_open',
      error instanceof Error ? error : new Error(String(error)),
      { quizUid, quizId, repeatedOpenings }
    );
    throw error;
  }
}

async function main() {
  const args = parseArgs();

  if (!args.quizUid) {
    console.error('❌ Ошибка: необходимо указать --quiz-uid');
    process.exit(1);
  }

  if (!args.isFull && !args.isEmpty && !args.repeated) {
    console.error(
      '❌ Ошибка: необходимо указать хотя бы один из флагов --isFull, --isEmpty или --repeated'
    );
    process.exit(1);
  }

  console.log('Начинаю генерацию тестовых данных...');
  console.log(`Квиз UID: ${args.quizUid}`);
  console.log(`Полностью пройденных: ${args.isFull || 0}`);
  console.log(`Неполных: ${args.isEmpty || 0}`);
  console.log(`Повторных открытий: ${args.repeated || 0}`);

  try {
    // Получаем квиз
    const quiz = await db
      .select({ id: quizTable.id, userId: quizTable.userId, createdAt: quizTable.createdAt })
      .from(quizTable)
      .where(eq(quizTable.uid, args.quizUid!))
      .limit(1);

    if (quiz.length === 0) {
      throw new Error(`Квиз с uid ${args.quizUid} не найден`);
    }

    const quizId = quiz[0].id;
    const userId = quiz[0].userId;
    const quizCreatedAt = quiz[0].createdAt;

    // Получаем вопросы квиза
    const questions = await db
      .select({
        type: quizQuestionTable.type,
        uid: quizQuestionTable.uid,
        order: quizQuestionTable.order,
        content: quizQuestionTable.content,
      })
      .from(quizQuestionTable)
      .where(eq(quizQuestionTable.quizId, quizId))
      .orderBy(asc(quizQuestionTable.order));

    if (questions.length === 0) {
      console.warn('⚠️  Внимание: в квизе нет вопросов');
    }

    // Получаем форму контактов
    const contacts = await db
      .select({ form: quizContactTable.form })
      .from(quizContactTable)
      .where(eq(quizContactTable.quizId, quizId))
      .limit(1);

    const contactsForm =
      contacts.length > 0 && contacts[0].form ? (contacts[0].form as any[]) : null;

    // Создаем полностью пройденные записи
    if (args.isFull && args.isFull > 0) {
      if (questions.length === 0) {
        console.warn('⚠️  Внимание: невозможно создать полностью пройденные записи без вопросов');
      } else {
        console.log(`\nСоздаю ${args.isFull} полностью пройденных записей...`);
        for (let i = 0; i < args.isFull; i++) {
          await createFullBid(quizId, userId, questions, contactsForm, quizCreatedAt);
          if ((i + 1) % 10 === 0) {
            console.log(`  Создано ${i + 1}/${args.isFull}...`);
          }
        }
        console.log(`✅ Создано ${args.isFull} полностью пройденных записей`);
      }
    }

    // Создаем неполные записи
    if (args.isEmpty && args.isEmpty > 0) {
      console.log(`\nСоздаю ${args.isEmpty} неполных записей...`);
      const emptyTypes = [
        createEmptyBidNoContacts,
        createEmptyBidOneQuestion,
        createEmptyBidMinimal,
      ];

      for (let i = 0; i < args.isEmpty; i++) {
        const typeIndex = i % emptyTypes.length;
        await emptyTypes[typeIndex](quizId, questions, contactsForm, quizCreatedAt);
        if ((i + 1) % 10 === 0) {
          console.log(`  Создано ${i + 1}/${args.isEmpty}...`);
        }
      }
      console.log(`✅ Создано ${args.isEmpty} неполных записей`);
    }

    // Пересчитываем статистику quiz_open
    console.log('\n📊 Пересчитываю статистику квиза...');
    await recalculateQuizStats(args.quizUid!, quizId, args.repeated || 0);

    console.log('\n✅ Генерация тестовых данных завершена успешно');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при генерации тестовых данных:', error);
    logger.error(
      'Ошибка при генерации тестовых данных',
      error instanceof Error ? error : new Error(String(error)),
      { args }
    );
    process.exit(1);
  }
}

main();
