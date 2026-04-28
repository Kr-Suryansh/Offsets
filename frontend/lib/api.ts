const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    throw new Error(`Network error — is the backend running? (${url})`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status} ${response.statusText}`);
  }

  return data;
}
