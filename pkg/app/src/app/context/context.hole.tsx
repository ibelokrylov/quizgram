import { AuthContextProvider } from "@/entities/User/auth.context.provider";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import { AppContextProvider } from "./app.context.provider";

export const ContextHole = (props: PropsWithChildren) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppContextProvider>
        <AuthContextProvider>{props.children}</AuthContextProvider>
      </AppContextProvider>
    </ThemeProvider>
  );
};
