package com.example.app.model;

/**
 * Claims extracted from a validated JWT token.
 */
public class JWTClaims {
    private final String subject;
    private final String[] roles;
    private final long expiry;

    public JWTClaims(String subject, String[] roles, long expiry) {
        this.subject = subject;
        this.roles = roles;
        this.expiry = expiry;
    }

    public String getSubject() { return subject; }
    public String[] getRoles() { return roles; }
    public long getExpiry() { return expiry; }
}
