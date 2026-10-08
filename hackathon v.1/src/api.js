// Calls our own /api functions (which hold the Google/Gemini keys server-side).
// Sends the Clerk session token when signed in; throws with the server's message on failure.
export const apiPost = async (path, body) => {
  const token = await window.Clerk?.session?.getToken();
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};
