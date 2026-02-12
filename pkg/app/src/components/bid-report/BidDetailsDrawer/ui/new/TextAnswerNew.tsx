const TextAnswerNew = ({ text }: { text: string }) => (
  <div className="text-xs lg:text-sm bg-muted p-3 rounded-md overflow-auto">
    <p className="text-xs lg:text-sm font-medium">{text}</p>
  </div>
);

export default TextAnswerNew;
