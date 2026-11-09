import dotenv from 'dotenv';
const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${env}` });

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

let signingKeyCache = null;

// Configure the JWKS client
const client = jwksClient({
  jwksUri: `${process.env.MICROSOFT_AUTHORITY}/discovery/v2.0/keys`,
});

// Middleware to verify the token
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const role = req.headers.role;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  // Get the signing key
  const getKey = (header, callback) => {
    if (signingKeyCache) {
      return callback(null, signingKeyCache);
    }
    client.getSigningKey(header.kid, (error, key) => {
      if (error) {
        return callback(error, null);
      }
      signingKeyCache = key.getPublicKey();
      callback(null, signingKeyCache);
    });
  };

  // Verify the token
  jwt.verify(
    token,
    getKey, // Use the dynamic key fetching function
    {
      algorithms: ['RS256'], // Use RS256 instead of HS256
      issuer: `${process.env.MICROSOFT_AUTHORITY}/v2.0`,
      audience: process.env.CLIENT_ID, // Your Azure AD application (client) ID
    },
    (error, decoded) => {
      if (error) {
        console.log('JWT Verification Error:', error); // Log detailed error
        return res.status(401).json({ error: 'Unauthorized' });
      }

      req.user = {
        id: decoded.oid,
        name: decoded.name,
        email: decoded.preferred_username,
        role: role
      };;
      next();
    }
  );
};
