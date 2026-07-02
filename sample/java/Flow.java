package com.example.app;

/**
 * Sequence diagram descriptions and flow orchestration.
 * symbol: Flow#loginFlow
 * symbol: Flow#registrationFlow
 */
public class Flow {

    /**
     * Sequence diagram for authentication flow.
     * Steps:
     *  1. Client sends POST /auth/login with credentials
     *  2. UserController.login() validates input
     *  3. UserController calls UserService.findByUsername()
     *  4. UserService delegates to UserRepository
     *  5. Password hash is compared via PasswordEncoder
     *  6. On success: AuthService.generateToken() issues JWT
     *  7. Token and user ID returned to client
     * symbol: Flow#loginFlow
     */
    public static String loginFlow() {
        return """
            [Client]  -->  [UserController]  login(username, password)
            [UserController]  -->  [UserService]  findByUsername(username)
            [UserService]  -->  [UserRepository]  SELECT * FROM users WHERE username = ?
            [UserRepository]  -->>  [UserService]  User
            [UserService]  -->>  [UserController]  User
            [UserController]  -->  [PasswordEncoder]  matches(raw, hash)
            [PasswordEncoder]  -->>  [UserController]  true/false
            [UserController]  -->  [AuthService]  generateToken(user)
            [AuthService]  -->>  [UserController]  JWT string
            [UserController]  -->>  [Client]  { token, userId }
            """;
    }

    /**
     * New user signup process flow.
     * Steps:
     *  1. Client sends POST /auth/register with user data
     *  2. Input validation: username unique, email format
     *  3. Password hashed via PasswordEncoder
     *  4. UserRepository.save() persists record
     *  5. User created with default 'user' role
     *  6. Welcome email triggered (async)
     *  7. Registration confirmation returned
     * symbol: Flow#registrationFlow
     */
    public static String registrationFlow() {
        return """
            [Client]  -->  [UserController]  register(username, email, password)
            [UserController]  -->  [UserService]  checkUsernameUnique(username)
            [UserService]  -->  [UserRepository]  findByUsername(username)
            [UserRepository]  -->>  [UserService]  null / User
            [UserService]  -->>  [UserController]  isUnique
            [UserController]  -->  [PasswordEncoder]  encode(password)
            [PasswordEncoder]  -->>  [UserController]  passwordHash
            [UserController]  -->  [User]  new User(username, email, hash)
            [UserController]  -->  [UserService]  saveUser(user)
            [UserService]  -->  [UserRepository]  save(user)
            [UserRepository]  -->>  [UserService]  User (with id)
            [UserService]  -->>  [UserController]  User
            [UserController]  -->  [EmailService]  sendWelcomeEmail(user)
            [EmailService]  -->>  [Client]  201 Created
            """;
    }
}
