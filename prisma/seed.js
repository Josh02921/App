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

  // ---- Translate Settings ----
  const translateCode = process.env.TRANSLATE_CODE || 'KIRKE2025'
  const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'

  const defaultSettings = [
    { key: 'access_code', value: translateCode },
    { key: 'church_name', value: churchName },
    { key: 'service_note', value: 'Oversæt venligst prædikenen til dit valgte sprog. Kontakt pastor ved spørgsmål.' },
    { key: 'languages', value: JSON.stringify(['Engelsk','Arabisk','Dari','Ukrainsk','Russisk','Spansk','Tysk','Farsi']) },
  ]

  for (const setting of defaultSettings) {
    const existingSetting = await prisma.translateSetting.findUnique({ where: { key: setting.key } })
    if (!existingSetting) {
      await prisma.translateSetting.create({ data: setting })
      console.log(`✅ Translate setting "${setting.key}" created`)
    } else {
      console.log(`ℹ️  Translate setting "${setting.key}" already exists`)
    }
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log(`\n📋 Summary:`)
  console.log(`   Admin login: ${adminUsername} / [your ADMIN_PASSWORD env var]`)
  console.log(`   Translate URL: https://your-app.railway.app/?page=translate`)
  console.log(`   Translate code: ${translateCode}`)
  console.log(`   Translate admin: https://your-app.railway.app/?page=translateadmin`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
