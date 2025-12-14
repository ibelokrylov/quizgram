import { AnswerOption } from './ui/AnswerOption';
import { DataQuestion } from './ui/Data';
import { FileQuestion } from './ui/FileQuestion';
import { PageQuestion } from './ui/PageQuestion';
import { QuestionGroup } from './ui/QuestionGroup';
import { RatingQuestion } from './ui/RatingQuestion';
import { SelectQuestion } from './ui/SelectQuestion';
import { SliderQuestion } from './ui/SliderQuestion';
import { TextInput } from './ui/TextInput';
import { VariantImage } from './ui/VariantImage';
import { VariantImageText } from './ui/VariantImageText';

export const renderQuestion = {
  answer_option: <AnswerOption />,
  variant_image: <VariantImage />,
  variant_image_text: <VariantImageText />,
  input: <TextInput />,
  select: <SelectQuestion />,
  date: <DataQuestion />,
  slide: <SliderQuestion />,
  file: <FileQuestion />,
  page: <PageQuestion />,
  rating: <RatingQuestion />,
  question_group: <QuestionGroup />,
};
