import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BidDetails } from '@/entities/Bid/bid.type';
import { useUpdateBidStatus } from '@/entities/Bid/useBids';
import { questionTypes } from '@/pages/EditQuiz/ui/QuestionPage/const/question.type';
import { Link } from '@tanstack/react-router';
import { ExternalLink, File } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface BidDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidDetails: BidDetails | undefined;
  isLoading: boolean;
  isError: boolean;
}

// Константы статусов заявок
const BID_STATUSES = [
  { value: 'create', label: 'Создана' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'rejected', label: 'Отклонена' },
  { value: 'success', label: 'Успешна' },
  { value: 'completed', label: 'Завершена' },
] as const;

// Вспомогательные функции для извлечения данных
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractImageUrl = (answer: any): string | null => {
  return answer?.url || answer?.image_url || answer?.imageUrl || answer?.variant?.url || answer?.selected?.url || null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractText = (answer: any): string | null => {
  return (
    answer?.text ||
    answer?.value ||
    answer?.label ||
    answer?.variant?.text ||
    answer?.variant?.value ||
    answer?.selected?.text ||
    answer?.selected?.value ||
    null
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractDateValue = (answer: any): string | null => {
  return answer?.date || answer?.value || answer?.selected || answer || null;
};

const truncateFileName = (fileName: string, maxLength: number = 40): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - (extension?.length || 0) - 4);
  return `${truncatedName}...${extension}`;
};

const formatPhoneNumber = (value: string): string => {
  return value.startsWith('+') ? value : `+${value}`;
};

// Компоненты для рендеринга различных типов ответов

const VariantImageAnswer = ({ imageUrl }: { imageUrl: string }) => (
  <div className='text-sm bg-muted p-3 rounded-md overflow-auto'>
    <div className='flex justify-center'>
      <img
        src={imageUrl}
        alt='Ответ'
        className='rounded-md w-64 h-64 object-cover'
      />
    </div>
  </div>
);

const VariantImageTextAnswer = ({ imageUrl, text }: { imageUrl: string | null; text: string | null }) => {
  if (imageUrl) {
    return (
      <div className='text-sm bg-muted p-3 rounded-md'>
        <div className='space-y-2 md:flex md:flex-col md:items-center md:justify-center'>
          <img
            src={imageUrl}
            alt='Ответ'
            className='rounded-lg max-w-95 max-h-76.75 w-full h-auto object-contain md:mx-auto'
          />
          {text && <p className='font-medium md:text-center'>{text}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className='text-sm bg-muted p-3 rounded-md overflow-auto'>
        <p className='font-medium md:text-center'>{text}</p>
      </div>
    );
  }

  return null;
};

const DateAnswer = ({ dateValue }: { dateValue: string }) => {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;

  const formattedDate = date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className='text-sm bg-muted p-3 rounded-md overflow-auto'>
      <p className='font-medium'>{formattedDate}</p>
    </div>
  );
};

const FileAnswer = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => (
  <div className='text-sm bg-muted p-3 rounded-md'>
    <a
      href={fileUrl}
      target='_blank'
      rel='noopener noreferrer'
      className='flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity'
    >
      <File className='h-5 w-5 shrink-0 text-muted-foreground' />
      <span className='truncate font-medium'>{truncateFileName(fileName)}</span>
    </a>
  </div>
);

const PageAnswer = ({ text, url, contentType }: { text: string | null; url: string | null; contentType: string | null }) => (
  <div className='text-sm bg-muted p-3 rounded-md space-y-3 md:flex md:flex-col md:items-center md:justify-center'>
    {text && <p className='font-medium md:text-center'>{text}</p>}
    {url && (
      <div className='md:flex md:justify-center md:w-full'>
        {contentType === 'img' ? (
          <img
            src={url}
            alt='Изображение'
            className='rounded-md max-w-full h-auto object-contain md:mx-auto'
          />
        ) : (
          <div className='rounded-md overflow-hidden md:mx-auto md:max-w-2xl'>
            <iframe
              src={url}
              className='w-full aspect-video'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
              title='Видео'
            />
          </div>
        )}
      </div>
    )}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JsonAnswer = ({ answer }: { answer: any }) => <pre className='text-sm bg-muted p-3 rounded-md overflow-auto'>{JSON.stringify(answer, null, 2)}</pre>;

// Главный компонент рендеринга ответа
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnswerRenderer = ({ answer, type }: { answer: any; type: string }) => {
  switch (type) {
    case 'variant_image': {
      const imageUrl = extractImageUrl(answer);
      return imageUrl ? <VariantImageAnswer imageUrl={imageUrl} /> : null;
    }

    case 'variant_image_text': {
      const imageUrl = extractImageUrl(answer);
      const text = extractText(answer);
      return (
        <VariantImageTextAnswer
          imageUrl={imageUrl}
          text={text}
        />
      );
    }

    case 'date': {
      const dateValue = extractDateValue(answer);
      return dateValue ? <DateAnswer dateValue={dateValue} /> : null;
    }

    case 'file':
      if (answer?.type === 'file') {
        const fileUrl = answer?.url;
        const fileName = answer?.fileName || 'Файл';
        return fileUrl ? (
          <FileAnswer
            fileUrl={fileUrl}
            fileName={fileName}
          />
        ) : null;
      }
      return <JsonAnswer answer={answer} />;

    case 'page':
      if (answer?.type === 'page' || answer?.content) {
        const pageContent = answer?.content || answer;
        const text = pageContent?.text;
        const url = pageContent?.url;
        const contentType = pageContent?.type;
        return (
          <PageAnswer
            text={text}
            url={url}
            contentType={contentType}
          />
        );
      }
      return <JsonAnswer answer={answer} />;

    default:
      // Проверяем, если это файл по структуре (answer.type === 'file')
      if (answer?.type === 'file') {
        const fileUrl = answer?.url;
        const fileName = answer?.fileName || 'Файл';
        return fileUrl ? (
          <FileAnswer
            fileUrl={fileUrl}
            fileName={fileName}
          />
        ) : null;
      }
      return <JsonAnswer answer={answer} />;
  }
};

// Компонент для отображения подвопроса
interface SubQuestionAnswerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subAnswer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subQuestion: any;
  questionTypeLabelByType: Map<string, string>;
}

const SubQuestionAnswer = ({ subAnswer, subQuestion, questionTypeLabelByType }: SubQuestionAnswerProps) => {
  const subQuestionUid = subAnswer?.question_uid;
  const subTitle = subQuestion?.content?.title || subQuestion?.title || null;
  const subTypeRaw = subQuestion?.type || 'unknown';
  const subTypeLabel = questionTypeLabelByType.get(subTypeRaw) || subTypeRaw;

  return (
    <div className='border-t pt-4 first:border-t-0 first:pt-0 space-y-2'>
      <div className='flex items-center gap-2'>
        <Badge
          variant='outline'
          className='text-xs'
        >
          {subTypeLabel}
        </Badge>
        {subQuestionUid && <span className='text-xs text-muted-foreground'>{subQuestionUid}</span>}
      </div>
      {subTitle && <div className='text-sm font-medium'>{subTitle}</div>}
      <div className={subTitle ? '' : 'pt-1'}>
        <AnswerRenderer
          answer={subAnswer?.answer ?? subAnswer}
          type={subTypeRaw}
        />
      </div>
    </div>
  );
};

// Компонент для карточки ответа на question_group
interface QuestionGroupCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  idx: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questionFromQuiz: any;
  questionTypeLabelByType: Map<string, string>;
  title: string | null;
  typeLabel: string;
}

const QuestionGroupCard = ({ item, idx, questionFromQuiz, questionTypeLabelByType, title, typeLabel }: QuestionGroupCardProps) => {
  const questionUid = item?.question_uid ?? item?.question?.uid ?? null;
  const subQuestions = questionFromQuiz?.content?.questions || [];

  return (
    <div
      key={questionUid ?? idx}
      className='relative rounded-md border bg-muted/30 p-3 space-y-4'
    >
      <Badge
        variant='secondary'
        className='absolute -top-2.5 left-[10px]'
      >
        {typeLabel}
      </Badge>
      {questionUid && (
        <Badge
          variant='secondary'
          className='absolute -bottom-7 right-[10px]'
        >
          {questionUid}
        </Badge>
      )}
      {title && <div className='text-sm font-medium pt-1'>{title}</div>}

      <div className={title ? 'space-y-4' : 'pt-3 space-y-4'}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {item.answer.map((subAnswer: any, subIdx: number) => {
          const subQuestionUid = subAnswer?.question_uid;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subQuestion = subQuestions.find((sq: any) => sq?.uid === subQuestionUid);

          return (
            <SubQuestionAnswer
              key={subQuestionUid || subIdx}
              subAnswer={subAnswer}
              subQuestion={subQuestion}
              questionTypeLabelByType={questionTypeLabelByType}
            />
          );
        })}
      </div>
    </div>
  );
};

// Компонент для обычной карточки ответа
interface RegularQuestionCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  idx: number;
  title: string | null;
  typeRaw: string;
  typeLabel: string;
}

const RegularQuestionCard = ({ item, idx, title, typeRaw, typeLabel }: RegularQuestionCardProps) => {
  const questionUid = item?.question_uid ?? item?.question?.uid ?? null;

  return (
    <div
      key={questionUid ?? idx}
      className='relative rounded-md border bg-muted/30 p-3 space-y-2'
    >
      <Badge
        variant='secondary'
        className='absolute -top-2.5 left-[10px]'
      >
        {typeLabel}
      </Badge>
      {questionUid && (
        <Badge
          variant='secondary'
          className='absolute -bottom-7 right-[10px]'
        >
          {questionUid}
        </Badge>
      )}
      {title && <div className='text-sm font-medium pt-1'>{title}</div>}
      <div className={title ? '' : 'pt-3'}>
        <AnswerRenderer
          answer={item?.answer ?? item}
          type={typeRaw}
        />
      </div>
    </div>
  );
};

// Компонент для отображения контакта
interface ContactFieldProps {
  contactKey: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contactsForm?: any[] | null;
}

const ContactField = ({ contactKey, value, contactsForm }: ContactFieldProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldInfo = contactsForm?.find((field: any) => field.type === contactKey);
  const label = fieldInfo?.label || contactKey;
  const displayValue = contactKey === 'phone' ? formatPhoneNumber(value) : value;

  return (
    <div>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className='font-medium'>{displayValue}</p>
    </div>
  );
};

// Компонент для секции контактов
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ContactsSection = ({ contacts, contactsForm }: { contacts: Record<string, string>; contactsForm?: any[] | null }) => (
  <div className='space-y-3 pt-4 border-t'>
    <h3 className='font-semibold text-lg'>Контакты</h3>
    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
      {Object.entries(contacts).map(([key, value]) => (
        <ContactField
          key={key}
          contactKey={key}
          value={value}
          contactsForm={contactsForm}
        />
      ))}
    </div>
  </div>
);

// Компонент для секции Telegram информации
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TelegramUserSection = ({ userInfo }: { userInfo: any }) => (
  <div className='space-y-3 pt-4 border-t'>
    <h3 className='font-semibold text-lg'>Пользователь Telegram</h3>
    <div className='space-y-2'>
      <pre className='text-sm bg-muted p-3 rounded-md overflow-auto'>{JSON.stringify(userInfo, null, 2)}</pre>
    </div>
  </div>
);

// Компонент для секции ответов на вопросы
interface AnswersSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questions?: any | null;
  questionTypeLabelByType: Map<string, string>;
}

const AnswersSection = ({ data, questions, questionTypeLabelByType }: AnswersSectionProps) => {
  if (!Array.isArray(data)) {
    return (
      <div className='space-y-3 pt-4 border-t'>
        <h3 className='font-semibold text-lg'>Ответы</h3>
        <JsonAnswer answer={data} />
      </div>
    );
  }

  return (
    <div className='space-y-3 pt-4 border-t'>
      <h3 className='font-semibold text-lg'>Ответы</h3>
      <div className='space-y-7'>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {data.map((item: any, idx: number) => {
          const questionUid = item?.question_uid ?? item?.question?.uid ?? null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const questionFromQuiz = Array.isArray(questions) ? questions.find((q: any) => q?.uid === questionUid) : undefined;

          const title =
            questionFromQuiz?.content?.title ||
            questionFromQuiz?.title ||
            item?.question?.content?.title ||
            item?.question?.title ||
            item?.question_title ||
            null;

          const typeRaw = questionFromQuiz?.type || item?.question?.type || 'unknown';
          const typeLabel = questionTypeLabelByType.get(typeRaw) || typeRaw;

          const isQuestionGroup = typeRaw === 'question_group';
          const answerIsArray = Array.isArray(item?.answer);

          if (isQuestionGroup && answerIsArray) {
            return (
              <QuestionGroupCard
                key={questionUid ?? idx}
                item={item}
                idx={idx}
                questionFromQuiz={questionFromQuiz}
                questionTypeLabelByType={questionTypeLabelByType}
                title={title}
                typeLabel={typeLabel}
              />
            );
          }

          return (
            <RegularQuestionCard
              key={questionUid ?? idx}
              item={item}
              idx={idx}
              title={title}
              typeRaw={typeRaw}
              typeLabel={typeLabel}
            />
          );
        })}
      </div>
    </div>
  );
};

// Компонент для дополнительной информации
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AdditionalInfoSection = ({ info }: { info: any }) => (
  <div className='space-y-3 pt-4 border-t'>
    <h3 className='font-semibold text-lg'>Дополнительная информация</h3>
    <div className='space-y-2'>
      <pre className='text-sm bg-muted p-3 rounded-md overflow-auto'>{JSON.stringify(info, null, 2)}</pre>
    </div>
  </div>
);

// Компонент для Telegram initData
const TelegramInitDataSection = ({ initData }: { initData: string }) => (
  <div className='space-y-3 pt-4 border-t'>
    <h3 className='font-semibold text-lg'>Telegram initData</h3>
    <div className='space-y-2'>
      <pre className='text-sm bg-muted p-3 rounded-md overflow-auto whitespace-pre-wrap break-all'>{initData}</pre>
    </div>
  </div>
);

// Компонент для статуса заявки
interface BidStatusSelectorProps {
  status: string;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}

const BidStatusSelector = ({ status, onStatusChange, isPending }: BidStatusSelectorProps) => (
  <div>
    <p className='text-sm text-muted-foreground'>Статус</p>
    <Select
      value={status}
      onValueChange={onStatusChange}
      disabled={isPending}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BID_STATUSES.map((s) => (
          <SelectItem
            key={s.value}
            value={s.value}
          >
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

// Главный компонент
export function BidDetailsDrawer({ open, onOpenChange, bidDetails, isLoading, isError }: BidDetailsDrawerProps) {
  const { t } = useTranslation();
  const updateBidStatus = useUpdateBidStatus();

  const questionTypeLabelByType = useMemo(() => {
    const map = new Map<string, string>();
    for (const qType of questionTypes) {
      map.set(qType.type, t(qType.title));
    }
    return map;
  }, [t]);

  const handleStatusChange = async (newStatus: string) => {
    if (!bidDetails) return;

    try {
      await updateBidStatus.mutateAsync({
        key: bidDetails.key,
        status: newStatus,
      });
      toast.success('Статус заявки обновлен');
    } catch {
      toast.error('Не удалось обновить статус заявки');
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent className='h-[90vh] max-h-[90vh]'>
        <div className='max-w-[1000px] mx-auto w-full h-full flex flex-col overflow-hidden'>
          <DrawerHeader className='shrink-0'>
            <div className='space-y-3'>
              <DrawerTitle>{bidDetails ? `Заявка: №${bidDetails.key}` : 'Загрузка...'}</DrawerTitle>
              {bidDetails && (
                <div className='flex items-center gap-2 flex-wrap'>
                  <Badge variant={bidDetails.isFull ? 'default' : 'secondary'}>{bidDetails.isFull ? 'Завершена' : 'Не завершена'}</Badge>
                  {bidDetails.first && <Badge variant='outline'>Первая заявка</Badge>}
                </div>
              )}
              {bidDetails && (
                <DrawerDescription className='flex items-center gap-2'>
                  <span>Квиз: {bidDetails.quizName}</span>
                  <Link
                    to='/app/quiz/$uid'
                    params={{ uid: bidDetails.uid }}
                    target='_blank'
                    className='inline-flex items-center gap-1 text-primary hover:underline'
                  >
                    <ExternalLink className='h-4 w-4' />
                    Открыть редактор
                  </Link>
                </DrawerDescription>
              )}
            </div>
          </DrawerHeader>

          <div className='p-4 overflow-y-auto flex-1'>
            {isLoading ? (
              <div className='flex items-center justify-center min-h-[200px]'>
                <Loader />
              </div>
            ) : isError ? (
              <div className='text-destructive'>Ошибка при загрузке деталей заявки</div>
            ) : bidDetails ? (
              <div className='space-y-6'>
                {/* Основная информация */}
                <div className='space-y-3'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <BidStatusSelector
                      status={bidDetails.status}
                      onStatusChange={handleStatusChange}
                      isPending={updateBidStatus.isPending}
                    />
                    <div>
                      <p className='text-sm text-muted-foreground'>Создана</p>
                      <p className='font-medium'>{new Date(bidDetails.createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                  </div>
                </div>

                {/* Контакты */}
                {bidDetails.contacts && Object.keys(bidDetails.contacts).length > 0 && (
                  <ContactsSection
                    contacts={bidDetails.contacts}
                    contactsForm={bidDetails.contactsForm}
                  />
                )}

                {/* Информация о пользователе Telegram */}
                {bidDetails.userInfo && <TelegramUserSection userInfo={bidDetails.userInfo} />}

                {/* Ответы на вопросы квиза */}
                {bidDetails.data && (
                  <AnswersSection
                    data={bidDetails.data}
                    questions={bidDetails.questions}
                    questionTypeLabelByType={questionTypeLabelByType}
                  />
                )}

                {/* Дополнительная информация */}
                {bidDetails.info && <AdditionalInfoSection info={bidDetails.info} />}

                {/* Telegram initData */}
                {bidDetails.initData && <TelegramInitDataSection initData={bidDetails.initData} />}
              </div>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
