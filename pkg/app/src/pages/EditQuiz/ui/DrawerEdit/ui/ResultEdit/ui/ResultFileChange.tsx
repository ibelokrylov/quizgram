import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import type { QuizResultButtonFile } from '@/entities/Quiz/quiz.type';
import { t } from 'i18next';
import { DeleteIcon } from 'lucide-react';
import { useId } from 'react';

export const ResultFileChange = ({
  file,
  onChange,
  deleteFile,
}: {
  file: QuizResultButtonFile;
  onChange: (dto: QuizResultButtonFile) => void;
  deleteFile: (uid: string) => void;
}) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-4 w-full">
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor={`name-${id}`}>{t('quiz-edit.file.change.name.label')}</Label>
          <InputGroup>
            <InputGroupInput
              placeholder={t('quiz-edit.file.change.name.placeholder')}
              defaultValue={file.name}
              className="pl-0.5!"
              onBlur={(e) => onChange({ ...file, name: e.target.value } as QuizResultButtonFile)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>.{file.url?.split('.').pop()}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div>
          <Button onClick={() => deleteFile(file.uid)} size={'icon'} variant="destructive">
            <DeleteIcon />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <a href={file.url} target="_blank" className="text-xs text-blue-500 underline -mt-2">
          {t('edit-quiz.file.change.link')}
        </a>
      </div>
    </div>
  );
};
