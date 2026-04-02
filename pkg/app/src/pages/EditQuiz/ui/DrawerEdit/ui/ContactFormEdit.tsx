import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz, QuizContact } from '@/entities/Quiz/quiz.type';
import { t } from 'i18next';
import { useContext } from 'react';
import { ContactEditForm } from '../../ContactsPage/ui/ContactEditForm';

export const ContactFormEdit = () => {
  const { quiz, setQuiz } = useContext(CreateQuizContext);

  const contacts = quiz?.contact ?? [];

  function updateContact(contact: QuizContact) {
    const newContacts = [...(contacts ?? [])].map((c) => (c.uid === contact.uid ? contact : c));
    setQuiz({ ...quiz, contact: newContacts } as Quiz);
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t('bids.info.dropout.location.contacts')}</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-4">
        {contacts?.map((contact) => (
          <ContactEditForm key={contact.uid} contact={contact} setContact={updateContact} />
        ))}
      </div>
    </>
  );
};
