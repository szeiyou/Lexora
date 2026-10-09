import { z } from "zod";

export const settingsSchema = z.object({
  baseUrl: z.string().url(),
  requestTimeoutMs: z.number().int().min(1000).max(60000).default(60000),
  closeBehavior: z.enum(["ask", "tray", "exit"]).default("ask"),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

export const defaultSettingsValues: SettingsValues = {
  baseUrl: "",
  requestTimeoutMs: 60000,
  closeBehavior: "ask",
};
