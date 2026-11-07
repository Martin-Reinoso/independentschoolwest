import crypto from "node:crypto";

export const GOOGLE_APP_FILES_SCOPE = "https://www.googleapis.com/auth/drive.file";

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function present(value) {
  return Boolean(String(value || "").trim());
}

export class GoogleAccessTokenProvider {
  constructor({ authMode, serviceAccountEmail, privateKey, oauthClientId, oauthClientSecret, oauthRefreshToken, scope, restrictedToAppFiles = false, fetchImpl = fetch, now = () => Date.now() }) {
    if (!present(scope)) throw new Error("A Google OAuth scope is required.");
    const serviceComplete = present(serviceAccountEmail) && present(privateKey);
    const oauthComplete = present(oauthClientId) && present(oauthClientSecret) && present(oauthRefreshToken);
    const requestedMode = String(authMode || "").trim();
    if (requestedMode && !["service_account", "user_oauth"].includes(requestedMode)) throw new Error("GOOGLE_AUTH_MODE must be service_account or user_oauth.");
    if (!requestedMode && serviceComplete && oauthComplete) throw new Error("Set GOOGLE_AUTH_MODE when both Google credential sets are present.");
    this.mode = requestedMode || (oauthComplete ? "user_oauth" : "service_account");
    if (restrictedToAppFiles && (this.mode !== "user_oauth" || scope !== GOOGLE_APP_FILES_SCOPE)) throw new Error("Isolated Google access requires app-file-only user OAuth.");
    this.restrictedToAppFiles = restrictedToAppFiles;
    if (this.mode === "service_account" && !serviceComplete) throw new Error("Google service-account credentials are incomplete.");
    if (this.mode === "user_oauth" && !oauthComplete) throw new Error("Google delegated-user OAuth credentials are incomplete.");
    this.serviceAccountEmail = String(serviceAccountEmail || "").trim();
    this.privateKey = String(privateKey || "").replace(/\\n/g, "\n");
    this.oauthClientId = String(oauthClientId || "").trim();
    this.oauthClientSecret = String(oauthClientSecret || "").trim();
    this.oauthRefreshToken = String(oauthRefreshToken || "").trim();
    this.scope = scope;
    this.fetch = fetchImpl;
    this.now = now;
    this.token = null;
  }

  async accessToken() {
    if (this.token?.expiresAt > this.now() + 60_000) return this.token.value;
    const parameters = this.mode === "user_oauth" ? this.userOauthParameters() : this.serviceAccountParameters();
    const response = await this.fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parameters)
    });
    if (!response.ok) throw new Error(`Google OAuth failed with ${response.status}.`);
    const payload = await response.json();
    if (!present(payload.access_token)) throw new Error("Google OAuth returned no access token.");
    // Verify the grant, not just the requested scope. Never cache a broad token in
    // the synthetic runtime, including a mistakenly copied production credential.
    if (this.restrictedToAppFiles) {
      const granted = new Set(String(payload.scope || "").trim().split(/\s+/));
      if (granted.size !== 1 || !granted.has(GOOGLE_APP_FILES_SCOPE)) throw new Error("Isolated Google OAuth grant is not app-file-only.");
    }
    this.token = { value: payload.access_token, expiresAt: this.now() + Number(payload.expires_in || 3600) * 1000 };
    return this.token.value;
  }

  userOauthParameters() {
    return { client_id: this.oauthClientId, client_secret: this.oauthClientSecret, refresh_token: this.oauthRefreshToken, grant_type: "refresh_token" };
  }

  serviceAccountParameters() {
    const issuedAt = Math.floor(this.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64Url(JSON.stringify({ iss: this.serviceAccountEmail, scope: this.scope, aud: "https://oauth2.googleapis.com/token", iat: issuedAt, exp: issuedAt + 3600 }));
    const signingInput = `${header}.${claims}`;
    const signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(this.privateKey);
    return { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${base64Url(signature)}` };
  }
}
