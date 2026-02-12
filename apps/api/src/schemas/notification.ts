// Notification schemas
import { z } from 'zod';
import { TimestampSchema } from './common';

// ─────────────────────────────────────────────────────────────────────────────
// Notification Enum
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationTypeSchema = z.enum([
  'bet_won',
  'bet_lost',
  'bet_countered',
  'bet_conceded',
  'dispute_raised',
  'dispute_resolved',
  'dispute_response',
  'payout_ready',
  'win_claimed',
  'bet_expired',
]).openapi({
  description: 'Type of notification',
  example: 'bet_won'
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification Schema
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: z.string().openapi({ description: 'Notification ID', example: 'notif123' }),
  type: NotificationTypeSchema,
  message: z.string().openapi({ description: 'Notification message', example: 'You won the bet!' }),
  betId: z.string().nullable().openapi({ description: 'Related bet ID', example: 'bet123' }),
  read: z.boolean().openapi({ description: 'Read status', example: false }),
  createdAt: TimestampSchema,
  metadata: z.record(z.any()).nullable().openapi({ description: 'Additional metadata' }),
}).openapi('Notification');
