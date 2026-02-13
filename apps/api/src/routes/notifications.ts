// Notification routes
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, notifications } from '../db';
import { AuthContext, authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, IdParamSchema, SuccessResponseSchema } from '../schemas/common';
import { NotificationSchema } from '../schemas/notification';

const app = new OpenAPIHono<{ Variables: AuthContext }>();

app.use('*', authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications - Get agent's notifications
// ─────────────────────────────────────────────────────────────────────────────

const getNotificationsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Notifications'],
  summary: 'Get notifications',
  description: 'Retrieve notifications for the authenticated agent',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      unread: z.enum(['true', 'false']).optional().openapi({ description: 'Filter unread only', example: 'true' }),
      limit: z.string().optional().openapi({ description: 'Max items', example: '50' }),
    }),
  },
  responses: {
    200: {
      description: 'List of notifications',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({
            notifications: z.array(NotificationSchema),
            unreadCount: z.number().openapi({ example: 5 }),
          })),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(getNotificationsRoute, async (c) => {
  const agent = c.get('agent');
  const db = getDb();
  const unreadOnly = c.req.query('unread') === 'true';
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  const query = unreadOnly
    ? and(eq(notifications.agentId, agent.id), eq(notifications.read, false))
    : eq(notifications.agentId, agent.id);
  
  const agentNotifications = await db.query.notifications.findMany({
    where: query,
    orderBy: desc(notifications.createdAt),
    limit: Math.min(limit, 100),
  });
  
  return c.json({
    success: true,
    data: {
      notifications: agentNotifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        betId: n.betId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
      })),
      unreadCount: agentNotifications.filter(n => !n.read).length,
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/:id/read - Mark notification as read
// ─────────────────────────────────────────────────────────────────────────────

const markReadRoute = createRoute({
  method: 'post',
  path: '/:id/read',
  tags: ['Notifications'],
  summary: 'Mark notification as read',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Marked as read',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    404: { description: 'Notification not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(markReadRoute, async (c) => {
  const agent = c.get('agent');
  const { id: notificationId } = c.req.valid('param');
  const db = getDb();
  
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.agentId, agent.id)
    ),
  });
  
  if (!notification) {
    return c.json({ success: false, error: 'Notification not found' }, 404);
  }
  
  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
  
  return c.json({ success: true }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/read-all - Mark all notifications as read
// ─────────────────────────────────────────────────────────────────────────────

const markAllReadRoute = createRoute({
  method: 'post',
  path: '/read-all',
  tags: ['Notifications'],
  summary: 'Mark all notifications as read',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'All notifications marked as read',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
  },
});

app.openapi(markAllReadRoute, async (c) => {
  const agent = c.get('agent');
  const db = getDb();
  
  await db.update(notifications)
    .set({ read: true })
    .where(and(
      eq(notifications.agentId, agent.id),
      eq(notifications.read, false)
    ));
  
  return c.json({ success: true }, 200);
});

export default app;
