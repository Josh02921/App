// ============================================================
// settings.ts - Generic key-value AppSetting store
// Replaces GAS PropertiesService.getScriptProperties()
// ============================================================

import db from './db'

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const row = await db.appSetting.findUnique({ where: { key } })
    return row ? row.value : defaultValue
  } catch {
    return defaultValue
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

export async function getSettingJson<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await getSetting(key, '')
  if (!raw) return defaultValue
  try {
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export async function setSettingJson(key: string, value: unknown): Promise<void> {
  await setSetting(key, JSON.stringify(value))
}
