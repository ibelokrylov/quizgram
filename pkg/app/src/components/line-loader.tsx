import { cn } from "@/lib/utils";

export const LineLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("w-full h-full flex justify-center items-center", className)}>
      <div className="w-full h-full bg-gray-200 dark:bg-neutral-800 rounded-md p-0.5 animate-pulse"></div>
    </div>
  );
};
