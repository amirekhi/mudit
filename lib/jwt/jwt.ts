import jwt, { Secret, SignOptions } from "jsonwebtoken";

// Secret typed as Secret
const SECRET_KEY: Secret = process.env.JWT_SECRET || "supersecretkey";

// Use ms-compatible string or number (seconds)
export function signToken(
  payload: object,
  expiresIn: `${number}${"s" | "m" | "h" | "d"}` | number = "7d"
): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, SECRET_KEY, options);
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}
