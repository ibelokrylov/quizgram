import { AppContext } from '@/app/context/app.context';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLocation } from '@tanstack/react-router';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';

const title: Record<string, string> = {
  app: 'titles.app',
};

const titlePatterns: Array<{ pattern: RegExp; titleKey: string }> = [
  {
    pattern: /^\/app\/quiz\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    titleKey: 'titles.quiz',
  },
  {
    pattern: /^\/app\/quiz\/?$/,
    titleKey: 'titles.quiz',
  },
  {
    pattern: /^\/app\/dashboard$/,
    titleKey: 'titles.dashboard',
  },
  {
    pattern: /^\/app\/bid\/report$/,
    titleKey: 'titles.bidReport',
  },
  {
    pattern: /^\/app\/bid\/statistic$/,
    titleKey: 'titles.bidStatistic',
  },
];

function getTitleByPath(pathname: string): string | undefined {
  // Сначала проверяем паттерны
  for (const { pattern, titleKey } of titlePatterns) {
    if (pattern.test(pathname)) {
      return titleKey;
    }
  }

  return title[pathname.replace('/', '')];
}

export function SiteHeader() {
  const { headerContent } = useContext(AppContext);
  const router = useLocation();
  const { t } = useTranslation();
  const titleKey = getTitleByPath(router.pathname);

  return (
    <header className="flex h-[68px] sm:h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex flex-row gap-2 items-center max-w-[1400px] w-full pr-3">
        <div className="flex sm:hidden flex-wrap w-full items-center gap-1 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <div className={'flex flex-col gap-1'}>
            <h1 className="text-base font-medium">{titleKey ? t(titleKey) : t('titles.app')}</h1>
            {headerContent ? <>{headerContent}</> : null}
          </div>
        </div>
        <div className="hidden sm:flex flex-wrap w-full items-center gap-1 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <h1 className="text-base font-medium">{titleKey ? t(titleKey) : t('titles.app')}</h1>
          {headerContent ? (
            <div className="flex items-center gap-2">
              <Separator orientation={'vertical'} />
              {headerContent}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
