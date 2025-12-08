import { useState, type PropsWithChildren } from 'react';
import { AppContext } from './app.context';

export const AppContextProvider = (props: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [headerContent, setHeaderContent] = useState<React.ReactNode>(null);
  return <AppContext.Provider value={{ loading, setLoading, headerContent, setHeaderContent }}>{props.children}</AppContext.Provider>;
};
