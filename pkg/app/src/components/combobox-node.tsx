import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
} from '@/components/ui/combobox';

export function ComboboxNode(props: { items: string[]; placeholder: string }) {
  return (
    <Combobox items={props.items}>
      <ComboboxInput placeholder="Select a framework" />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>{(item) => <div key={item}>{item}</div>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
