const FileAnswerNew = ({ answer }: { answer: { files: any[]; answer: any } }) => {
  console.log(answer);
  return (
    <div className={'flex flex-col gap-2.5'}>
      {/* @ts-ignore*/}
      {answer.answer.map((i, idx) => {
        const file = answer.files.find((_, id) => id === i.__fileIndex);
        if (!file) return null;
        return (
          <div key={idx}>
            <a className={'text-blue-500 underline'} href={file.url}>
              {file.url?.split('/').pop()!}
            </a>
          </div>
        );
      })}
    </div>
  );
};

export default FileAnswerNew;
