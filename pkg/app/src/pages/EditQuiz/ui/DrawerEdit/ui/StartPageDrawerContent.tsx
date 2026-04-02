import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';
import { useContext } from 'react';
import { StandardStartPage } from './StandardStartPage';

export const StartPageDrawerContent = () => {
  const ctxDrawer = useContext(DrawerEditContext);
  const ctx = useContext(CreateQuizContext);

  if (ctx.quiz?.startPage === undefined) return null;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t('edit-quiz.start-page.title')}</DrawerTitle>
      </DrawerHeader>
      <div>
        <Tabs
          value={
            ctxDrawer?.uid
              ? ctxDrawer?.uid
              : Array.isArray(ctx.quiz.startPage)
                ? //@ts-ignore
                  ctx.quiz.startPage[0].uuid
                : ctx.quiz.startPage.uuid
          }
          className="items-center justify-center w-full"
        >
          <TabsList>
            {Array.isArray(ctx.quiz?.startPage) ? (
              <>
                {ctx?.quiz.startPage.map((i, idx) => (
                  <TabsTrigger
                    onClick={() => ctxDrawer?.setUid(i.uuid ?? null)}
                    key={i.uuid}
                    value={String(i.uuid)}
                  >
                    {idx === 0 ? 'A' : 'B'}
                  </TabsTrigger>
                ))}
              </>
            ) : (
              <TabsTrigger value={ctx.quiz.startPage.uuid}>A</TabsTrigger>
            )}
          </TabsList>
          {Array.isArray(ctx.quiz.startPage) ? (
            <>
              {ctx.quiz.startPage.map((i, idx) => (
                <TabsContent className="w-full" key={idx} value={String(i.uuid)}>
                  <StandardStartPage p={idx} />
                </TabsContent>
              ))}
            </>
          ) : (
            <TabsContent className="w-ful " value={String(ctx.quiz.startPage?.uuid)}>
              <StandardStartPage p={0} />
            </TabsContent>
          )}
          <TabsContent value="account">Make changes to your account here.</TabsContent>
          <TabsContent value="password">Change your password here.</TabsContent>
        </Tabs>
      </div>
    </>
  );
};
