// Notification routes
import { OpenAPIHono } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, notifications } from '../db';
import { AuthContext, authMiddleware } from '../middleware/auth';

const app = new OpenAPIHono<{ Variables: AuthContext }>();

app.use('*', authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications - Get agent's notifications
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
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
    notifications: agentNotifications.map(n => ({
      id: n.id,
      type: n.type,
      message: n.message,
      betId: n.betId,
      read: n.read,
      createdAt: n.createdAt,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    })),
    unreadCount: agentNotifications.filter(n => !n.read).length,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/:id/read - Mark notification as read
// ─────────────────────────────────────────────────────────────────────────────

app.post('/:id/read', async (c) => {
  const agent = c.get('agent');
  const notificationId = c.req.param('id');
  const db = getDb();
  
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.agentId, agent.id)
    ),
  });
  
  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }
  
  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
  
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/read-all - Mark all notifications as read
// ─────────────────────────────────────────────────────────────────────────────

app.post('/read-all', async (c) => {
  const agent = c.get('agent');
  const db = getDb();
  
  await db.update(notifications)
    .set({ read: true })
    .where(and(
      eq(notifications.agentId, agent.id),
      eq(notifications.read, false)
    ));
  
  return c.json({ success: true });
});

export default app;
