import { Input } from '@/components/ui/input';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import http from '@/lib/http';
import { t } from 'i18next';
import { useContext, useState } from 'react';

export function QuizName() {
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const [name, setName] = useState(quiz?.name);

  async function updateName() {
    if (!quiz?.uid || !name) {
      return;
    }
    if (quiz?.name === name) {
      return;
    }
    try {
      await http({
        url: `/v1/quiz/name/${quiz?.uid}`,
        method: 'PUT',
        body: { name },
      });
      if (quiz) {
        setQuiz({ ...quiz, name, updatedAt: new Date() } as Quiz, true);
      }
    } catch (err) {
      console.log(err);
    }
  }
  return (
    <div className="px-4 lg:px-0 pt-3">
      <Input
        key={quiz?.name}
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onBlur={updateName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            updateName();
          }
        }}
        placeholder={t('edit-quiz.name.placeholder')}
      />
    </div>
  );
}
