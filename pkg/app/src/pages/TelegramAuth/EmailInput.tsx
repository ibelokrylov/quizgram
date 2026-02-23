import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';

const emailSchema = z.object({
  email: z.string().email('Неверный формат email'),
});

type EmailInputProps = {
  onSubmit: (email: string) => Promise<void>;
  loading?: boolean;
};

export function EmailInput({ onSubmit, loading = false }: EmailInputProps) {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (loading) return; // Предотвращаем повторные отправки

    setError(null);

    // Валидация email
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      const errorMessage = validation.error.issues[0]?.message || t('telegram.auth.email.invalid');
      setError(errorMessage);
      return;
    }

    try {
      await onSubmit(email);
    } catch (err: any) {
      const errorMessage = err?.message || err?.error || t('telegram.auth.email.error');
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('telegram.auth.email.title')}</CardTitle>
        <CardDescription>{t('telegram.auth.email.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">{t('telegram.auth.email.label')}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder={t('telegram.auth.email.placeholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && email) {
                  handleSubmit();
                }
              }}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </Field>
          <Field>
            <Button
              onClick={handleSubmit}
              disabled={loading || !email}
              loading={loading}
              className="w-full"
            >
              {t('telegram.auth.email.button')}
            </Button>
          </Field>
          <Field>
            <Link to="/" className="flex justify-center items-center">
              <Button variant="ghost">{t('login.button')}</Button>
            </Link>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
