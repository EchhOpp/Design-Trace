# Internal Design — Sample Project

## Controller

### User Login
symbol: UserController#login
description: Validate user credentials and generate JWT token

### User Logout
symbol: UserController#logout
description: Invalidate session and clear JWT token

### Get Profile
symbol: UserController#getProfile
description: Retrieve current user's profile information

## Service

### Token Generation
symbol: AuthService#generateToken
description: Generate a signed JWT token with user claims

### Token Validation
symbol: AuthService#validateToken
description: Verify JWT signature and check expiry

### User Search
symbol: UserService#searchUsers
description: Search users by name or email with pagination

## Repository

### Find User By ID
symbol: UserRepository#findById
description: Database query to fetch user by primary key

### Save User
symbol: UserRepository#save
description: Insert or update user record in database

### Delete User
symbol: UserRepository#deleteById
description: Remove user record by ID

## SQL

### Create Users Table
symbol: SQL#createUsersTable
description: DDL for users table with constraints

### Create Sessions Table
symbol: SQL#createSessionsTable
description: DDL for active sessions tracking

## Flow

### Login Flow
symbol: Flow#loginFlow
description: Sequence diagram for authentication flow

### Registration Flow
symbol: Flow#registrationFlow
description: New user signup process flow
