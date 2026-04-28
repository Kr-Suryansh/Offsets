const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const JWT_EXPIRES = '7d';

function signToken(userId, res, statusCode = 200) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: 'Server misconfiguration' });

  const token = jwt.sign({ user: { id: userId } }, secret, { expiresIn: JWT_EXPIRES });
  return { token };
}

exports.register = async (req, res) => {
  const { name, email, password, taxBracket } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ name, email, password: hashed, taxBracket: taxBracket || 30 });
    const { token } = signToken(user.id, res);

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, taxBracket: user.taxBracket },
    });
  } catch (err) {
    console.error('register error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { token } = signToken(user.id, res);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, taxBracket: user.taxBracket },
    });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('getMe error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('changePassword error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
