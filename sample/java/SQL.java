package com.example.app;

/**
 * SQL DDL statements and migration utilities.
 * symbol: SQL#createUsersTable
 * symbol: SQL#createSessionsTable
 */
public class SQL {

    /**
     * DDL for users table with constraints.
     * symbol: SQL#createUsersTable
     */
    public static String createUsersTable() {
        return """
            CREATE TABLE users (
                id       BIGINT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50)  NOT NULL UNIQUE,
                email    VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                roles    VARCHAR(255) DEFAULT 'user',
                created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_username CHECK (LENGTH(username) >= 3)
            );
            """;
    }

    /**
     * DDL for active sessions tracking.
     * symbol: SQL#createSessionsTable
     */
    public static String createSessionsTable() {
        return """
            CREATE TABLE sessions (
                id        VARCHAR(64) PRIMARY KEY,
                user_id   BIGINT      NOT NULL,
                token     VARCHAR(512) NOT NULL,
                ip_address VARCHAR(45),
                user_agent VARCHAR(255),
                created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP   NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """;
    }
}
