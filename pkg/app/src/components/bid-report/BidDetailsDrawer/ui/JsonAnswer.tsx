const JsonAnswer = ({ answer }: { answer: any }) => (
  <pre className="text-xs lg:text-sm bg-muted p-3 rounded-md overflow-auto">
    {JSON.stringify(answer, null, 2)}
  </pre>
);

export default JsonAnswer;
