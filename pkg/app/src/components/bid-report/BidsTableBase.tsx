import { Card } from "@/components/ui/card";
import {
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
} from "@/components/ui/table";
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
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="p-3">Статус</TableHead>
							<TableHead className="p-3">Дата</TableHead>
							<TableHead className="p-3">Квиз</TableHead>
							<TableHead className="p-3">Контакты</TableHead>
							<TableHead className="p-3">Действия</TableHead>
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
