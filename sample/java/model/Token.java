package com.example.app.model;

/**
 * Authentication token returned after successful login.
 */
public class Token {
    private final String token;
    private final Long userId;

    public Token(String token, Long userId) {
        this.token = token;
        this.userId = userId;
    }

    public String getToken() { return token; }
    public Long getUserId() { return userId; }
}
