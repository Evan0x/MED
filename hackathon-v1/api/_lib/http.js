// Shared helpers for the /api functions. Files under _lib are not routes on Vercel.
import { verifyToken } from '@clerk/backend';

export const json = (body, status = 200) => Response.json(body, { status });

export const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

// Returns the Clerk user id from the "Authorization: Bearer <session token>"
// header, or null if it is missing or invalid.
export const getUserId = async (request) => {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !process.env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.sub || null;
  } catch {
    return null;
  }
};
