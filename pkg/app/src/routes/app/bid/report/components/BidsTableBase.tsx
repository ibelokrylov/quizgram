import { Card } from "@/components/ui/card";
import type { BidListItem } from "@/entities/Bid/bid.type";
import { BidsTableRow } from "./BidsTableRow";
import { BidsTableCard } from "./BidsTableCard";
import { BidsTablePagination } from "./BidsTablePagination";

interface BidsTableBaseProps {
  bids: BidListItem[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  observerTarget: React.RefObject<HTMLDivElement>;
}

export function BidsTableBase({
  bids,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  observerTarget,
}: BidsTableBaseProps) {
  if (bids.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Заявки не найдены</p>
      </Card>
    );
  }

  return (
    <>
      {/* Десктоп: таблица в одну строку */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-semibold">Статус</th>
                <th className="text-left p-3 text-sm font-semibold">Дата</th>
                <th className="text-left p-3 text-sm font-semibold">Квиз</th>
                <th className="text-left p-3 text-sm font-semibold">Контакты</th>
                <th className="text-left p-3 text-sm font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => (
                <BidsTableRow key={bid.key} bid={bid} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Мобильные: компактные карточки */}
      <div className="md:hidden space-y-2">
        {bids.map((bid) => (
          <BidsTableCard key={bid.key} bid={bid} />
        ))}
      </div>

      {/* Пагинация */}
      <BidsTablePagination
        observerTarget={observerTarget}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        bidsCount={bids.length}
      />
    </>
  );
}
