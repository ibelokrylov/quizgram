import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

function NotFound() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-8 max-w-md mx-auto px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-light tracking-tight">404</h1>
          <p className="text-lg text-muted-foreground font-light">{t('notFound.title')}</p>
        </div>

        <Link to="/app">
          <Button variant="default">{t('notFound.button')}</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
