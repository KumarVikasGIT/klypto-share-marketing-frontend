export function getSession() {
  const session =
    localStorage.getItem("session") ||
    sessionStorage.getItem("session");

  if (!session) return null; // ✅ prevent crash

  try {
    return JSON.parse(session); // only parse if exists
  } catch (err) {
    console.error("Invalid session JSON:", err);
    return null;
  }
}

export function isAuthenticated() {
  return !!getSession()?.token;
}

export function getToken() {
  return getSession()?.token || null;
}

export function getUser() {
  return getSession()?.user || null;
}

export function logout() {
  localStorage.removeItem("session");
  sessionStorage.removeItem("session");
}