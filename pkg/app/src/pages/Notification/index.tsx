import { Loader } from '@/components/loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyToClick } from '@/components/ui/copy-to-click';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNotification, useUpdateNotification } from '@/entities/User/useNotification';
import { useUser } from '@/entities/User/useUser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const NotificationPage = () => {
  const { t } = useTranslation();
  const { query } = useNotification();
  const { mutation } = useUpdateNotification();
  const { query: userQuery } = useUser();
  const [isUidDrawerOpen, setIsUidDrawerOpen] = useState(false);

  const handleToggle = async (type: 'telegram' | 'email', value: boolean) => {
    try {
      await mutation.mutateAsync({ [type]: value });
      toast.success(t('notification.update.success'));

      // Если включили telegram уведомления, показываем drawer с uid
      if (type === 'telegram' && value) {
        setIsUidDrawerOpen(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notification.update.error'));
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('notification.load.error')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('notification.title')}</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {t('notification.description')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('notification.settings.title')}</CardTitle>
          <CardDescription>{t('notification.settings.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notification">{t('notification.settings.email')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notification.settings.email.description')}
              </p>
            </div>
            <Switch
              id="email-notification"
              checked={query.data.email}
              onCheckedChange={(checked) => handleToggle('email', checked)}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="telegram-notification">{t('notification.settings.telegram')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notification.settings.telegram.description')}
              </p>
            </div>
            <Switch
              id="telegram-notification"
              checked={query.data.telegram}
              onCheckedChange={(checked) => handleToggle('telegram', checked)}
              disabled={mutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Drawer с uid */}
      <Drawer open={isUidDrawerOpen} onOpenChange={setIsUidDrawerOpen}>
        <DrawerContent>
          <div className="max-w-[600px] mx-auto w-full">
            <DrawerHeader>
              <DrawerTitle>{t('notification.integrationKey.title')}</DrawerTitle>
              <DrawerDescription>{t('notification.integrationKey.description')}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              {userQuery.isLoading ? (
                <div className="flex items-center justify-center min-h-[100px]">
                  <Loader />
                </div>
              ) : userQuery.data?.uid ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('notification.integrationKey.instruction')}
                  </p>
                  <div className="space-y-2">
                    <Label>{t('notification.integrationKey.label')}</Label>
                    <CopyToClick text={userQuery.data.uid}>
                      <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50 hover:bg-muted transition-colors">
                        <code className="flex-1 text-sm font-mono break-all">
                          {userQuery.data.uid}
                        </code>
                      </div>
                    </CopyToClick>
                    <p className="text-xs text-muted-foreground">
                      {t('notification.integrationKey.hint')}
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="https://t.me/Quiz_gramm_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      @{t('notification.integrationKey.botUsername')}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {t('notification.integrationKey.error')}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
