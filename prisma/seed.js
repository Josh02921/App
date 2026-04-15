// Seed script - creates the default Admin user and initial settings
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // ---- Admin User ----
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

  // ---- App Settings ----
  const defaultSettings = [
    {
      key: 'PRODUCTION_TEAMS_CONFIG',
      value: JSON.stringify([
        { name: 'Lyd & Teknik', positions: ['Lyd', 'Kamera', 'Media/Stream'] },
        { name: 'Musik', positions: ['Forsanger', 'Piano', 'Guitar', 'Trommer', 'Bas'] },
        { name: 'Service', positions: ['MC', 'Forsamling', 'Host 1', 'Host 2'] },
        { name: 'Børn & Cafe', positions: ['Kidz', 'Kidz 2', 'Café 1', 'Café 2'] },
      ])
    },
    {
      key: 'CLEANING_AREAS',
      value: JSON.stringify(['Café 1', 'Café 2', 'Salen', 'Toiletter/Gulv/Børnerum'])
    },
    {
      key: 'CLEANING_INSTRUCTIONS',
      value: 'Sørg for at rengøre dit tildelte område grundigt. Brug de rengøringsmidler der er i skabet under trappen. Kontakt pastor ved spørgsmål.'
    },
    {
      key: 'EVENT_TEMPLATES',
      value: JSON.stringify([])
    },
  ]

  for (const setting of defaultSettings) {
    const existingSetting = await prisma.appSetting.findUnique({ where: { key: setting.key } })
    if (!existingSetting) {
      await prisma.appSetting.create({ data: setting })
      console.log(`✅ App setting "${setting.key}" created`)
    } else {
      console.log(`ℹ️  App setting "${setting.key}" already exists`)
    }
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log(`\n📋 Summary:`)
  console.log(`   Admin login: ${adminUsername} / [your ADMIN_PASSWORD env var]`)
  console.log(`   App URL: https://your-app.railway.app/?page=dashboard`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
