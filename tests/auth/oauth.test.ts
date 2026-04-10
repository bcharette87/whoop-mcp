/**
 * Tests for the OAuth2 flow module.
 *
 * Mocks: fetch (token exchange), child_process (browser open),
 * callback-server, and token-store as needed.
 */

import { describe, it, expect } from "vitest";
import {
  buildAuthorizationUrl,
  type OAuthConfig,
} from "../../src/auth/oauth.js";
import {
  WHOOP_AUTH_URL,
  WHOOP_REDIRECT_URI,
  WHOOP_REQUIRED_SCOPES,
} from "../../src/api/endpoints.js";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const TEST_CONFIG: OAuthConfig = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
};

// ---------------------------------------------------------------------------
// buildAuthorizationUrl
// ---------------------------------------------------------------------------

describe("buildAuthorizationUrl", () => {
  it("uses WHOOP_AUTH_URL as the base", () => {
    const url = new URL(buildAuthorizationUrl(TEST_CONFIG, "state-1"));
    expect(`${url.origin}${url.pathname}`).toBe(WHOOP_AUTH_URL);
  });

  it("includes response_type=code", () => {
    const url = new URL(buildAuthorizationUrl(TEST_CONFIG, "state-1"));
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("includes client_id from config", () => {
    const url = new URL(buildAuthorizationUrl(TEST_CONFIG, "state-1"));
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
  });

  it("includes the default redirect_uri when not overridden", () => {
    const url = new URL(buildAuthorizationUrl(TEST_CONFIG, "state-1"));
    expect(url.searchParams.get("redirect_uri")).toBe(WHOOP_REDIRECT_URI);
  });

  it("uses a custom redirect_uri when provided in config", () => {
    const config: OAuthConfig = {
      ...TEST_CONFIG,
      redirectUri: "http://localhost:9999/custom-callback",
    };
    const url = new URL(buildAuthorizationUrl(config, "state-1"));
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:9999/custom-callback",
    );
  });

  it("includes all required scopes", () => {
    const url = new URL(buildAuthorizationUrl(TEST_CONFIG, "state-1"));
    expect(url.searchParams.get("scope")).toBe(WHOOP_REQUIRED_SCOPES);
  });

  it("includes the state parameter for CSRF protection", () => {
    const url = new URL(buildAuthorizationUrl(TEST_CONFIG, "my-csrf-state"));
    expect(url.searchParams.get("state")).toBe("my-csrf-state");
  });

  it("produces a properly encoded URL", () => {
    const urlString = buildAuthorizationUrl(TEST_CONFIG, "state with spaces");
    // Should not throw when parsed
    const url = new URL(urlString);
    expect(url.searchParams.get("state")).toBe("state with spaces");
  });
});
