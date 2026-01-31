-- LinkedIn Reply Guy - Supabase Schema

-- Comments table
CREATE TABLE IF NOT EXISTS linkedin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT,
  post_url TEXT,
  post_text TEXT,
  post_author TEXT,
  author_title TEXT,
  author_followers INTEGER,
  comment_text TEXT,
  comment_url TEXT,
  strategy TEXT,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  school_rating TEXT,
  school_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_comments_posted ON linkedin_comments(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_comments_strategy ON linkedin_comments(strategy);
CREATE INDEX IF NOT EXISTS idx_linkedin_comments_impressions ON linkedin_comments(impressions DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_comments_school ON linkedin_comments(school_rating);

-- Connections table
CREATE TABLE IF NOT EXISTS linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_url TEXT UNIQUE,
  name TEXT,
  title TEXT,
  company TEXT,
  source TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_connections_accepted ON linkedin_connections(accepted);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_source ON linkedin_connections(source);

-- Sync status
CREATE TABLE IF NOT EXISTS linkedin_sync_status (
  id TEXT PRIMARY KEY,
  synced_at TIMESTAMPTZ,
  data JSONB
);
