import { useRef } from 'react';
import { Standard } from './ui/Standard';

export const StartPage = () => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref}>
      <Standard refparent={ref} />
    </div>
  );
};
