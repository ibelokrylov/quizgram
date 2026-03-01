import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { BidDetails } from '@/entities/Bid/bid.type';
import { useUpdateBidStatus } from '@/entities/Bid/useBids';
import { questionTypes } from '@/pages/EditQuiz/ui/DrawerEdit/ui/QuestionEdit/const/question.type';
import { Link } from '@tanstack/react-router';
import { isBefore } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AnswersSection } from './ui/AnswerSection';
import BidStatusSelector from './ui/BidStatusSelector';
import ContactsSection from './ui/ContactsSection';
import TelegramUserSection from './ui/TelegramUserSection';

interface BidDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidDetails: BidDetails | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function BidDetailsDrawer({
  open,
  onOpenChange,
  bidDetails,
  isLoading,
  isError,
}: BidDetailsDrawerProps) {
  const { t } = useTranslation();
  const updateBidStatus = useUpdateBidStatus();

  if (!bidDetails) {
    throw new Error('BidDetails undefined');
  }

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
      toast.success(t('bids.details.statusUpdated'));
    } catch {
      toast.error(t('bids.details.statusUpdateFailed'));
    }
  };

  const isNew = useMemo(
    () =>
      import.meta.env.VITE_NEW_ANSWER
        ? isBefore(new Date(import.meta.env.VITE_NEW_ANSWER), new Date(bidDetails.createdAt))
        : false,
    []
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[98vh] max-h-[98vh] select-auto!">
        <div className="max-w-[1000px] mx-auto w-full h-full flex flex-col overflow-hidden">
          <DrawerHeader className="shrink-0">
            <div className="space-y-3">
              <DrawerTitle className="text-base lg:text-lg">
                {bidDetails
                  ? t('bids.details.key', { key: bidDetails.key })
                  : t('bids.details.loading')}
              </DrawerTitle>
              {bidDetails && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={bidDetails.isFull ? 'default' : 'secondary'}>
                    {bidDetails.isFull
                      ? t('bids.details.completed.full')
                      : t('bids.details.completed.notFull')}
                  </Badge>
                  {bidDetails.first && <Badge variant="outline">{t('bids.details.first')}</Badge>}
                </div>
              )}
              {bidDetails && (
                <DrawerDescription className="flex items-center gap-2 text-xs lg:text-sm">
                  <span>{t('bids.details.quiz', { name: bidDetails.quizName })}</span>
                  <Link
                    to="/app/quiz/$uid"
                    params={{ uid: bidDetails.uid }}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 lg:h-4 lg:w-4" />
                    {t('bids.details.openEditor')}
                  </Link>
                </DrawerDescription>
              )}
            </div>
          </DrawerHeader>

          <div className="p-4 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader />
              </div>
            ) : isError ? (
              <div className="text-xs lg:text-sm text-destructive">{t('bids.details.error')}</div>
            ) : bidDetails ? (
              <div className="space-y-6">
                {/* Основная информация */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <BidStatusSelector
                      status={bidDetails.status}
                      onStatusChange={handleStatusChange}
                      isPending={updateBidStatus.isPending}
                      t={t}
                    />
                    <div>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        {t('bids.details.created.label')}
                      </p>
                      <p className="text-sm lg:text-base font-medium">
                        {bidDetails.createdAt
                          ? (() => {
                              const date = new Date(bidDetails.createdAt);
                              return isNaN(date.getTime())
                                ? bidDetails.createdAt
                                : date.toLocaleString('ru-RU', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  });
                            })()
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Контакты */}
                {bidDetails.contacts && Object.keys(bidDetails.contacts).length > 0 && (
                  <ContactsSection
                    contacts={bidDetails.contacts}
                    contactsForm={bidDetails.contactsForm}
                    t={t}
                  />
                )}
                {/* Информация о пользователе Telegram */}
                {bidDetails.userInfo && (
                  <TelegramUserSection userInfo={bidDetails.userInfo} t={t} />
                )}
                {/* Ответы на вопросы квиза */}
                {bidDetails.data != null &&
                (Array.isArray(bidDetails.data) ? bidDetails.data.length > 0 : true) ? (
                  <AnswersSection
                    data={bidDetails.data}
                    questions={bidDetails.questions}
                    questionTypeLabelByType={questionTypeLabelByType}
                    isNew={isNew}
                    t={t}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
