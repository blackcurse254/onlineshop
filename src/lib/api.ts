import { auth } from './firebase';

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-CSRF-Protection')) {
    headers.set('X-CSRF-Protection', '1');
  }

  const currentFirebaseUser = auth.currentUser;
  if (currentFirebaseUser && !headers.has('Authorization')) {
    try {
      const token = await currentFirebaseUser.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch {
      // Fall back to cookie session if Firebase token retrieval fails
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'خطا در ارتباط با سرور');
  }
  return data as T;
}
