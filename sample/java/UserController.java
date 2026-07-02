package com.example.app;

public class UserController {

    /**
     * Validates user credentials and generates JWT token.
     * symbol: UserController#login
     */
    public Token login(String username, String password) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("Credentials cannot be null");
        }
        User user = userService.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new SecurityException("Invalid credentials");
        }
        String token = authService.generateToken(user);
        return new Token(token, user.getId());
    }

    /**
     * Invalidates session and clears JWT token.
     * symbol: UserController#logout
     */
    public void logout(String token) {
        sessionService.invalidate(token);
        authService.revokeToken(token);
    }

    /**
     * Retrieve current user's profile information.
     * symbol: UserController#getProfile
     */
    public UserProfile getProfile(Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            throw new UserNotFoundException(userId);
        }
        return userService.toProfile(user);
    }
}
