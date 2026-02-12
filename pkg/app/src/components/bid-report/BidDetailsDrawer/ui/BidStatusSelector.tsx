import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BidStatusSelectorProps {
  status: string;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}

const BidStatusSelector = ({
  status,
  onStatusChange,
  isPending,
  t,
}: BidStatusSelectorProps & { t: (key: string) => string }) => {
  const BID_STATUSES = [
    { value: "create", label: t("bids.status.create") },
    { value: "in_progress", label: t("bids.status.in_progress") },
    { value: "rejected", label: t("bids.status.rejected") },
    { value: "success", label: t("bids.status.success") },
    { value: "completed", label: t("bids.status.completed") },
  ] as const;

  return (
    <div>
      <p className="text-xs lg:text-sm text-muted-foreground">
        {t("bids.details.status.label")}
      </p>
      <Select
        value={status}
        onValueChange={onStatusChange}
        disabled={isPending}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BID_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BidStatusSelector;
