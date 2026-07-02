package com.example.app.model;

/**
 * Thrown when a user cannot be found by ID or username.
 */
public class UserNotFoundException extends RuntimeException {
    private final Object identifier;

    public UserNotFoundException(Object identifier) {
        super("User not found: " + identifier);
        this.identifier = identifier;
    }

    public Object getIdentifier() { return identifier; }
}
