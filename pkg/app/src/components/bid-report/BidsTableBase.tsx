import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow } from "@/components/ui/table";
import type { BidListItem } from "@/entities/Bid/bid.type";
import { useTranslation } from "react-i18next";
import { BidsTableRow } from "./BidsTableRow";
import { BidsTableCard } from "./BidsTableCard";
import { BidsTablePagination } from "./BidsTablePagination";

interface BidsTableBaseProps {
  bids: BidListItem[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  observerTarget: React.RefObject<HTMLDivElement | null>;
}

export function BidsTableBase({
  bids,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  observerTarget,
}: BidsTableBaseProps) {
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
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-3">{t("bids.table.status")}</TableHead>
              <TableHead className="p-3">{t("bids.table.date")}</TableHead>
              <TableHead className="p-3">{t("bids.table.quiz")}</TableHead>
              <TableHead className="p-3">{t("bids.table.contacts")}</TableHead>
              <TableHead className="p-3">{t("bids.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bids.map((bid) => (
              <BidsTableRow key={bid.key} bid={bid} />
            ))}
          </TableBody>
        </Table>
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
