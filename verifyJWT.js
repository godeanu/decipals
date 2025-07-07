//verifyJWT.js

const { verifyJWTToken } = require('./authToken');

function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Malformed authorization header' });
  }
  const token = parts[1];
  try {
    const payload = verifyJWTToken(token);
    req.user = { id: payload.id }; 
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyJWT;
