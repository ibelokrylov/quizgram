import { set } from '@/app/db/index-db';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import http from '@/lib/http';
import type { ReactFlowInstance } from '@xyflow/react';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlusCircle } from 'react-icons/bi';
import { CiSaveUp1 } from 'react-icons/ci';
import { IoIosInformationCircle } from 'react-icons/io';
import { toast } from 'sonner';
import { v7 } from 'uuid';
import { DrawerEditContext } from './context/DrawerEdit.context';
import { DrawerEdit } from './ui/DrawerEdit';
import { QuizFlow } from './ui/QuizFlow';
import { QuizName } from './ui/QuizName';
import { QuizSettings } from './ui/QuizSettings';

type QuizUpdateResponse = {
  ok: string[];
  errors: string[];
};

export const EditQuiz = () => {
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const ctxDrawer = useContext(DrawerEditContext);
  const { open } = useSidebar();
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const { t, i18n } = useTranslation();

  function getNewNodePosition() {
    const inst = reactFlowRef.current;
    if (!inst) return { x: 200, y: 200 };
    return inst.screenToFlowPosition({ x: 100, y: 200 });
  }

  function quizAddStartPage() {
    if (Array.isArray(quiz?.startPage)) {
      if (quiz.startPage.length < 2) {
        const newUid = v7();
        if (quiz.startPage.length === 0) {
          setQuiz({
            ...quiz,
            startPage: [
              {
                type: 'standard',
                uuid: newUid,
                content: {
                  title: 'Заголовок страницы',
                },
              },
            ],
          });
        } else {
          const newQuizStartPage = [
            ...quiz.startPage,
            ...quiz.startPage.map((i) => ({ ...i, uuid: newUid })),
          ].map((i) => {
            if (!i.uuid) {
              i.uuid = v7();
            }
            return i;
          });
          setQuiz({
            ...quiz,
            startPage: newQuizStartPage,
          } as Quiz);
        }
        ctxDrawer?.setUid(newUid);
      }
    } else {
      if (quiz?.startPage) {
        const newUid = v7();
        const newStartPage = [
          quiz?.startPage,
          {
            type: 'standard',
            uuid: newUid,
            content: {
              title: 'Заголовок страницы',
            },
          },
        ].map((i) => {
          if (!i.uuid) {
            i.uuid = v7();
          }
          return i;
        });
        setQuiz({
          ...quiz,
          startPage: newStartPage,
        } as Quiz);
        ctxDrawer?.setUid(newUid);
      } else {
        const newUid = v7();
        setQuiz({
          ...quiz,
          nodes: [
            ...(quiz?.nodes ?? []),
            { type: 'startPage', id: newUid, position: getNewNodePosition() },
          ],
          startPage: [
            {
              type: 'standard',
              uuid: newUid,
              content: {
                title: 'Заголовок страницы',
              },
            },
          ],
        } as Quiz);
        ctxDrawer?.setUid(newUid);
      }
    }
    ctxDrawer?.setOpen(true);
    ctxDrawer?.setType('startPage');
  }

  function addQuestion() {
    const newQuestion = quiz?.question ?? [];
    const uid = v7();
    newQuestion.push({
      uid,
    });

    setQuiz({
      ...quiz,
      nodes: [
        ...(quiz?.nodes ?? []),
        {
          id: uid,
          position: getNewNodePosition(),
          type: 'question',
        },
      ],
      question: newQuestion,
    } as Quiz);
    ctxDrawer?.setOpen(true);
    ctxDrawer?.setUid(uid);
    ctxDrawer?.setType('question');
  }

  function addResult() {
    const newResult = quiz?.results ?? [];
    const uid = v7();
    newResult.push({ uid: uid, type: 'img' });

    setQuiz({
      ...quiz,
      results: newResult,
      nodes: [
        ...(quiz?.nodes ?? []),
        {
          id: uid,
          position: getNewNodePosition(),
          type: 'result',
        },
      ],
    } as Quiz);
    ctxDrawer?.setOpen(true);
    ctxDrawer?.setType('resaults');
    ctxDrawer?.setUid(uid);
  }

  async function saveToServer() {
    if (quiz?.isLoadToServer) {
      toast.error(t('toast.error.quiz-load'));
      return;
    }
    if (!quiz?.uid) {
      return;
    }
    try {
      const response = await http({
        url: '/v1/quiz/' + quiz?.uid,
        body: {
          startPage: quiz?.startPage,
          questionTitle: quiz?.questionTitle,
          question: quiz?.question,
          contact: quiz?.contact,
          thxPage: quiz?.thxPage,
          results: quiz?.results,
          nodes: quiz?.nodes,
          edges: quiz?.edges,
        },
        method: 'PUT',
      });
      console.log(response);

      // Сервер возвращает { ok: string[], errors: string[] } напрямую
      // Функция http возвращает HttpResponse<T>, где T - это тип данных
      // TODO: Добавить Zod валидацию для response
      const result = (response.data || response) as unknown as QuizUpdateResponse;
      if (!result.errors || result.errors.length === 0) {
        await set(quiz.uid, { data: quiz, isLoadToServer: true });
        setQuiz(quiz, true);
      }
    } catch (err) {
      console.log(err);
      toast.error(t('toast.error.quiz-not-load'));
    }
  }

  function quizEditOrAddContact() {
    const generate = !!quiz?.contact?.[0];

    const contact = quiz?.contact?.[0] ?? {
      uid: v7(),
      form: [
        {
          type: 'name',
          label: 'Имя',
          placeholder: 'Иван',
          required: true,
          mask: undefined,
          step: 0,
        },
        {
          type: 'email',
          label: 'Email',
          placeholder: 'mail@example.com',
          required: true,
          mask: undefined,
          step: 0,
        },
        {
          type: 'phone',
          label: 'Телефон',
          placeholder: '+7 (999) 999-99-99',
          required: true,
          mask: '+7 (###) ###-##-##',
          step: 0,
        },
      ],
    };

    if (!quiz?.contact?.length)
      setQuiz({
        ...quiz,
        contact: [contact],
        nodes: generate
          ? [
              ...(quiz?.nodes ?? []),
              {
                id: contact.uid,
                position: getNewNodePosition(),
                type: 'contactForm',
              },
            ]
          : quiz?.nodes,
      } as Quiz);

    ctxDrawer?.setOpen(true);
    ctxDrawer?.setUid(contact.uid);
    ctxDrawer?.setType('contact');
  }

  function quizEditOrAddThx() {
    const thx = quiz?.thxPage ?? {
      uid: v7(),
      title: 'Спасибо, [name]!',
      description: 'Здесь может быть любой текст',
      buttons: [],
      social: [],
    };
    if (!quiz?.thxPage) {
      setQuiz({
        ...quiz,
        thxPage: thx,
        nodes: [
          ...(quiz?.nodes ?? []),
          {
            id: thx.uid,
            position: getNewNodePosition(),
            type: 'thx',
          },
        ],
      } as Quiz);
    }

    ctxDrawer.setOpen(true);
    ctxDrawer?.setType('thxPage');
    ctxDrawer?.setUid(thx.uid);
  }

  const disabledStartPageCreate = Array.isArray(quiz?.startPage) && quiz?.startPage.length === 2;

  return (
    <div className="flex flex-col gap-1 w-full">
      <QuizName />
      <Separator />
      <div
        className={
          !open
            ? 'relative h-[calc(100vh-105px)] w-screen'
            : 'relative h-[calc(100vh-105px)] w-screen md:w-[calc(100vw-288px)]'
        }
      >
        <div className={'absolute left-2 z-10 flex gap-2'}>
          <QuizSettings />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={'sm'}>
                <BiPlusCircle />
                {t('quiz.edit.add.button')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={quizAddStartPage}>
                  {disabledStartPageCreate ? (
                    <div className="w-full">
                      <Tooltip>
                        <TooltipTrigger className="w-full">
                          <div className="flex gap-2 items-center justify-between w-full">
                            <div>{t('quiz.edit.add.start')}</div>
                            <IoIosInformationCircle />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('edit-quiz.add.start.info', { total: 2 })}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div>{t('quiz.edit.add.start')}</div>
                      <div>
                        <BiPlusCircle />
                      </div>
                    </div>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addQuestion}>
                  <div className="flex items-center justify-between w-full">
                    <div> {t('quiz.edit.add.question')}</div>
                    <div>
                      <BiPlusCircle />
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addResult}>
                  <div className="flex items-center justify-between w-full">
                    <div>{t('quiz.edit.add.results')}</div>
                    <div>
                      <BiPlusCircle />
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={quizEditOrAddContact}>
                  <div className="flex gap-2 items-center justify-between w-full">
                    <div> {t('quiz.edit.add.contacts')}</div>
                    {quiz?.contact?.length ? (
                      <div>
                        <Pencil />
                      </div>
                    ) : (
                      <div>
                        <BiPlusCircle />
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={quizEditOrAddThx}>
                  <div className="flex items-center justify-between w-full">
                    <div>{t('quiz.edit.add.thx')}</div>
                    {quiz?.thxPage ? (
                      <div>
                        <Pencil />
                      </div>
                    ) : (
                      <div>
                        <BiPlusCircle />
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {quiz?.isLoadToServer ? (
            <div
              className={
                'flex items-center min-h-[2.8em] py-[5px] leading-[1.4] text-xs text-gray-600 dark:text-gray-300'
              }
            >
              {t('edit-quiz.publish-at', {
                date: format(quiz?.updatedAt ?? new Date(), 'dd.MM.yyyy HH:mm:ss'),
              })}
            </div>
          ) : (
            <Button onClick={saveToServer} color={'primary'} size={'sm'}>
              <CiSaveUp1 />
              {t('edit-quiz.publish')}
            </Button>
          )}
        </div>
        <QuizFlow
          key={i18n.language}
          className={'h-full w-full z-0'}
          onInit={(inst) => {
            reactFlowRef.current = inst;
          }}
        />
      </div>
      <DrawerEdit />
    </div>
  );
};
