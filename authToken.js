//authToken.js

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function generateJWT(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '14d' });
}

function verifyJWTToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateJWT, verifyJWTToken };
