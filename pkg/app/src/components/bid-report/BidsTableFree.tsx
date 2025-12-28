import { Card } from "@/components/ui/card";
import type { BidListItem } from "@/entities/Bid/bid.type";
import { useTranslation } from "react-i18next";
import { BidsTableRow } from "./BidsTableRow";
import { BidsTableCard } from "./BidsTableCard";
import { BidsTablePagination } from "./BidsTablePagination";

interface BidsTableFreeProps {
  bids: BidListItem[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  observerTarget: React.RefObject<HTMLDivElement | null>;
}

export function BidsTableFree({
  bids,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  observerTarget,
}: BidsTableFreeProps) {
  const { t } = useTranslation("common");

  if (bids.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{t("bids.table.empty")}</p>
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
                <th className="text-left p-3 text-sm font-semibold">{t("bids.table.status")}</th>
                <th className="text-left p-3 text-sm font-semibold">{t("bids.table.date")}</th>
                <th className="text-left p-3 text-sm font-semibold">{t("bids.table.quiz")}</th>
                <th className="text-left p-3 text-sm font-semibold">{t("bids.table.contacts")}</th>
                <th className="text-left p-3 text-sm font-semibold">{t("bids.table.actions")}</th>
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
