import assert from "node:assert/strict";
import test from "node:test";
import { GoogleAccessTokenProvider, GOOGLE_APP_FILES_SCOPE } from "../google-auth.mjs";
import { GoogleDriveStore } from "../google-drive.mjs";
import { GoogleSheetsStore } from "../google-sheets.mjs";

const auth = { authMode: "user_oauth", oauthClientId: "synthetic-client", oauthClientSecret: "synthetic-secret", oauthRefreshToken: "synthetic-refresh", restrictedToAppFiles: true };

test("isolated Google adapters reject broad, absent and changed grants before accessing files", async () => {
  for (const scope of [undefined, "", "https://www.googleapis.com/auth/drive", `${GOOGLE_APP_FILES_SCOPE} https://www.googleapis.com/auth/spreadsheets`, `${GOOGLE_APP_FILES_SCOPE} openid`]) {
    for (const Adapter of [GoogleDriveStore, GoogleSheetsStore]) {
      let fileCalls = 0;
      const adapter = new Adapter({ auth, fetchImpl: async url => {
        if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "synthetic-token", scope });
        fileCalls++;
        return Response.json({});
      }});
      await assert.rejects(adapter.request("https://www.googleapis.com/drive/v3/files/synthetic"), /app-file-only/);
      await assert.rejects(adapter.request("https://www.googleapis.com/drive/v3/files/synthetic"), /app-file-only/);
      assert.equal(fileCalls, 0);
      assert.equal(adapter.tokenProvider.token, null);
    }
  }
});

test("app-file-only token is cached, then a broader refreshed grant fails closed", async () => {
  let now = 0, refreshes = 0;
  const provider = new GoogleAccessTokenProvider({ ...auth, scope: GOOGLE_APP_FILES_SCOPE, now: () => now,
    fetchImpl: async () => Response.json({ access_token: "synthetic-token", expires_in: 3600, scope: ++refreshes === 1 ? GOOGLE_APP_FILES_SCOPE : "https://www.googleapis.com/auth/drive" }) });
  assert.equal(await provider.accessToken(), "synthetic-token");
  assert.equal(await provider.accessToken(), "synthetic-token");
  assert.equal(refreshes, 1);
  now = 3600_000;
  await assert.rejects(provider.accessToken(), /app-file-only/);
});

test("production OAuth remains compatible with an existing grant without a scope response", async () => {
  const provider = new GoogleAccessTokenProvider({ ...auth, restrictedToAppFiles: false, scope: "https://www.googleapis.com/auth/drive", fetchImpl: async () => Response.json({ access_token: "synthetic-token" }) });
  assert.equal(await provider.accessToken(), "synthetic-token");
  assert.throws(() => new GoogleAccessTokenProvider({ ...auth, scope: "https://www.googleapis.com/auth/drive" }), /app-file-only/);
});
