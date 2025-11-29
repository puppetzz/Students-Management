import bcrypt from "bcryptjs";

/**
 * Hash a password with a salt
 * @param password - The plain text password to hash
 * @returns An object containing the hash and salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a salt with 10 rounds (recommended for good security/performance balance)
  const salt = await bcrypt.genSalt(10);

  // Hash the password with the salt
  const hash = await bcrypt.hash(password, salt);

  return hash;
}

/**
 * Verify a password against a stored hash
 * @param password - The plain text password to verify
 * @param storedHash - The stored password hash
 * @returns true if the password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, storedHash);
}
