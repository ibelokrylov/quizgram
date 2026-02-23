import { z } from 'zod';

// Схема для общей статистики по дням
export const dailyStatsZod = z.object({
  quiz_uid: z.string(),
  generated_at: z.string(),
  ttl: z.number(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  daily: z.array(
    z.object({
      date: z.string(),
      total_opens: z.number(),
      unique_opens: z.number(),
      repeated_opens: z.number(),
      completed: z.number(),
      not_completed: z.number(),
    })
  ),
});

export type DailyStats = z.infer<typeof dailyStatsZod>;

// Схема для статистики по незавершенным квизам
export const abandonmentStatsZod = z.object({
  quiz_uid: z.string(),
  generated_at: z.string(),
  ttl: z.number(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  daily: z.array(
    z.object({
      date: z.string(),
      no_answers: z.number(),
      by_question: z.array(
        z.object({
          question_uid: z.string(),
          question_number: z.number(),
          question_title: z.string().optional(),
          question_type: z.string().optional(),
          count: z.number(),
        })
      ),
      completed_no_contacts: z.number(),
    })
  ),
});

export type AbandonmentStats = z.infer<typeof abandonmentStatsZod>;
