CREATE TABLE IF NOT EXISTS file_favorites (
    id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid        NOT NULL,
    vfs_id       uuid        NOT NULL,
    path         text        NOT NULL,
    name         text        NOT NULL,
    is_directory boolean     NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT file_favorites_user_id_vfs_id_path_key UNIQUE (user_id, vfs_id, path)
);

CREATE INDEX IF NOT EXISTS file_favorites_user_id_idx ON file_favorites (user_id);
