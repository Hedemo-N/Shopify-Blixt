// check-session.cjs
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const n = await p.session.count();
  console.log('Session rows:', n);
}
main().finally(() => p.$disconnect());
