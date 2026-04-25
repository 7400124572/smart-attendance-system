const BASE_URL = "https://your-backend.onrender.com/api";

export function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem("auth"));
  } catch {
    return null;
  }
}

export function setStoredAuth(data) {
  localStorage.setItem("auth", JSON.stringify(data));
}

export function clearStoredAuth() {
  localStorage.removeItem("auth");
}

export async function apiFetch(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
}
