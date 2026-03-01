import { AuthContextProvider } from '@/entities/User/auth.context.provider';
import { ThemeProvider } from 'next-themes';
import type { PropsWithChildren } from 'react';
import { AppContextProvider } from './app.context.provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const ContextHole = (props: PropsWithChildren) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AppContextProvider>
          <AuthContextProvider>{props.children}</AuthContextProvider>
        </AppContextProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};
