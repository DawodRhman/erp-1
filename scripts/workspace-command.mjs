import { spawn } from 'node:child_process';

const commands = {
  dev: ['--parallel', '--filter', '@track360/api', '--filter', '@track360/web', '--filter', '@track360/worker', 'dev'],
  'dev:web': ['--filter', '@track360/web', 'dev'],
  'dev:api': ['--filter', '@track360/api', 'dev'],
  'dev:worker': ['--filter', '@track360/worker', 'dev'],
  'db:migrate': ['--filter', '@track360/api', 'db:migrate'],
  'db:rollback': ['--filter', '@track360/api', 'db:rollback'],
  'db:seed': ['--filter', '@track360/api', 'db:seed'],
};

const commandName = process.argv[2];
const args = commands[commandName];

if (!args) {
  console.error(`Unknown workspace command: ${commandName ?? '(missing)'}`);
  process.exit(1);
}

const pnpmScript = process.env.npm_execpath;
const executable = pnpmScript ? process.execPath : 'pnpm';
const commandArgs = pnpmScript ? [pnpmScript, ...args] : args;

const child = spawn(executable, commandArgs, {
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
