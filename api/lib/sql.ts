interface Definition {
  name: string;
  sql: string;
}

export const tables: Definition[] = [
  {
    name: "users",
    sql: `
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            two_factor_secret TEXT,
            change_password BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
  },
  {
    name: "permissions",
    sql: `
          CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            resource TEXT NOT NULL,
            action TEXT NOT NULL,
            description TEXT NOT NULL,
            UNIQUE(resource, action)
          )
        `,
  },
  {
    name: "roles",
    sql: `
          CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            is_system_role BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
  },
  {
    name: "role_permissions",
    sql: `
          CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
          )
        `,
  },
  {
    name: "user_roles",
    sql: `
          CREATE TABLE IF NOT EXISTS user_roles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            assigned_by TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by) REFERENCES users (id)
          )
        `,
  },
  {
    name: "servers",
    sql: `
          CREATE TABLE IF NOT EXISTS servers (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            version TEXT NOT NULL,
            status TEXT NOT NULL,
            error TEXT,
            type TEXT CHECK(type IN ('vanilla', 'paper', 'bukkit', 'spigot', 'fabric', 'forge', 'bedrock')) NOT NULL,
            ports TEXT NOT NULL DEFAULT '[]',
            memory TEXT NOT NULL DEFAULT '1G',
            container_id TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
  },
  {
    name: "server_permissions",
    sql: `
          CREATE TABLE IF NOT EXISTS server_permissions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            server_id TEXT NOT NULL,
            permissions TEXT NOT NULL, -- JSON array of actions
            granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            granted_by TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users (id)
          )
        `,
  },
  {
    name: "server_groups",
    sql: `
          CREATE TABLE IF NOT EXISTS server_groups (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            server_ids TEXT NOT NULL, -- JSON array of server IDs
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users (id)
          )
        `,
  },
  {
    name: "group_permissions",
    sql: `
          CREATE TABLE IF NOT EXISTS group_permissions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            group_id TEXT NOT NULL,
            permissions TEXT NOT NULL, -- JSON array of actions
            granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            granted_by TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (group_id) REFERENCES server_groups (id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users (id)
          )
        `,
  },
  {
    name: "user_sessions",
    sql: `
          CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            user_agent TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `,
  },
  {
    name: "notifications",
    sql: `
          CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT,
            type TEXT CHECK(type IN ('info', 'warning', 'error', 'success')) DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `,
  },
  {
    name: "temp_sessions",
    sql: `
          CREATE TABLE IF NOT EXISTS temp_sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_agent TEXT,
            ip_address TEXT,
            type TEXT CHECK(type IN ('2FA', 'RECOVERY')) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `,
  },
  {
    name: "password_reset_tokens",
    sql: `
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `,
  },
  {
    name: "server_stats",
    sql: `
          CREATE TABLE IF NOT EXISTS server_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id TEXT NOT NULL,
            cpu_usage REAL NOT NULL,
            memory_usage INTEGER NOT NULL,
            online_players INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE
          )
        `,
  },
];

export const indexes: Definition[] = [
  {
    name: "idx_user_sessions_user_id",
    sql: "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)",
  },
  {
    name: "idx_user_sessions_expires_at",
    sql: "CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)",
  },
  {
    name: "idx_notifications_user_id",
    sql: "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
  },
  {
    name: "idx_notifications_created_at",
    sql: "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)",
  },
  {
    name: "idx_notifications_is_read",
    sql: "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)",
  },
  {
    name: "idx_temp_sessions_expires_at",
    sql: "CREATE INDEX IF NOT EXISTS idx_temp_sessions_expires_at ON temp_sessions(expires_at)",
  },
  {
    name: "idx_password_reset_tokens_expires_at",
    sql: "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)",
  },
  {
    name: "idx_password_reset_tokens_user_id",
    sql: "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)",
  },
  {
    name: "idx_servers_type",
    sql: "CREATE INDEX IF NOT EXISTS idx_servers_type ON servers(type)",
  },
  {
    name: "idx_server_stats_timestamp",
    sql: "CREATE INDEX IF NOT EXISTS idx_server_stats_timestamp ON server_stats(timestamp)",
  },
];

export const mantainance = [
  {
    tableName: "temp_sessions",
    taskName: "temp sessions cleanup",
    sql: `DELETE FROM temp_sessions WHERE expires_at <= datetime('now')`,
  },
  {
    tableName: "password_reset_tokens",
    taskName: "password reset tokens cleanup",
    sql: `DELETE FROM password_reset_tokens WHERE expires_at <= datetime('now')`,
  },
  {
    tableName: "user_sessions",
    taskName: "user sessions cleanup",
    sql: `DELETE FROM user_sessions WHERE expires_at <= datetime('now')`,
  },
];
