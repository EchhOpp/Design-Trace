package com.example.app.util;

import com.example.app.model.JWTClaims;

/**
 * JWT helper for signing and verifying tokens.
 * In production, use a real JWT library (e.g., jjwt, java-jwt).
 */
public class JWTUtil {

    /**
     * Sign user claims into a compact JWT string.
     * symbol: JWTUtil#sign
     */
    public String sign(String userId, String[] roles, long issuedAt, long expiry) {
        // Placeholder — real implementation would use HMAC-SHA256
        return "HEADER." + base64(userId) + "." + base64(roles) + ".SIGNATURE";
    }

    /**
     * Verify and decode a JWT string, returning the claims.
     * symbol: JWTUtil#verify
     */
    public JWTClaims verify(String token) {
        // Placeholder — real implementation would validate signature and expiry
        return new JWTClaims("user-1", new String[]{"USER"}, System.currentTimeMillis() + 3600000);
    }

    private String base64(Object value) {
        return java.util.Base64.getEncoder().encodeToString(String.valueOf(value).getBytes());
    }
}
