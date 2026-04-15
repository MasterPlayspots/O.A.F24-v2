-- Forum tables for the Berater-Forum feature

CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  titel TEXT NOT NULL,
  inhalt TEXT NOT NULL,
  kategorie TEXT DEFAULT 'allgemein',
  pinned INTEGER DEFAULT 0,
  locked INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  inhalt TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id)
);

CREATE INDEX idx_threads_kategorie ON forum_threads(kategorie);
CREATE INDEX idx_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_posts_thread ON forum_posts(thread_id);
