import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import type { BidDetails } from '@/entities/Bid/bid.type';
import { useTranslation } from 'react-i18next';

interface BidInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidDetails: BidDetails | undefined;
  isLoading: boolean;
  isError: boolean;
}

interface DropoutInfo {
  dropoutAt: 'question' | 'contacts';
  dropoutIndex?: number;
  dropoutQuestionNumber?: number;
  dropoutReason: 'no_answer' | 'contacts_page' | 'question_not_answered';
  questionsCount: number;
  answersCount: number;
}

// Функция для форматирования разницы времени
function formatDuration(createdAt: string, updatedAt: string): string {
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  const diffMs = end - start;

  if (diffMs < 0) return '0 сек';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} ${remainingHours} ${remainingHours === 1 ? 'час' : remainingHours < 5 ? 'часа' : 'часов'}`;
    }
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} ${remainingMinutes} ${remainingMinutes === 1 ? 'минута' : remainingMinutes < 5 ? 'минуты' : 'минут'}`;
    }
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      return `${minutes} ${minutes === 1 ? 'минута' : minutes < 5 ? 'минуты' : 'минут'} ${remainingSeconds} ${remainingSeconds === 1 ? 'секунда' : remainingSeconds < 5 ? 'секунды' : 'секунд'}`;
    }
    return `${minutes} ${minutes === 1 ? 'минута' : minutes < 5 ? 'минуты' : 'минут'}`;
  }

  return `${seconds} ${seconds === 1 ? 'секунда' : seconds < 5 ? 'секунды' : 'секунд'}`;
}

export function BidInfoDrawer({
  open,
  onOpenChange,
  bidDetails,
  isLoading,
  isError,
}: BidInfoDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[98vh] max-h-[98vh]">
        <div className="max-w-[1000px] mx-auto w-full h-full flex flex-col overflow-hidden">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>{t('bids.info.title')}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader />
              </div>
            ) : isError ? (
              <div className="text-destructive">{t('bids.info.error')}</div>
            ) : bidDetails ? (
              <div className="space-y-6">
                {/* Информация об отвале */}
                {bidDetails.info && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold text-lg">{t('bids.info.dropout.title')}</h3>
                    {(() => {
                      const info = bidDetails.info as DropoutInfo;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('bids.info.dropout.location')}
                            </p>
                            <Badge
                              variant={info.dropoutAt === 'contacts' ? 'default' : 'secondary'}
                            >
                              {info.dropoutAt === 'contacts'
                                ? t('bids.info.dropout.location.contacts')
                                : t('bids.info.dropout.location.question')}
                            </Badge>
                          </div>
                          {info.dropoutAt === 'question' && info.dropoutQuestionNumber && (
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {t('bids.info.dropout.questionNumber')}
                              </p>
                              <p className="font-medium">
                                {t('bids.info.dropout.questionNumber.value', {
                                  number: info.dropoutQuestionNumber,
                                })}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('bids.info.dropout.reason')}
                            </p>
                            <p className="font-medium">
                              {info.dropoutReason === 'no_answer'
                                ? t('bids.info.dropout.reason.noAnswer')
                                : info.dropoutReason === 'contacts_page'
                                  ? t('bids.info.dropout.reason.contactsPage')
                                  : t('bids.info.dropout.reason.questionNotAnswered')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('bids.info.dropout.questionsCount')}
                            </p>
                            <p className="font-medium">{info.questionsCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('bids.info.dropout.answersCount')}
                            </p>
                            <p className="font-medium">{info.answersCount}</p>
                          </div>
                          {info.dropoutAt === 'question' && info.dropoutIndex !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {t('bids.info.dropout.index')}
                              </p>
                              <p className="font-medium">{info.dropoutIndex + 1}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Временные метки */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-lg">{t('bids.info.timestamps.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('bids.info.timestamps.created')}
                      </p>
                      <p className="font-medium">
                        {new Date(bidDetails.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('bids.info.timestamps.updated')}
                      </p>
                      <p className="font-medium">
                        {new Date(bidDetails.updatedAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('bids.info.timestamps.duration')}
                      </p>
                      <p className="font-medium">
                        {formatDuration(bidDetails.createdAt, bidDetails.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* IP и местоположение */}
                {bidDetails.ipLocation && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold text-lg">{t('bids.info.location.title')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bidDetails.ipLocation.city && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('bids.info.location.city')}
                          </p>
                          <p className="font-medium">{bidDetails.ipLocation.city}</p>
                        </div>
                      )}
                      {bidDetails.ipLocation.country && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('bids.info.location.country')}
                          </p>
                          <p className="font-medium">{bidDetails.ipLocation.country}</p>
                        </div>
                      )}
                      {bidDetails.ipLocation.region && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('bids.info.location.region')}
                          </p>
                          <p className="font-medium">{bidDetails.ipLocation.region}</p>
                        </div>
                      )}
                      {bidDetails.ipLocation.timezone && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('bids.info.location.timezone')}
                          </p>
                          <p className="font-medium">{bidDetails.ipLocation.timezone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Технические данные */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-lg">{t('bids.info.technical.title')}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('bids.info.technical.key')}
                      </p>
                      <p className="font-mono text-sm">{bidDetails.key}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('bids.info.technical.uid')}
                      </p>
                      <p className="font-mono text-sm">{bidDetails.uid}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
