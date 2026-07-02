# Internal Design — Sample User Management System

## Controller Layer

### Authentication

#### Login

`symbol: UserController#login`

Validates username/password, returns JWT token and user ID on success.
Throws `IllegalArgumentException` if credentials are null, `SecurityException` if credentials are invalid.

#### Logout

`symbol: UserController#logout`

Invalidates server-side session and adds token to AuthService blocklist.
Called by authenticated clients via POST /auth/logout.

#### Get Profile

`symbol: UserController#getProfile`

Retrieves public profile (id, username, email) for a given user ID.
Throws `UserNotFoundException` if the user does not exist.

---

## Service Layer

### Authentication Service

#### Token Generation

`symbol: AuthService#generateToken`

Generates a signed JWT using the configured secret key.
Token contains: user ID, roles array, issued-at timestamp, expiry timestamp (1 hour default).

#### Token Validation

`symbol: AuthService#validateToken`

Verifies JWT signature and checks that token has not expired.
Returns `true` if valid, `false` if invalid or expired.

#### Token Revocation

`symbol: AuthService#revokeToken`

Adds a token string to an in-memory blocklist to prevent reuse after logout.

---

### User Service

#### User Search

`symbol: UserService#searchUsers`

Searches users by username or email using a SQL LIKE pattern.
Accepts `query` string and `page` / `pageSize` for pagination.
Returns an empty list if query is blank.

---

## Repository Layer

### User Repository

#### Find User By ID

`symbol: UserRepository#findById`

Primary-key lookup in the users table.
Returns `null` if no user matches the given ID.

#### Save User

`symbol: UserRepository#save`

Insert or update a user record.
If `user.id` is `null`, a new ID is auto-assigned (AUTO_INCREMENT).
The record is always inserted or updated atomically.

#### Delete User

`symbol: UserRepository#deleteById`

Removes the user record from the database by ID.
Operation is idempotent — no-op if the ID does not exist.

---

## Database Schema

### Users Table

`symbol: SQL#createUsersTable`

```sql
CREATE TABLE users (
    id       BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50)  NOT NULL UNIQUE,
    email    VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    roles    VARCHAR(255) DEFAULT 'user',
    created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_username CHECK (LENGTH(username) >= 3)
);
```

### Sessions Table

`symbol: SQL#createSessionsTable`

```sql
CREATE TABLE sessions (
    id        VARCHAR(64) PRIMARY KEY,
    user_id   BIGINT      NOT NULL,
    token     VARCHAR(512) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP   NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Sequence Flows

### Login Flow

`symbol: Flow#loginFlow`

```
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
```

### Registration Flow

`symbol: Flow#registrationFlow`

```
[Client]  -->  [UserController]  register(username, email, password)
[UserController]  -->  [UserService]  checkUsernameUnique(username)
[UserService]  -->  [UserRepository]  findByUsername(username)
[UserRepository]  -->>  [UserService]  null
[UserService]  -->>  [UserController]  isUnique
[UserController]  -->  [PasswordEncoder]  encode(password)
[PasswordEncoder]  -->>  [UserController]  passwordHash
[UserController]  -->  [UserService]  saveUser(user)
[UserService]  -->  [UserRepository]  save(user)
[UserRepository]  -->>  [UserService]  User (with id)
[UserService]  -->>  [UserController]  User
[UserController]  -->  [EmailService]  sendWelcomeEmail(user)
[EmailService]  -->>  [Client]  201 Created
```
