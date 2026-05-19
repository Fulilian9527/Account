-- 将 WebDAV 配置迁移到 Supabase
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS webdav_url TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS webdav_username TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS webdav_password TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS webdav_path TEXT DEFAULT '';
