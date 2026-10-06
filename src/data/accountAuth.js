const ITERATIONS = 150000;
const encoder = new TextEncoder();

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function cryptoApi() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error("이 브라우저에서는 안전한 비밀번호 처리를 지원하지 않습니다.");
  }
  return globalThis.crypto;
}

async function derive(password, salt) {
  const api = cryptoApi();
  const material = await api.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await api.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    256
  ));
}

export async function createPasswordCredential(password) {
  const salt = cryptoApi().getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return { passwordSalt: toBase64(salt), passwordHash: toBase64(hash) };
}

export async function verifyPassword(password, salt, expectedHash) {
  const actual = await derive(password, fromBase64(salt));
  const expected = fromBase64(expectedHash);
  return actual.length === expected.length &&
    actual.every((byte, index) => byte === expected[index]);
}

export const normalizePhone = (phone) => phone.replace(/\D/g, "");

export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
