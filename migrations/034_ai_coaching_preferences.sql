CREATE TABLE IF NOT EXISTS user_ai_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  christie_depth VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (christie_depth IN ('quick','standard','detailed')),
  christie_challenge VARCHAR(20) NOT NULL DEFAULT 'challenging' CHECK (christie_challenge IN ('supportive','balanced','challenging')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
