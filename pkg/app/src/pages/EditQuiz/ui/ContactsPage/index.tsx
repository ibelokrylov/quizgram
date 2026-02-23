import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz, QuizContact } from '@/entities/Quiz/quiz.type';
import { useContext } from 'react';
import { ContactEditForm } from './ui/ContactEditForm';

export const ContactsPage = () => {
  const { quiz, setQuiz } = useContext(CreateQuizContext);

  const contacts = quiz?.contact ?? [];

  function updateContact(contact: QuizContact) {
    const newContacts = [...(contacts ?? [])].map((c) => (c.uid === contact.uid ? contact : c));
    setQuiz({ ...quiz, contact: newContacts } as Quiz);
  }

  console.log(contacts);

  return (
    <div className="flex flex-col gap-10">
      {contacts?.map((contact) => (
        <ContactEditForm key={contact.uid} contact={contact} setContact={updateContact} />
      ))}
      {/* <Separator />
      <div>
        <Button
          variant={'outline'}
          onClick={() => setQuiz({ ...quiz, contact: [...(contacts ?? []), { uid: v7() }] } as Quiz)}
          size={'icon-sm'}
        >
          <Plus />
        </Button>
      </div> */}
    </div>
  );
};
