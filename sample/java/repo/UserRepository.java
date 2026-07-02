package com.example.app.repo;

import com.example.app.model.User;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * UserRepository — data access layer for User entities.
 */
public class UserRepository {

    private final Map<Long, User> store = new ConcurrentHashMap<>();

    /**
     * Database query to fetch user by primary key.
     * symbol: UserRepository#findById
     */
    public Optional<User> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    /**
     * Insert or update user record in database.
     * symbol: UserRepository#save
     */
    public User save(User user) {
        store.put(user.getId(), user);
        return user;
    }

    /**
     * Remove user record by ID.
     * symbol: UserRepository#deleteById
     */
    public boolean deleteById(Long id) {
        return store.remove(id) != null;
    }
}
