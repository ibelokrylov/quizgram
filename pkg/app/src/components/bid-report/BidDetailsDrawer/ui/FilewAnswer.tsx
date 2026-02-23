import { File } from 'lucide-react';

export const truncateFileName = (fileName: string, maxLength: number = 40): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - (extension?.length || 0) - 4);
  return `${truncatedName}...${extension}`;
};

export const FileAnswer = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => (
  <div className="text-xs lg:text-sm bg-muted p-3 rounded-md">
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
    >
      <File className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-muted-foreground" />
      <span className="truncate text-xs lg:text-sm font-medium">{truncateFileName(fileName)}</span>
    </a>
  </div>
);
