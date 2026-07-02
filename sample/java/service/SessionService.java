package com.example.app.service;

import java.util.HashSet;
import java.util.Set;

/**
 * SessionService — manages active user sessions.
 */
public class SessionService {

    private final Set<String> activeSessions = new java.util.concurrent.ConcurrentHashSet<>();

    /**
     * Invalidate a session token.
     * symbol: SessionService#invalidate
     */
    public void invalidate(String token) {
        activeSessions.remove(token);
    }

    /**
     * Register a new active session.
     * symbol: SessionService#register
     */
    public void register(String token, Long userId) {
        activeSessions.add(token);
    }
}
