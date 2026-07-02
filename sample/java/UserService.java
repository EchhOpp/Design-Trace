package com.example.app;

import com.example.app.model.User;
import com.example.app.model.UserProfile;
import java.util.List;

/**
 * User business logic service.
 * symbol: UserService#searchUsers
 */
public class UserService {

    /**
     * Search users by name or email with pagination.
     * symbol: UserService#searchUsers
     */
    public List<User> searchUsers(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String pattern = "%" + query.toLowerCase() + "%";
        return userRepository.findByNameOrEmail(pattern, page * pageSize, pageSize);
    }

    public User findById(Long id) {
        return userRepository.findById(id);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public UserProfile toProfile(User user) {
        return new UserProfile(user.getId(), user.getUsername(), user.getEmail());
    }

    // Injected dependencies (simplified for sample)
    private UserRepository userRepository;
    public void setUserRepository(UserRepository repo) { this.userRepository = repo; }
}
