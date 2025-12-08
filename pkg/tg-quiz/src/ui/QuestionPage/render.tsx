import { AnswerOption } from './ui/AnswerOption';
import { DataQuestion } from './ui/Data';
import { SelectQuestion } from './ui/SelectQuestion';
import { TextInput } from './ui/TextInput';
import { VariantImage } from './ui/VariantImage';
import { VariantImageText } from './ui/VariantImageText';

export const renderQuestion = {
  answer_option: <AnswerOption />,
  variant_image: <VariantImage />,
  variant_image_text: <VariantImageText />,
  input: <TextInput />,
  select: <SelectQuestion />,
  data: <DataQuestion />,
};
