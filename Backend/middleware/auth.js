const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET not set' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
