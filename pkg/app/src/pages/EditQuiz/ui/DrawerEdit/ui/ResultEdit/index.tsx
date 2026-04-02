import { DownloadDrawer } from '@/components/dwonload-drawer';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card } from '@/components/ui/card';
import { CopyToClick } from '@/components/ui/copy-to-click';
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { type Quiz, type QuizResult, type QuizResultButton } from '@/entities/Quiz/quiz.type';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';
import { ChevronDownIcon, Delete, DownloadCloudIcon, PlusCircle } from 'lucide-react';
import { useContext, useId, useState } from 'react';
import { ResultButtonItem } from './ui/ResultButtonItem';

export const ResultEdit = () => {
  const ctx = useContext(DrawerEditContext);
  const { quiz, setQuiz } = useContext(CreateQuizContext);

  const [openDownloadDrawer, setOpenDownloadDrawer] = useState(false);

  const id = useId();
  if (!ctx.uid) return null;

  const result = quiz?.results?.find((i) => i.uid === ctx.uid);
  if (!result) return null;

  const [title, setTitle] = useState(result?.title ?? '');
  const [description, setDescription] = useState(result?.description ?? '');

  function changeTitleResaultQuiz(value: string) {
    const newResult = (quiz?.results ?? []).map((item) => {
      if (item.uid === ctx.uid) {
        return {
          ...item,
          title: value,
        };
      }
      return item;
    });

    setQuiz({ ...quiz, results: newResult } as Quiz);
  }

  function changeDescriptionResaultQuiz(value: string) {
    const newResult = (quiz?.results ?? []).map((item) => {
      if (item.uid === ctx.uid) {
        return {
          ...item,
          description: value,
        };
      }
      return item;
    });

    setQuiz({ ...quiz, results: newResult } as Quiz);
  }

  function changeType(value: string) {
    const newResult = [...(quiz?.results ?? [])].map((i) => {
      if (i.uid === result?.uid) {
        return { ...i, type: value, url: undefined };
      }
      return i;
    });

    setQuiz({ ...quiz, results: newResult } as Quiz);
  }

  function updateResult(result: QuizResult) {
    const newResult = [...(quiz?.results ?? [])].map((i) => {
      if (i.uid === result.uid) {
        return result;
      }
      return i;
    });

    setQuiz({ ...quiz, results: newResult } as Quiz);
  }

  function addButton() {
    const buttons = [...(result?.button ?? [])];
    buttons.push({ title: '', type: 'link' });
    updateResult({ ...result, button: buttons } as QuizResult);
  }

  function updateButton(button: QuizResultButton, idx: number) {
    const buttons = [...(result?.button ?? [])].map((i, x) => {
      return x === idx ? button : i;
    });

    updateResult({ ...result, button: buttons } as QuizResult);
  }

  function deleteButton(idx: number) {
    const buttons = [...(result?.button ?? [])];
    buttons.splice(idx, 1);

    updateResult({ ...result, button: buttons } as QuizResult);
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t('edit-quiz.result.title')}</DrawerTitle>
        <DrawerDescription>
          <CopyToClick as={'span'} text={ctx.uid}>
            key: {ctx.uid}
          </CopyToClick>
        </DrawerDescription>
      </DrawerHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`title-${id}`}>{t('quiz-edit.result.title.label')}</Label>
          <Input
            id={`title-${id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => changeTitleResaultQuiz(e.target.value)}
          />
        </div>
        <div>
          <Card className="p-1 flex flex-col gap-2">
            <div>{t('edit-quiz.result.file.title')}</div>
            <div className="flex items-center gap-3">
              <ButtonGroup>
                <Button onClick={() => setOpenDownloadDrawer(true)} variant="outline">
                  {t(`edit-quiz.result.file.${result.type}`)}
                  <DownloadCloudIcon />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="pl-2!">
                      <ChevronDownIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuGroup>
                      {['img', 'video'].map((i) => (
                        <DropdownMenuItem onClick={() => changeType(i)} key={i}>
                          {t('edit-quiz.result.file.' + i)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>
            {result.url ? (
              result.type === 'img' ? (
                <div className="flex items-center gap-2">
                  <div className="w-[100px] rounded-sm">
                    <img className="w-[100px] rounded-sm" src={result.url} />
                  </div>
                  <div>
                    <Button
                      onClick={() => updateResult({ ...result, url: undefined })}
                      size={'icon-sm'}
                      variant="destructive"
                    >
                      <Delete />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 pl-5 pt-4 pb-2">
                  <a href={result.url} target={'_blank'} className="underline text-blue-500">
                    video
                  </a>
                  <div>
                    <Button
                      onClick={() => updateResult({ ...result, url: undefined })}
                      size={'icon-sm'}
                      variant="destructive"
                    >
                      <Delete />
                    </Button>
                  </div>
                </div>
              )
            ) : null}
            <DownloadDrawer
              resize
              targetHeight={800}
              targetWidth={800}
              type={result.type === 'img' ? 'image' : 'video'}
              open={openDownloadDrawer}
              setOpen={setOpenDownloadDrawer}
              onFinal={(v) => updateResult({ ...result, url: v })}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`description-${id}`}>{t('quiz-edit.result.description.label')}</Label>
          <Textarea
            id={`description-${id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={(e) => changeDescriptionResaultQuiz(e.target.value)}
            maxLength={250}
            placeholder={t('quiz-edit.result.description.placeholder')}
          />
        </div>
        <Card className="p-2 flex flex-col gap-3">
          <div>{t('quiz-edit.result.button.title')}</div>
          <div className="flex flex-col gap-4">
            {(
              (Array.isArray(result.button) ? result.button : [result.button]) as QuizResultButton[]
            )?.map((item, idx) => (
              <ResultButtonItem
                onDeleteButton={() => deleteButton(idx)}
                key={idx}
                button={item}
                onChange={(v) => updateButton(v, idx)}
              />
            ))}
          </div>
          <Separator />
          <div>
            <Button variant={'outline'} onClick={addButton}>
              <PlusCircle />
              {t('add')}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
};
