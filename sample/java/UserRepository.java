package com.example.app;

import com.example.app.model.User;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Data access layer for User entities.
 * symbol: UserRepository#findById
 * symbol: UserRepository#save
 * symbol: UserRepository#deleteById
 */
public class UserRepository {

    /**
     * Database query to fetch user by primary key.
     * symbol: UserRepository#findById
     */
    public User findById(Long id) {
        return users.get(id);
    }

    public User findByUsername(String username) {
        return users.values().stream()
            .filter(u -> u.getUsername().equals(username))
            .findFirst()
            .orElse(null);
    }

    public List<User> findByNameOrEmail(String pattern, int offset, int limit) {
        return users.values().stream()
            .filter(u ->
                (u.getUsername() != null && u.getUsername().toLowerCase().contains(pattern.substring(1, pattern.length() - 1))) ||
                (u.getEmail() != null && u.getEmail().toLowerCase().contains(pattern.substring(1, pattern.length() - 1)))
            )
            .skip(offset)
            .limit(limit)
            .toList();
    }

    /**
     * Insert or update user record in database.
     * symbol: UserRepository#save
     */
    public User save(User user) {
        if (user.getId() == null) {
            user.setId((long) (users.size() + 1));
        }
        users.put(user.getId(), user);
        return user;
    }

    /**
     * Remove user record by ID.
     * symbol: UserRepository#deleteById
     */
    public void deleteById(Long id) {
        users.remove(id);
    }

    // In-memory store for sample purposes
    private final Map<Long, User> users = new ConcurrentHashMap<>();
}
