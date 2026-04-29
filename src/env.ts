import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z.enum(["DEVELOPMENT", "PRODUCTION"]).default("DEVELOPMENT"),
    KEY: z.string().default(""),
    PORT: z
      .string()
      .default("5001")
      .transform((e) => Number(e)),
    WEBHOOK_BASE_URL: z.string().optional(),
    // Database configuration for Railway
    DATABASE_URL: z.string().optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.string().default("3306"),
    DB_USER: z.string().default("root"),
    DB_PASSWORD: z.string().default(""),
    DB_NAME: z.string().default("mywhatsapp"),
  })
  .parse(process.env);
