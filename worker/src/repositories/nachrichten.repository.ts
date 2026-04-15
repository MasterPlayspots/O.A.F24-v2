// Nachrichten Repository - Data access layer for conversations & messages

// ============================================
// Row types for query results
// ============================================

export interface ConversationListItem {
  id: string;
  otherUserName: string;
  otherUserId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  inhalt: string;
  created_at: string;
}

// ============================================
// Reads
// ============================================

export async function listConversations(
  db: D1Database,
  userId: string
): Promise<ConversationListItem[]> {
  // Get all conversations the user participates in, with the other
  // participant's name, the last message, and unread count.
  const result = await db
    .prepare(
      `SELECT
        c.id,
        u.id AS otherUserId,
        (u.first_name || ' ' || u.last_name) AS otherUserName,
        lm.inhalt AS lastMessage,
        lm.created_at AS lastMessageAt,
        COALESCE(unread.cnt, 0) AS unreadCount
      FROM conversation_participants cp
      JOIN conversations c ON c.id = cp.conversation_id
      JOIN conversation_participants cp2
        ON cp2.conversation_id = c.id AND cp2.user_id != ?
      JOIN users u ON u.id = cp2.user_id
      LEFT JOIN (
        SELECT conversation_id, inhalt, created_at
        FROM messages m1
        WHERE m1.created_at = (
          SELECT MAX(m2.created_at) FROM messages m2
          WHERE m2.conversation_id = m1.conversation_id
        )
      ) lm ON lm.conversation_id = c.id
      LEFT JOIN (
        SELECT m.conversation_id, COUNT(*) AS cnt
        FROM messages m
        JOIN conversation_participants cpx
          ON cpx.conversation_id = m.conversation_id AND cpx.user_id = ?
        WHERE m.sender_id != ?
          AND (cpx.last_read_at IS NULL OR m.created_at > cpx.last_read_at)
        GROUP BY m.conversation_id
      ) unread ON unread.conversation_id = c.id
      WHERE cp.user_id = ?
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC`
    )
    .bind(userId, userId, userId, userId)
    .all<ConversationListItem>();

  return result.results || [];
}

export async function getMessages(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<MessageRow[] | null> {
  // Verify user is a participant
  const participant = await db
    .prepare("SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?")
    .bind(conversationId, userId)
    .first<{ "1": number }>();

  if (!participant) return null;

  const result = await db
    .prepare(
      `SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        (u.first_name || ' ' || u.last_name) AS sender_name,
        m.inhalt,
        m.created_at
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC`
    )
    .bind(conversationId)
    .all<MessageRow>();

  return result.results || [];
}

// ============================================
// Writes
// ============================================

export async function sendMessage(
  db: D1Database,
  conversationId: string,
  senderId: string,
  inhalt: string
): Promise<MessageRow | null> {
  // Verify sender is a participant
  const participant = await db
    .prepare("SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?")
    .bind(conversationId, senderId)
    .first<{ "1": number }>();

  if (!participant) return null;

  const id = crypto.randomUUID();

  await db.batch([
    db
      .prepare("INSERT INTO messages (id, conversation_id, sender_id, inhalt) VALUES (?, ?, ?, ?)")
      .bind(id, conversationId, senderId, inhalt),
    db
      .prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
      .bind(conversationId),
  ]);

  // Return the created message with sender name
  const msg = await db
    .prepare(
      `SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        (u.first_name || ' ' || u.last_name) AS sender_name,
        m.inhalt,
        m.created_at
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?`
    )
    .bind(id)
    .first<MessageRow>();

  return msg || null;
}

export async function startConversation(
  db: D1Database,
  fromUserId: string,
  toUserId: string,
  firstMessage: string
): Promise<{ conversationId: string; message: MessageRow } | null> {
  // Verify target user exists
  const targetUser = await db
    .prepare("SELECT id FROM users WHERE id = ?")
    .bind(toUserId)
    .first<{ id: string }>();

  if (!targetUser) return null;

  // Check for existing conversation between these two users
  const existing = await db
    .prepare(
      `SELECT cp1.conversation_id
      FROM conversation_participants cp1
      JOIN conversation_participants cp2
        ON cp2.conversation_id = cp1.conversation_id AND cp2.user_id = ?
      WHERE cp1.user_id = ?
      LIMIT 1`
    )
    .bind(toUserId, fromUserId)
    .first<{ conversation_id: string }>();

  if (existing) {
    // Conversation already exists; just send a message into it
    const msg = await sendMessage(db, existing.conversation_id, fromUserId, firstMessage);
    if (!msg) return null;
    return { conversationId: existing.conversation_id, message: msg };
  }

  const convId = crypto.randomUUID();
  const msgId = crypto.randomUUID();

  await db.batch([
    db.prepare("INSERT INTO conversations (id) VALUES (?)").bind(convId),
    db
      .prepare("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)")
      .bind(convId, fromUserId),
    db
      .prepare("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)")
      .bind(convId, toUserId),
    db
      .prepare("INSERT INTO messages (id, conversation_id, sender_id, inhalt) VALUES (?, ?, ?, ?)")
      .bind(msgId, convId, fromUserId, firstMessage),
  ]);

  const msg = await db
    .prepare(
      `SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        (u.first_name || ' ' || u.last_name) AS sender_name,
        m.inhalt,
        m.created_at
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?`
    )
    .bind(msgId)
    .first<MessageRow>();

  if (!msg) return null;
  return { conversationId: convId, message: msg };
}

export async function markRead(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<boolean> {
  // Verify user is a participant
  const participant = await db
    .prepare("SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?")
    .bind(conversationId, userId)
    .first<{ "1": number }>();

  if (!participant) return false;

  await db
    .prepare(
      "UPDATE conversation_participants SET last_read_at = datetime('now') WHERE conversation_id = ? AND user_id = ?"
    )
    .bind(conversationId, userId)
    .run();

  return true;
}
