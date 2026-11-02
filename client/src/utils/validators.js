export function isValidEmail(email) {
  if (!email) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  if (!phone) return true; // optional field
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

