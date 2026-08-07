import { buildService, loadSecret } from "../index.mjs";
import { DynamoStore } from "../dynamo-store.mjs";
import { createApplicationInvitation } from "../service.mjs";

function args(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    result[argv[index].slice(2)] = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true;
  }
  return result;
}

const options = args(process.argv.slice(2));
if (!options.email) throw new Error("Use --email family@example.com. Direct invitations also require --first; --last is encouraged. EOI-linked invitations use --eoi-id.");
const config = { ...process.env, ...await loadSecret() };
const store = new DynamoStore({ tableName: config.ROSEWOOD_TABLE_NAME });
const result = await createApplicationInvitation({
  store,
  recipientEmail: options.email,
  firstName: options.first || "",
  lastName: options.last || "",
  sourceEoiId: options["eoi-id"] || "",
  createdBy: options["created-by"] || "staff-cli",
  applicationUrl: config.APPLICATION_PAGE_URL
});
const service = await buildService({ store, config });
await service.dispatchOutbox(50);
console.log(JSON.stringify(result, null, 2));
