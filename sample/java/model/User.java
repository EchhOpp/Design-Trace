package com.example.app.model;

/**
 * Represents a user entity in the system.
 */
public class User {
    private Long id;
    private String username;
    private String passwordHash;
    private String email;
    private String[] roles;

    public User() {}

    public User(Long id, String username, String email) {
        this.id = id;
        this.username = username;
        this.email = email;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String[] getRoles() { return roles; }
    public void setRoles(String[] roles) { this.roles = roles; }
}
