import { describe, expect, it } from "vitest";
import { sanitizeInheritedAdapterEnv, sanitizeInheritedPaperclipEnv } from "./server-utils.js";

describe("sanitizeInheritedAdapterEnv", () => {
  it("removes server and credential values while preserving ordinary host configuration", () => {
    expect(sanitizeInheritedAdapterEnv({
      PATH: "/usr/bin",
      LANG: "pt_BR.UTF-8",
      PAPERCLIP_AGENT_JWT_SECRET: "jwt-secret",
      PAPERCLIP_TOOL_ACTION_SIGNING_SECRET: "tool-secret",
      BETTER_AUTH_SECRET: "auth-secret",
      DATABASE_URL: "postgres://user:password@db/paperclip",
      SENTRY_AUTH_TOKEN: "sentry-secret",
      OPENAI_API_KEY: "provider-secret",
    })).toEqual({ PATH: "/usr/bin", LANG: "pt_BR.UTF-8" });
  });
});

describe("sanitizeInheritedPaperclipEnv", () => {
  it("drops the host-only Paperclip CLI command pointer", () => {
    expect(sanitizeInheritedPaperclipEnv({
      PAPERCLIPAI_CMD: "node /missing/paperclipai/dist/index.js",
      PAPERCLIP_RUNTIME_API_URL: "http://127.0.0.1:3100",
      PATH: "/usr/bin",
    })).toEqual({
      PAPERCLIP_RUNTIME_API_URL: "http://127.0.0.1:3100",
      PATH: "/usr/bin",
    });
  });
});
