import crypto from "node:crypto";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createService } from "../core.mjs";
import { MemoryDrive, MemoryMailer, MemoryStore } from "../memory-adapter.mjs";

const port = Number(process.env.PORT || 4173);
const root = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const origin = `http://127.0.0.1:${port}`;
const invitationToken = process.env.TEST_INVITATION_TOKEN || crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(invitationToken).digest("hex");
const store = new MemoryStore();
const drive = new MemoryDrive({ uploadBaseUrl: `${origin}/__memory-upload/` });
const mailer = new MemoryMailer();
store.seedInvitation({
  tokenHash,
  inviteId: "invite-local-v2",
  applicationId: "application-local-v2",
  recipientEmail: process.env.TEST_RECIPIENT_EMAIL || "guardian@example.test",
  familyLabel: "Example family",
  studentName: "Ava Example",
  status: "active",
  expiresAt: Date.now() + 86_400_000
});
const service = createService({ store, drive, mailer, env: {
  ALLOWED_ORIGINS: origin,
  OTP_HMAC_SECRET: "local-otp-secret",
  IP_HASH_SALT: "local-ip-secret",
  OTP_FROM_EMAIL: "local@example.test",
  SCHEMA_VERSION: "rosewood-v2-2026-08-02",
  TEST_MODE: "true",
  SIGNING_PAGE_URL: `${origin}/pages/rosewood-sign-v2.html`
} });

const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, origin);
    if (url.pathname.startsWith("/v2/")) {
      const raw = await body(request);
      const result = await service({
        rawPath: url.pathname,
        headers: { ...request.headers, origin },
        body: raw.length ? raw.toString("utf8") : undefined,
        requestContext: { http: { method: request.method, path: url.pathname, sourceIp: request.socket.remoteAddress || "local" } }
      });
      response.writeHead(result.statusCode, result.headers);
      return response.end(result.body);
    }
    if (url.pathname.startsWith("/__memory-upload/") && request.method === "PUT") {
      const uploadId = url.pathname.split("/").pop();
      const metadata = drive.sessions.get(uploadId);
      const data = await body(request);
      if (!metadata || data.length !== metadata.size || request.headers["content-type"] !== metadata.mimeType) {
        response.writeHead(422);
        return response.end("Upload did not match the authorised session.");
      }
      const file = drive.completeUpload(uploadId, { data });
      response.writeHead(200, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ id: file.id }));
    }
    const relative = url.pathname === "/" ? "/pages/rosewood-enrolment-v2.html" : decodeURIComponent(url.pathname);
    const filePath = resolve(root, `.${relative}`);
    if (!filePath.startsWith(`${root}${sep}`)) throw new Error("Path is outside the repository.");
    let data = await readFile(filePath);
    if (extname(filePath) === ".html") {
      data = Buffer.from(data.toString("utf8").replace("<head>", `<head><script>window.ROSEWOOD_V2_RUNTIME_CONFIG={apiEndpoint:${JSON.stringify(origin)}};</script>`));
    }
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.code === "ENOENT" ? "Not found" : "Local V2 server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Rosewood V2 local server: ${origin}/pages/rosewood-enrolment-v2.html?invite=${invitationToken}\n`);
  process.stdout.write(`Synthetic invited email: ${store.invitations.get(tokenHash).recipientEmail}\n`);
});
