export const DateAnswer = ({ dateValue }: { dateValue: string }) => {
  if (!dateValue) return null;

  return (
    <div className="text-xs lg:text-sm bg-muted p-3 rounded-md overflow-auto">
      <p className="text-xs lg:text-sm font-medium">{dateValue}</p>
    </div>
  );
};
