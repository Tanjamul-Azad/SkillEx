/**
 * data/seeds/seed.ts
 * Seeds a fresh database with the mock dataset.
 *
 * Run with:  npx tsx data/seeds/seed.ts
 * (or add "db:seed": "tsx data/seeds/seed.ts" to package.json)
 *
 * When a real DB is configured, replace the console.log stubs with
 * actual ORM insert calls (e.g. Prisma, Drizzle).
 */

import { users, skills, skillMatches, skillChains } from '@data/mock/mockData';

async function seed() {
  console.log('🌱  Starting database seed…\n');

  // ── Skills ──────────────────────────────────────────────────────
  console.log(`  Seeding ${skills.length} skills…`);
  for (const skill of skills) {
    // TODO: await prisma.skill.upsert({ where: { id: skill.id }, create: skill, update: skill });
    console.log(`    ↳ ${skill.name} [${skill.category}]`);
  }

  // ── Users ──────────────────────────────────────────────────────
  console.log(`\n  Seeding ${users.length} users…`);
  for (const user of users) {
    // TODO: await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
    console.log(`    ↳ ${user.name} (${user.university})`);
  }

  // ── Matches ────────────────────────────────────────────────────
  console.log(`\n  Seeding ${skillMatches.length} skill matches…`);
  for (const match of skillMatches) {
    // TODO: await prisma.skillMatch.upsert(...)
    console.log(`    ↳ ${match.userA.name} ↔ ${match.userB.name} [${match.status}]`);
  }

  // ── Chains ────────────────────────────────────────────────────
  console.log(`\n  Seeding ${skillChains.length} skill chains…`);
  for (const chain of skillChains) {
    // TODO: await prisma.skillChain.upsert(...)
    console.log(`    ↳ Chain ${chain.id} [${chain.members.length} members]`);
  }

  console.log('\n✅  Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
