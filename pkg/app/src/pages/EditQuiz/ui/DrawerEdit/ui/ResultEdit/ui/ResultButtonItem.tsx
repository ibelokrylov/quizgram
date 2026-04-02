import { DownloadDrawer } from '@/components/dwonload-drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QuizResultButton, QuizResultButtonFile } from '@/entities/Quiz/quiz.type';
import { t } from 'i18next';
import { useId, useState } from 'react';
import { v7 } from 'uuid';
import { ResultFileChange } from './ResultFileChange';
import { Separator } from '@/components/ui/separator';

export const ResultButtonItem = ({
  button,
  onChange,
  onDeleteButton,
}: {
  button: QuizResultButton;
  onChange: (button: QuizResultButton) => void;
  onDeleteButton: () => void;
}) => {
  const id = useId();
  const [openDownloadDrawer, setOpenDownloadDrawer] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!button) return null;

  function onChangeLink(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...button, url: e.target.value } as QuizResultButton);
  }

  function onDownloadOneFile(link: string) {
    if (button.type === 'files') {
      onDownloadFiles(link);
      return;
    }
    const uid = v7();
    onChange({
      ...button,
      url: {
        name: uid,
        url: link,
        uid,
      },
    } as QuizResultButton);
  }

  function onDownloadFiles(value: string) {
    const newFiles = [];
    if (Array.isArray(button.url)) {
      newFiles.push(...button.url);
    }
    const uid = v7();
    newFiles.push({ name: uid, url: value, uid });
    onChange({ ...button, url: newFiles } as QuizResultButton);
  }

  function changeType(v: string) {
    switch (true) {
      case v === 'link': {
        onChange({
          type: 'link',
          url: '',
        } as QuizResultButton);
        return;
      }
      case v === 'file': {
        onChange({
          type: 'file',
          url: undefined,
        } as QuizResultButton);
        return;
      }

      case v === 'files': {
        onChange({
          type: 'files',
          url: undefined,
        } as QuizResultButton);
        return;
      }
    }
  }

  function onChangeFileInFiles(file: QuizResultButtonFile) {
    onChange({
      ...button,
      //@ts-ignore
      url: button.url?.map((i) => {
        if (i.uid === file.uid) {
          return file;
        }
        return i;
      }),
    });
  }

  return (
    <Card className="p-1 flex flex-col gap-3">
      <div>
        <Label htmlFor={`title-${id}`}>{t('quiz-edit.result.button.create.label')}</Label>
        <Input
          id={`title-${id}`}
          defaultValue={button.title}
          onBlur={(e) => onChange({ ...button, title: e.target.value })}
        />
      </div>
      <div>
        <Select onValueChange={changeType} defaultValue={button.type as string}>
          <SelectTrigger className="w-full max-w-48">
            <SelectValue placeholder={t('edit-quiz.result.button.type.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="link">{t('quiz-edit.result.button.type.link')}</SelectItem>
              <SelectItem value="file">{t('quiz-edit.result.button.type.file')}</SelectItem>
              <SelectItem value="files">{t('quiz-edit.result.button.type.files')}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {button.type === 'link' ? (
        <div className="flex flex-col gap-2">
          <Label>{t('edit-quiz.result.button.link.label')}</Label>
          <Input defaultValue={button.url} onBlur={onChangeLink} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {button.type === 'file' ? (
            button.url ? (
              <ResultFileChange
                file={button.url}
                onChange={(file) => onChange({ ...button, url: file } as QuizResultButton)}
                deleteFile={() => onChange({ ...button, url: undefined })}
              />
            ) : null
          ) : (
            <div className="flex flex-col gap-3.5">
              {button.url?.map((f) => (
                <ResultFileChange
                  key={f.uid}
                  file={f}
                  onChange={onChangeFileInFiles}
                  deleteFile={(uid) =>
                    onChange({ ...button, url: button.url?.filter((i) => i.uid !== uid) })
                  }
                />
              ))}
            </div>
          )}
          <div>
            <Button loading={loading} onClick={() => setOpenDownloadDrawer(true)}>
              {t('edit-quiz.result.button.file.title')}
            </Button>
          </div>
          <DownloadDrawer
            onChangeLoading={setLoading}
            open={openDownloadDrawer}
            setOpen={setOpenDownloadDrawer}
            onFinal={onDownloadOneFile}
            type={'all'}
          />
        </div>
      )}
      <Separator />
      <div>
        <Button variant={'destructive-outline'} onClick={onDeleteButton}>
          {t('quiz-edit.result.delete-button')}
        </Button>
      </div>
    </Card>
  );
};
