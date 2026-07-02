package com.example.app.security;

import java.security.MessageDigest;

/**
 * PasswordEncoder — hashes and verifies user passwords.
 * In production, use BCrypt or Argon2.
 */
public class PasswordEncoder {

    /**
     * Hash a plain-text password.
     * symbol: PasswordEncoder#matches
     */
    public boolean matches(String raw, String hashed) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String encoded = java.util.Base64.getEncoder().encodeToString(md.digest(raw.getBytes()));
            return encoded.equals(hashed);
        } catch (Exception e) {
            return false;
        }
    }
}
