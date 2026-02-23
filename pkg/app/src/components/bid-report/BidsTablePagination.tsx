import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';

interface BidsTablePaginationProps {
  observerTarget: React.RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  bidsCount: number;
}

export function BidsTablePagination({
  observerTarget,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  bidsCount,
}: BidsTablePaginationProps) {
  return (
    <div ref={observerTarget} className="flex flex-col items-center gap-2 py-4 min-h-[50px]">
      {isFetchingNextPage && <Loader />}
      {hasNextPage && !isFetchingNextPage && (
        <Button onClick={() => fetchNextPage()} variant="outline">
          Загрузить ещё
        </Button>
      )}
      {!hasNextPage && bidsCount > 0 && (
        <p className="text-sm text-muted-foreground">Все заявки загружены</p>
      )}
    </div>
  );
}
