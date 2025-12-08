import { DownloadDrawer } from '@/components/dwonload-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Quiz, QuizQuestionVariantImage } from '@/entities/Quiz/quiz.type';
import http from '@/lib/http';
import { cn } from '@/lib/utils';
import { CircleX, Plus, Trash, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const VariantImage = ({
  question,
  setQuestion,
  type = 'variant_image',
}: {
  question: Quiz['question'][0];
  setQuestion: (question: Quiz['question'][0]) => void;
  type?: 'variant_image' | 'variant_image_text';
}) => {
  const content = question?.content as QuizQuestionVariantImage;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!content?.variants?.length) {
      setQuestion({ ...question, content: { ...content, variants: [{ url: '', value: '' }] } });
    }
  }, [content]);

  function onFinal(value: string) {
    if (currentIdx === null) return;
    const newVariants = [...content.variants];
    newVariants[currentIdx] = { url: value, value: content.variants[currentIdx].value };
    setCurrentIdx(null);
    setQuestion({ ...question, content: { ...content, variants: newVariants } });
  }

  function onOpen(idx: number) {
    setCurrentIdx(idx);
    setOpen(true);
  }

  async function onDeleteImage(idx: number) {
    try {
      await http({ url: '/v1/user/delete-file', method: 'DELETE', body: { file_url: content.variants[idx].url } });
      const newVariants = [...content.variants];
      newVariants[idx] = { url: '', value: content.variants[idx].value };
      setQuestion({ ...question, content: { ...content, variants: newVariants } });
    } catch (err) {
      console.log(err);
      toast.error(t('tooltip.delete-error'));
    }
  }

  async function onDelete(idx: number) {
    try {
      if (content.variants[idx].url) {
        await http({ url: '/v1/user/delete-file', method: 'DELETE', body: { file_url: content.variants[idx].url } });
      }
      const newVariants = [...content.variants];
      newVariants.splice(idx, 1);
      setQuestion({ ...question, content: { ...content, variants: newVariants } });
    } catch (err) {
      console.log(err);
      toast.error(t('tooltip.delete-error'));
    } finally {
      setCurrentIdx(null);
    }
  }

  return (
    <div className={'flex flex-col gap-2'}>
      {content?.variants?.map((i, idx) => (
        <div
          key={`${question.uid}-${idx}`}
          className={'flex items-center gap-2'}
        >
          {i.url ? (
            <div className={'flex gap-1 items-center'}>
              <div className={cn('rounded-md overflow-hidden shrink-0', type === 'variant_image' ? 'w-10 h-10' : 'w-12 h-10')}>
                <img
                  src={i.url}
                  alt='image'
                  className='w-full h-full object-cover'
                />
              </div>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={'icon-sm'}
                      variant={'outline'}
                      onClick={() => onDeleteImage(idx)}
                    >
                      <CircleX />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('tooltip.delete')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size={'icon-sm'}
                    variant={'outline'}
                    onClick={() => onOpen(idx)}
                  >
                    <Upload />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('tooltip.add-image', { size: type === 'variant_image' ? '820x820' : '1012x818' })}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Input
            value={i.value}
            onChange={(e) =>
              setQuestion({ ...question, content: { ...content, variants: content.variants.map((v, i) => (i === idx ? { ...v, value: e.target.value } : v)) } })
            }
            placeholder={t('edit-quiz.question-page.question.new-answer')}
          />
          <Button
            size={'icon-sm'}
            variant={'outline'}
            onClick={() => onDelete(idx)}
          >
            <Trash />
          </Button>
        </div>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={'mt-4'}
            size={'icon-sm'}
            variant={'outline'}
            onClick={() => setQuestion({ ...question, content: { ...content, variants: [...content.variants, { url: '', value: '' }] } })}
          >
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('tooltip.add-answer')}</p>
        </TooltipContent>
      </Tooltip>
      <DownloadDrawer
        type='image'
        open={open}
        resize={true}
        targetWidth={type === 'variant_image' ? 820 : 1012}
        targetHeight={type === 'variant_image' ? 820 : 818}
        setOpen={setOpen}
        onFinal={onFinal}
      />
    </div>
  );
};
