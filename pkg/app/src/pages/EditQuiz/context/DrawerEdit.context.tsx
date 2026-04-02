import { useNavigate } from '@tanstack/react-router';
import { createContext, useState, type PropsWithChildren } from 'react';

export type DrawerContextType = 'startPage' | 'question' | 'thxPage' | 'resaults' | 'contact';
type Context = {
  open: boolean;
  setOpen: (v: boolean) => void;
  uid: string | null;
  setUid: (v: string | null) => void;
  type: DrawerContextType | null;
  setType: (v: DrawerContextType) => void;
};
export const DrawerEditContext = createContext<Context>({
  open: false,
  setOpen: () => {},
  type: null,
  setType: () => {},
  uid: null,
  setUid: () => {},
});

export const DrawereditContextProvider = (props: PropsWithChildren) => {
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [type, setType] = useState<DrawerContextType | null>(null);

  const navigate = useNavigate();

  function changeUid(v: string | null) {
    navigate({ search: (prev) => ({ ...prev, uid: v }) });
  }

  return (
    <DrawerEditContext.Provider value={{ open, setOpen, uid, setUid, type, setType }}>
      {props.children}
    </DrawerEditContext.Provider>
  );
};
