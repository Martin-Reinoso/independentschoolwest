// Test identities remain fictional. Only the transport destination is redirected;
// application/guardian identity and OTP/session scopes must never use the test inbox.
import { validateSyntheticSecret, validateSyntheticRuntime } from "./synthetic-runtime.mjs";
const CONFIG_KEYS = ["EMAIL_DELIVERY_MODE", "EMAIL_TEST_IDENTITIES", "EMAIL_TEST_DESTINATION"];
const MAILBOX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;

function reject(code) {
  const error = new Error("Email delivery is blocked by the configured delivery policy.");
  error.code = code;
  throw error;
}

function mailbox(value) {
  if (typeof value !== "string" || value !== value.trim() || !MAILBOX.test(value)) reject("EMAIL_DESTINATION_INVALID");
  return value.toLowerCase();
}

// Runtime safety controls cannot be overridden by an application configuration secret.
export function mergeServiceConfig(runtime, secret, overrides = {}) {
  validateSyntheticSecret(runtime, secret, overrides);
  if (CONFIG_KEYS.some(key => Object.hasOwn(secret, key))) reject("EMAIL_POLICY_IN_SECRET");
  const config = { ...runtime, ...secret, ...overrides };
  for (const key of CONFIG_KEYS) {
    if (Object.hasOwn(runtime, key) && Object.hasOwn(overrides, key) && runtime[key] !== overrides[key]) reject("EMAIL_POLICY_OVERRIDE");
  }
  createEmailDeliveryPolicy(config);
  validateSyntheticRuntime(config);
  return config;
}

export function createEmailDeliveryPolicy(config = {}) {
  const mode = config.EMAIL_DELIVERY_MODE ?? "production";
  if (!["production", "test", "disabled"].includes(mode)) reject("EMAIL_POLICY_INVALID");
  let destination;
  let identities;
  if (mode === "test") {
    destination = mailbox(config.EMAIL_TEST_DESTINATION);
    const raw = config.EMAIL_TEST_IDENTITIES;
    if (typeof raw !== "string" || !raw || raw.split(",").some(value => !value.trim())) reject("EMAIL_POLICY_INVALID");
    identities = new Set(raw.split(",").map(value => mailbox(value.trim())));
    if (!identities.size || identities.size > 20 || [...identities].some(value => !value.endsWith(".test"))) reject("EMAIL_POLICY_INVALID");
    if (destination.endsWith(".test")) reject("EMAIL_POLICY_INVALID");
  } else if (config.EMAIL_TEST_IDENTITIES || config.EMAIL_TEST_DESTINATION) {
    // A partially configured test stack must never silently send in production mode.
    reject("EMAIL_POLICY_INVALID");
  }

  function validate(message) {
    if (mode === "disabled") reject("EMAIL_DELIVERY_DISABLED");
    if (!message || typeof message !== "object") reject("EMAIL_DESTINATION_INVALID");
    const to = mailbox(message.to);
    if (["cc", "bcc", "Cc", "Bcc", "To", "destination", "Destination"].some(key => Object.hasOwn(message, key))) reject("EMAIL_MULTIPLE_DESTINATIONS");
    if (mode === "test" && !identities.has(to)) reject("EMAIL_TEST_IDENTITY_BLOCKED");
    return to;
  }

  return Object.freeze({
    mode,
    validate,
    prepare(message) {
      const logicalRecipient = validate(message);
      if (mode !== "test") return message;
      const notice = `ROSEWOOD TEST — fictional records only. Test guardian: ${logicalRecipient}.`;
      return {
        ...message,
        to: destination,
        // Replies to test messages must not accidentally contact the real school.
        replyTo: destination,
        subject: `[ROSEWOOD TEST] ${message.subject || ""}`,
        text: `${notice}\n\n${message.text || ""}`,
        html: `<p role="note" style="padding:12px;background:#fff3cd;color:#332900">${notice.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>${message.html || ""}`,
        tags: { ...message.tags, delivery_mode: "synthetic_test" }
      };
    }
  });
}

// All store writes pass through this boundary, including helpers outside createService.
// Validate only the documented outbox argument shapes; never traverse family answers.
export function guardEmailOutboxStore(store, policy) {
  function validateEvents(value) {
    if (Array.isArray(value)) return value.forEach(validateEvents);
    if (!value || typeof value !== "object") return;
    if (value.kind === "email") policy.validate(value.payload);
    if (Object.hasOwn(value, "outboxEvents")) validateEvents(value.outboxEvents);
  }
  return new Proxy(store, {
    get(target, property) {
      const member = Reflect.get(target, property, target);
      if (typeof member !== "function") return member;
      return function (...args) {
        args.forEach(validateEvents);
        return Reflect.apply(member, target, args);
      };
    }
  });
}

export function guardEmailSender(mailer, policy) {
  return { async send(message) { policy.validate(message); return mailer.send(message); } };
}
