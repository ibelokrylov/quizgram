import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { quizContactFormType, type QuizContactForm, type QuizContactFormType } from '@/entities/Quiz/quiz.type';
import { CaseUpper, Mail, Phone, UserPen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Email } from './ui/Email';
import { Name } from './ui/Name';
import { PhoneUi } from './ui/Phone';
import { TextUi } from './ui/Text';

export const ContactDrawer = ({
  open,
  setOpen,
  currentAddedFields,
  changeForm,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentAddedFields: Set<QuizContactFormType>;
  changeForm: (form: QuizContactForm) => void;
}) => {
  const { t } = useTranslation();
  const keys = Object.keys(quizContactFormType.enum);
  const firstNotAddedField = keys.find((i) => !currentAddedFields.has(i as QuizContactFormType));

  const renderForm: Record<
    QuizContactFormType,
    {
      content: React.ReactNode;
      label: React.ReactNode;
    }
  > = {
    name: {
      content: <Name onChange={changeForm} />,
      label: (
        <div className={'flex items-center gap-2'}>
          <UserPen />
          <div>{t('edit-quiz.contacts-page.contact.form.name.label')}</div>
        </div>
      ),
    },
    email: {
      content: <Email onChange={changeForm} />,
      label: (
        <div className={'flex items-center gap-2'}>
          <Mail />
          <div>{t('edit-quiz.contacts-page.contact.form.email.label')}</div>
        </div>
      ),
    },
    phone: {
      content: <PhoneUi onChange={changeForm} />,
      label: (
        <div className={'flex items-center gap-2'}>
          <Phone />
          <div>{t('edit-quiz.contacts-page.contact.form.phone.label')}</div>
        </div>
      ),
    },
    text: {
      content: <TextUi onChange={changeForm} />,
      label: (
        <div className={'flex items-center gap-2'}>
          <CaseUpper />
          <div>{t('edit-quiz.contacts-page.contact.form.text.label')}</div>
        </div>
      ),
    },
  };

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
    >
      <DrawerContent className={'flex flex-col items-center justify-center'}>
        <Tabs
          defaultValue={firstNotAddedField ?? keys[0]}
          className='w-[400px] pt-3 pb-3'
        >
          <TabsList>
            {keys.map((i) => (
              <TabsTrigger
                value={i}
                key={i}
                disabled={currentAddedFields.has(i as QuizContactFormType)}
              >
                {renderForm[i as QuizContactFormType].label}
              </TabsTrigger>
            ))}
          </TabsList>
          {keys.map((i) => (
            <TabsContent
              key={i}
              value={i}
            >
              {renderForm[i as QuizContactFormType].content}
            </TabsContent>
          ))}
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
};
