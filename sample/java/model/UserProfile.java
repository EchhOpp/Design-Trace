package com.example.app.model;

/**
 * Public-facing user profile (no sensitive data).
 */
public class UserProfile {
    private Long id;
    private String username;
    private String email;

    public UserProfile(Long id, String username, String email) {
        this.id = id;
        this.username = username;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
}
