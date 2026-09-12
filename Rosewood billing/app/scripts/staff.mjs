import os from 'node:os';
import readline from 'node:readline';
import { createAuth, STAFF_ROLES } from '../src/auth.mjs';
import { loadConfig, prepareRuntime } from '../src/config.mjs';
import { openDatabase } from '../src/database.mjs';

const usage =
  'Usage: npm run staff -- add --name "Staff Name" --email staff@example.test --role viewer|billing|finance|admin [--password-stdin]\n       npm run staff -- reset --email staff@example.test [--password-stdin]\n       npm run staff -- update --email staff@example.test [--name "Staff Name"] [--role viewer|billing|finance|admin]\n       npm run staff -- enable|disable --email staff@example.test\n       npm run staff -- list\nPasswords are entered privately; never pass passwords in command arguments or environment variables.\n';

function parseArgs(args) {
  const [command, ...rest] = args;
  if (!['add', 'disable', 'enable', 'update', 'reset', 'list'].includes(command))
    throw new Error(usage);
  const options = { command };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag === '--password-stdin' && ['add', 'reset'].includes(command) && !options.passwordStdin)
      options.passwordStdin = true;
    else if (
      ['--name', '--email', '--role'].includes(flag) &&
      rest[i + 1] &&
      !rest[i + 1].startsWith('--')
    ) {
      if (Object.hasOwn(options, flag.slice(2))) throw new Error(usage);
      options[flag.slice(2)] = rest[++i];
    } else throw new Error(usage);
  }
  if (command === 'add' && (!options.name || !options.email || !STAFF_ROLES.includes(options.role)))
    throw new Error(usage);
  if (command !== 'list' && !options.email) throw new Error(usage);
  const allowed = {
    add: ['command', 'name', 'email', 'role', 'passwordStdin'],
    reset: ['command', 'email', 'passwordStdin'],
    update: ['command', 'email', 'name', 'role'],
    enable: ['command', 'email'],
    disable: ['command', 'email'],
    list: ['command'],
  };
  if (
    Object.keys(options).some((key) => !allowed[command].includes(key)) ||
    (command === 'update' && !options.name && !options.role) ||
    (options.role && !STAFF_ROLES.includes(options.role))
  )
    throw new Error(usage);
  return options;
}

async function stdinPassword() {
  if (process.stdin.isTTY)
    throw new Error('Use the interactive prompt when running in a terminal.');
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > 1024) throw new Error('Password input is too long.');
    chunks.push(chunk);
  }
  const value = Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '');
  if (/[\r\n]/.test(value)) throw new Error('Password input must contain one line.');
  return value;
}

async function hiddenPassword(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error('Use --password-stdin with a private pipe for non-interactive setup.');
  readline.emitKeypressEvents(process.stdin);
  process.stdout.write(prompt);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function finish(error) {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    }
    function onKey(text, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(new Error('Staff setup cancelled.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') {
        value = [...value].slice(0, -1).join('');
        return;
      }
      if (key.ctrl || key.meta || key.sequence?.startsWith('\u001b')) return;
      if (text && !/[\x00-\x1f\x7f]/.test(text)) {
        if (Buffer.byteLength(value + text) > 512)
          return finish(new Error('Password input is too long.'));
        value += text;
      }
    }
    process.stdin.on('keypress', onKey);
  });
}

let db;
try {
  const args = parseArgs(process.argv.slice(2));
  const config = await prepareRuntime(loadConfig());
  db = openDatabase(config.databasePath);
  const auth = createAuth({ db });
  const operator = `operator:${os.userInfo().username}`;
  if (args.command === 'list') {
    for (const user of auth.listUsers())
      process.stdout.write(
        `${user.email}\t${user.name}\t${user.role}\t${user.active ? 'active' : 'disabled'}\trevision ${user.revision}\n`,
      );
  } else if (args.command === 'disable') {
    const user = auth.disableUser(args.email, operator);
    process.stdout.write(`Disabled ${user.email}; all their sessions were revoked.\n`);
  } else if (['enable', 'update'].includes(args.command)) {
    const user = auth.updateUser(
      {
        email: args.email,
        name: args.name,
        role: args.role,
        ...(args.command === 'enable' ? { active: true } : {}),
      },
      operator,
    );
    process.stdout.write(
      `Updated ${user.email}: ${user.role}, ${user.active ? 'active' : 'disabled'}, revision ${user.revision}. Role changes revoke all sessions.\n`,
    );
  } else {
    const target =
      args.command === 'reset'
        ? auth.listUsers().find((user) => user.email === args.email.trim().toLowerCase())
        : null;
    if (args.command === 'reset' && !target)
      throw new Error('Usage: staff reset requires an existing staff email.');
    let password = args.passwordStdin
      ? await stdinPassword()
      : await hiddenPassword('New staff password (15–128 characters, hidden): ');
    if (!args.passwordStdin && password !== (await hiddenPassword('Repeat password (hidden): ')))
      throw new Error('The passwords do not match.');
    const user =
      args.command === 'reset'
        ? await auth.resetPassword(
            { email: target.email, expectedRevision: target.revision, password },
            operator,
          )
        : await auth.addUser(
            { name: args.name, email: args.email, role: args.role, password },
            operator,
          );
    password = undefined;
    process.stdout.write(
      args.command === 'reset'
        ? `Reset the password for ${user.email}; all their sessions were revoked. Account remains ${user.active ? 'active' : 'disabled'}.\n`
        : `Created ${user.email} with ${user.role} access.\n`,
    );
  }
} catch (error) {
  // Only controlled operator messages; database errors must not dump SQL or credentials.
  process.stderr.write(
    `${error?.status || error?.message?.startsWith('Usage:') || error?.message?.startsWith('BILLING_') || error?.message?.startsWith('Set BILLING_') ? error.message : 'Staff setup failed. Check the private runtime configuration and supplied staff details.'}\n`,
  );
  process.exitCode = 1;
} finally {
  db?.close();
}
