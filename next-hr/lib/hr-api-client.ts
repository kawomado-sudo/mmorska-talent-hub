/**
 * Call protected HR screening APIs from the browser (dashboard).
 * Requires authenticated Supabase session; passes JWT in Authorization.
 */
export async function hrScreeningFetch(
  path: string,
  init: RequestInit & { accessToken: string }
): Promise<Response> {
  const { accessToken, ...rest } = init;
  const secret = process.env.NEXT_PUBLIC_HR_API_SECRET;
  const headers = new Headers(rest.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (secret) headers.set("x-hr-api-secret", secret);
  return fetch(path, { ...rest, headers });
}
