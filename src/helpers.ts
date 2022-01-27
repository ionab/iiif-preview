function getPasswordKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
}

function deriveKey(passwordKey: CryptoKey, salt: ArrayBuffer, keyUsage: string[]) {
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    keyUsage
  );
}

function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, buffer as any));
}

function base64ToBuffer(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(null as any));
}

export async function encrypt(data: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const passwordKey = await getPasswordKey(password);
  const aesKey = await deriveKey(passwordKey, salt, ['encrypt']);
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    new TextEncoder().encode(data)
  );

  const encryptedContentArr = new Uint8Array(encryptedContent);

  const buff = new Uint8Array(salt.byteLength + iv.byteLength + encryptedContentArr.byteLength);
  buff.set(salt, 0);
  buff.set(iv, salt.byteLength);
  buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);

  return bufferToBase64(buff);
}

export async function decrypt(input: string, password: string) {
  const encryptedData = base64ToBuffer(input);
  const salt = encryptedData.slice(0, 16);
  const iv = encryptedData.slice(16, 16 + 12);
  const data = encryptedData.slice(16 + 12);
  const passwordKey = await getPasswordKey(password);
  const aesKey = await deriveKey(passwordKey, salt, ['decrypt']);

  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    data
  );

  return new TextDecoder().decode(decryptedContent);
}

export function generateId(partLength: number) {
  const byteLength = partLength / 4 + 1;
  return Array.from(crypto.getRandomValues(new Uint16Array(byteLength)))
    .map((t) => t.toString(16))
    .join('')
    .slice(0, partLength);
}
