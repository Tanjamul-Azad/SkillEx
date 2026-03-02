/**
 * scripts/dev/setup.ts
 * First-time developer setup script.
 * Run with: npx tsx scripts/dev/setup.ts
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

function run(cmd: string, label: string) {
  console.log(`\n▶  ${label}`);
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

function createEnvFile() {
  const envPath = path.join(root, '.env.local');
  if (existsSync(envPath)) {
    console.log('\n✔  .env.local already exists – skipping.');
    return;
  }

  const example = path.join(root, '.env.example');
  if (existsSync(example)) {
    const { readFileSync } = require('fs');
    writeFileSync(envPath, readFileSync(example, 'utf8'));
    console.log('\n✔  Created .env.local from .env.example');
  } else {
    writeFileSync(
      envPath,
      [
        '# App',
        'NEXT_PUBLIC_APP_URL=http://localhost:3000',
        '',
        '# Google AI (Genkit)',
        'GOOGLE_AI_API_KEY=your_api_key_here',
        '',
        '# Database (uncomment when ready)',
        '# DATABASE_URL=postgresql://user:password@localhost:5432/skillex',
      ].join('\n')
    );
    console.log('\n✔  Created .env.local with placeholder values. Fill in your API keys!');
  }
}

async function main() {
  console.log('🚀  SkillEx dev setup\n');
  console.log('─'.repeat(40));

  run('npm install --legacy-peer-deps', 'Installing dependencies');
  createEnvFile();

  console.log('\n─'.repeat(40));
  console.log('\n✅  Setup complete!');
  console.log('\n   Next steps:');
  console.log('   1. Edit .env.local and add your GOOGLE_AI_API_KEY');
  console.log('   2. Run: npm run dev');
  console.log('   3. Open http://localhost:3000\n');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
