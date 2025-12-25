import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useExportBids } from "@/entities/Bid/useBids";
import type { BidsListFilters } from "@/entities/Bid/bid.type";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: Omit<BidsListFilters, "limit" | "offset">;
}

export function ExportDialog({
	open,
	onOpenChange,
	filters,
}: ExportDialogProps) {
	const { t } = useTranslation("common");
	const [format, setFormat] = useState<"csv" | "excel">("csv");
	const { mutateAsync: exportBids, isPending: isExporting } = useExportBids();

	const handleExport = async () => {
		try {
			await exportBids({ filters, format });
			onOpenChange(false);
		} catch (error) {
			// Ошибка обрабатывается в hook
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("bids.export.title")}</DialogTitle>
					<DialogDescription>{t("bids.export.description")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>{t("bids.export.format")}</Label>
						<RadioGroup
							value={format}
							onValueChange={(value) => setFormat(value as "csv" | "excel")}
						>
							<div className="flex items-start space-x-2">
								<RadioGroupItem value="csv" id="csv" />
								<div className="flex flex-col">
									<Label htmlFor="csv" className="cursor-pointer font-normal">
										{t("bids.export.csv")}
									</Label>
									<p className="text-xs text-muted-foreground">
										{t("bids.export.csv.description")}
									</p>
								</div>
							</div>
							<div className="flex items-start space-x-2">
								<RadioGroupItem value="excel" id="excel" />
								<div className="flex flex-col">
									<Label htmlFor="excel" className="cursor-pointer font-normal">
										{t("bids.export.excel")}
									</Label>
									<p className="text-xs text-muted-foreground">
										{t("bids.export.excel.description")}
									</p>
								</div>
							</div>
						</RadioGroup>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						{t("bids.export.cancel")}
					</Button>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? t("bids.export.downloading") : t("bids.export.download")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

