/**
 * Password Hashing Utilities
 * Bcrypt password hashing and comparison with 12 rounds
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Failed to compare passwords');
  }
};

/**
 * Check if a password needs to be rehashed (if salt rounds changed)
 * @param {string} hashedPassword - Hashed password to check
 * @returns {Promise<boolean>} True if rehash needed, false otherwise
 */
export const needsRehash = async (hashedPassword) => {
  try {
    const rounds = await bcrypt.getRounds(hashedPassword);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    return false;
  }
};

export default {
  hashPassword,
  comparePassword,
  needsRehash
};
