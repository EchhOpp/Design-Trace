package com.example.app;

import java.util.List;

public class AuthService {

    /**
     * Generate a signed JWT token with user claims.
     * symbol: AuthService#generateToken
     */
    public String generateToken(User user) {
        long now = System.currentTimeMillis();
        long expiry = now + 3600000; // 1 hour
        return jwtHelper.sign(user.getId(), user.getRoles(), now, expiry);
    }

    /**
     * Verify JWT signature and check expiry.
     * symbol: AuthService#validateToken
     */
    public boolean validateToken(String token) {
        try {
            JWTClaims claims = jwtHelper.verify(token);
            return claims.getExpiry() > System.currentTimeMillis();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Revoke a token by adding it to the blocklist.
     * symbol: AuthService#revokeToken
     */
    public void revokeToken(String token) {
        blocklist.add(token);
    }
}
