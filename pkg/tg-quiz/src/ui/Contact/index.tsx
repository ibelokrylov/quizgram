import { useContext } from 'react';
import { AppContext } from '../../App.context';

export const Contact = () => {
  const { quiz } = useContext(AppContext);
  const contacts = quiz?.contact;

  console.log(quiz);
  return <div>Contact</div>;
};
