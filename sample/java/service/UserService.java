package com.example.app.service;

import com.example.app.model.User;
import com.example.app.model.UserNotFoundException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * UserService — handles user business logic and domain operations.
 */
public class UserService {

    private final Map<Long, User> users = new ConcurrentHashMap<>();

    /**
     * Search users by name or email with pagination.
     * symbol: UserService#searchUsers
     */
    public java.util.List<User> searchUsers(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Search query cannot be blank");
        }
        String lower = query.toLowerCase();
        return users.values().stream()
            .filter(u ->
                u.getUsername().toLowerCase().contains(lower) ||
                (u.getEmail() != null && u.getEmail().toLowerCase().contains(lower)))
            .skip((long) (page - 1) * pageSize)
            .limit(pageSize)
            .toList();
    }

    public User findById(Long id) {
        User user = users.get(id);
        if (user == null) throw new UserNotFoundException(id);
        return user;
    }

    public User findByUsername(String username) {
        return users.values().stream()
            .filter(u -> u.getUsername().equals(username))
            .findFirst()
            .orElse(null);
    }

    public com.example.app.model.UserProfile toProfile(User user) {
        return new com.example.app.model.UserProfile(
            user.getId(),
            user.getUsername(),
            user.getEmail()
        );
    }

    public void save(User user) {
        users.put(user.getId(), user);
    }
}
