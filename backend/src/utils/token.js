import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token for a user
 * @param {object} user - Mongoose User document or plain object
 * @returns {string} Signed JWT token
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'ticketnow_jwt_secret_dev_key_change_in_production_987654321';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    { expiresIn }
  );
};
