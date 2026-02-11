// Common schemas for API responses and shared types
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  success: z.literal(false).openapi({ example: false }),
  error: z.string().openapi({ 
    description: 'Error message describing what went wrong',
    example: 'Invalid request parameters' 
  }),
}).openapi('ErrorResponse');

export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true).openapi({ example: true }),
    data: dataSchema,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Common Parameter Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const IdParamSchema = z.object({
  id: z.string().length(12).openapi({
    description: '12-character CUID identifier',
    example: 'ckz1a2b3c4d5',
    param: { name: 'id', in: 'path' }
  })
});

export const TokenParamSchema = z.object({
  token: z.string().openapi({
    description: 'Claim token for agent verification',
    example: 'abc123def456',
    param: { name: 'token', in: 'path' }
  })
});

// ─────────────────────────────────────────────────────────────────────────────
// Common Field Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const EthereumAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .openapi({
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  });

export const TransactionHashSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{64}$/)
  .openapi({
    description: 'Ethereum transaction hash',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  });

export const TimestampSchema = z.string()
  .datetime()
  .openapi({
    description: 'ISO 8601 timestamp',
    example: '2024-02-10T19:14:30Z'
  });
