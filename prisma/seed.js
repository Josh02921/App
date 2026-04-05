// Seed script - creates the default Admin user
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'Horsens2025'
  const adminUsername = process.env.ADMIN_USERNAME || 'Admin'

  const hashed = await bcrypt.hash(adminPassword, 12)

  const existing = await prisma.user.findUnique({ where: { username: adminUsername } })
  if (!existing) {
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashed,
        status: 'Aktiv',
        permKontakter: 'Redaktør',
        permMedlemmer: 'Redaktør',
        permTeams: 'Redaktør',
        permRengoring: 'Redaktør',
        permProduktion: 'Redaktør',
        permGrupper: 'Redaktør',
        permEvents: 'Redaktør',
        permLogins: 'Redaktør',
      }
    })
    console.log(`✅ Admin user "${adminUsername}" created`)
  } else {
    console.log(`ℹ️  Admin user "${adminUsername}" already exists`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
