import { neon } from "@neondatabase/serverless";

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada en el servidor.");
  }

  return neon(process.env.DATABASE_URL);
}
