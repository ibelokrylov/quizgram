import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { QuizContactForm } from '@/entities/Quiz/quiz.type';
import { Label } from '@radix-ui/react-label';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const Email = (props: {
  onChange: (form: QuizContactForm) => void;
  form?: QuizContactForm;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<QuizContactForm>(
    props.form ?? {
      type: 'email',
      label: t('edit-quiz.contacts-page.contact.form.email.help.label.placeholder'),
      placeholder: t('edit-quiz.contacts-page.contact.form.email.help.placeholder.placeholder'),
      required: true,
      mask: undefined,
      step: 0,
    }
  );

  return (
    <div className={'flex flex-col gap-5'}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="label">{t('edit-quiz.contacts-page.contact.form.email.help.label')}</Label>
        <Input
          id="label"
          value={form.label}
          placeholder={t('edit-quiz.contacts-page.contact.form.email.help.label.placeholder')}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="placeholder">
          {t('edit-quiz.contacts-page.contact.form.email.help.placeholder')}
        </Label>
        <Input
          id="placeholder"
          value={form.placeholder}
          placeholder={t('edit-quiz.contacts-page.contact.form.email.help.placeholder.placeholder')}
          onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="key">
          {t('edit-quiz.contacts-page.contact.form.email.help.key.label')}
        </Label>
        <Input id="key" value={form.type} disabled />
      </div>
      <div className={'flex gap-3 items-center'}>
        <Checkbox
          id="required"
          checked={form.required}
          onCheckedChange={(checked) => setForm({ ...form, required: Boolean(checked) })}
        />
        <Label htmlFor="required">
          {t('edit-quiz.contacts-page.contact.form.email.help.required')}
        </Label>
      </div>
      <div>
        <Button variant={'outline'} onClick={() => props.onChange(form)}>
          {t('edit-quiz.contacts-page.contact.form.email.help.add')}
        </Button>
      </div>
    </div>
  );
};
