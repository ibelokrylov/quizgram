import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BidsReportPage } from "./components/BidsReportPage";

// Схема валидации для search params
const bidsReportSearchSchema = z.object({
  quiz_uid: z.string().optional(),
  status: z.string().optional(),
  isFull: z.preprocess(
    (val) => (typeof val === 'boolean' ? String(val) : val),
    z.string().optional()
  ),
  limit: z.coerce.number().optional().default(10),
});

export const Route = createFileRoute("/app/bid/report")({
  component: BidsReportPage,
  validateSearch: (search) => bidsReportSearchSchema.parse(search),
});
