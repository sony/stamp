import { Buffer } from "buffer";

// Serialize an object to base64
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any object
export function serializeObject(obj: Record<string, any>): string {
  const serialized = JSON.stringify(obj);
  const encoded = Buffer.from(serialized).toString("base64");
  return encoded;
}

// Deserialize a base64 string to an object
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any object
export function deserializeObject(encoded: string): Record<string, any> {
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const deserialized = JSON.parse(decoded);
  return deserialized;
}
