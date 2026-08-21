import { describe, expect, it } from "vitest";
import {
  sanitizeInheritedAdapterEnv,
  sanitizeInheritedPaperclipEnv,
  splitAdapterEnvForPersistence,
} from "./server-utils.js";

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

// GAM-470. acpx grava `sessionOptions.env` no registro da sessao em disco e le de volta
// para reconstruir o cliente do turno seguinte, e o proprio type doc dele diz
// "Do not put secrets here; use authCredentials for credentials". Medido em producao em
// 2026-08-21: um `SENTRY_AUTH_TOKEN` projetado no charter do head-engenharia aparecia em
// claro no transcript, em `acpx > session_options > env`, a cada run.
//
// Redigir na hora de gravar NAO resolve: o valor precisa sobreviver ao round trip, senao o
// turno seguinte recebe `***REDACTED***` como credencial. Por isso a divisao — o segredo
// muda de faixa, nao de forma.
describe("splitAdapterEnvForPersistence", () => {
  it("keeps ordinary configuration persistable and moves every credential to the auth lane", () => {
    expect(splitAdapterEnvForPersistence({
      PATH: "/usr/bin",
      HOME: "/home/paperclip",
      PAPERCLIP_RUN_SCRATCH_DIR: "/tmp/paperclip-run-1",
      SENTRY_AUTH_TOKEN: "sentry-secret",
      PAPERCLIP_API_KEY: "run-jwt",
      GA4_SA_JSON: "{\"private_key\":\"x\"}",
      DATABASE_URL: "postgres://user:password@db/paperclip",
    })).toEqual({
      sessionEnv: {
        PATH: "/usr/bin",
        HOME: "/home/paperclip",
        PAPERCLIP_RUN_SCRATCH_DIR: "/tmp/paperclip-run-1",
        GA4_SA_JSON: "{\"private_key\":\"x\"}",
      },
      authCredentials: {
        SENTRY_AUTH_TOKEN: "sentry-secret",
        PAPERCLIP_API_KEY: "run-jwt",
        DATABASE_URL: "postgres://user:password@db/paperclip",
      },
    });
  });

  it("never leaves a credential value on the lane that gets written to disk", () => {
    const { sessionEnv } = splitAdapterEnvForPersistence({
      PATH: "/usr/bin",
      SENTRY_AUTH_TOKEN: "sentry-secret",
      CLARITY_API_TOKEN: "clarity-secret",
      BING_WEBMASTER_API_KEY: "bing-secret",
      GH_TOKEN_FILE: "/home/paperclip/.gh-qa-token",
      SOME_PASSWORD: "pw",
      HTTP_AUTHORIZATION: "Bearer abc",
      SESSION_COOKIE: "sid=1",
    });
    expect(Object.values(sessionEnv)).toEqual(["/usr/bin"]);
  });

  it("splits without losing or duplicating a key", () => {
    const env = {
      PATH: "/usr/bin",
      LANG: "pt_BR.UTF-8",
      SENTRY_AUTH_TOKEN: "sentry-secret",
      PAPERCLIP_API_KEY: "run-jwt",
    };
    const { sessionEnv, authCredentials } = splitAdapterEnvForPersistence(env);
    expect([...Object.keys(sessionEnv), ...Object.keys(authCredentials)].sort())
      .toEqual(Object.keys(env).sort());
    for (const [key, value] of Object.entries(env)) {
      expect(sessionEnv[key] ?? authCredentials[key]).toBe(value);
    }
  });
});
