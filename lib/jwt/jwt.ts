import jwt, { Secret, SignOptions, JwtPayload } from "jsonwebtoken";

const SECRET_KEY: Secret = process.env.JWT_SECRET || "supersecretkey";

export interface AppJwtPayload extends JwtPayload {
  userId: string;
}

export function signToken(
  payload: object,
  expiresIn: `${number}${"s" | "m" | "h" | "d"}` | number = "7d"
): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, SECRET_KEY, options);
}

export function verifyToken(token: string): AppJwtPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (typeof decoded === "string") return null;
    return decoded as AppJwtPayload;
  } catch {
    return null;
  }
}