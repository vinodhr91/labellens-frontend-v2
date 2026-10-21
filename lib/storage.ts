'use client'

export type Profile = {
  id: string
  name: string
  gender: string
  age_group: string
  createdAt: number
}

export type PlateItem = {
  id: string
  profile_name: string
  product: string
  serving_size?: string
  sugar_g: number
  sat_fat_g: number
  sodium_mg: number
  teaspoons: number
  date: string // YYYY-MM-DD
  timestamp: number
}

const PROFILES_KEY = 'labellens_profiles'
const ACTIVE_PROFILE_KEY = 'labellens_active_profile'
const PLATE_KEY = 'labellens_daily_plate'

export function getTodayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------------- Family Profiles ---------------- //

export function getStoredProfiles(): Profile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveStoredProfile(profile: {
  name: string
  gender: string
  age_group: string
}): { success: boolean; paywall?: boolean; profile?: Profile } {
  if (typeof window === 'undefined') return { success: false }
  const current = getStoredProfiles()

  // Allow one profile for free. If already 1 or more, trigger paywall
  if (current.length >= 1) {
    return { success: false, paywall: true }
  }

  const newProfile: Profile = {
    id: `prof_${Date.now()}`,
    name: profile.name.trim() || 'Family Member',
    gender: profile.gender,
    age_group: profile.age_group,
    createdAt: Date.now(),
  }

  const updated = [...current, newProfile]
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updated))
    setActiveProfileName(newProfile.name)
    return { success: true, profile: newProfile }
  } catch {
    return { success: false }
  }
}

export function getActiveProfileName(): string {
  if (typeof window === 'undefined') return 'My Profile'
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY)
    if (saved) return saved
    const profiles = getStoredProfiles()
    if (profiles.length > 0) return profiles[0].name
    return 'My Profile'
  } catch {
    return 'My Profile'
  }
}

export function setActiveProfileName(name: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, name)
  } catch {
    // ignore
  }
}

// ---------------- Today's Plate (Per Profile) ---------------- //

export function getStoredPlateItems(): PlateItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLATE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getTodayPlateItems(profileName?: string): PlateItem[] {
  const all = getStoredPlateItems()
  const today = getTodayKey()
  const target = profileName || getActiveProfileName()

  return all.filter((item) => {
    const isToday = item.date === today
    if (!isToday) return false
    // Match specific profile if specified or if stored with this profile
    return !item.profile_name || item.profile_name.toLowerCase() === target.toLowerCase()
  })
}

export function addProductToProfilePlate(
  profileName: string,
  item: {
    product: string
    serving_size?: string
    sugar_g: number
    sat_fat_g: number
    sodium_mg: number
  }
): { success: boolean; totalItems: number; item: PlateItem } {
  if (typeof window === 'undefined') {
    return { success: false, totalItems: 0, item: {} as PlateItem }
  }

  const all = getStoredPlateItems()
  const teaspoons = Math.round((item.sugar_g / 4.0) * 10) / 10

  const newItem: PlateItem = {
    id: `plate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    profile_name: profileName || getActiveProfileName(),
    product: item.product || 'Scanned Product',
    serving_size: item.serving_size,
    sugar_g: Math.round(item.sugar_g * 10) / 10,
    sat_fat_g: Math.round(item.sat_fat_g * 10) / 10,
    sodium_mg: Math.round(item.sodium_mg),
    teaspoons,
    date: getTodayKey(),
    timestamp: Date.now(),
  }

  const updated = [newItem, ...all]
  try {
    localStorage.setItem(PLATE_KEY, JSON.stringify(updated))
    const todayCount = updated.filter(
      (i) =>
        i.date === getTodayKey() &&
        (!i.profile_name || i.profile_name.toLowerCase() === (profileName || getActiveProfileName()).toLowerCase())
    ).length
    return { success: true, totalItems: todayCount, item: newItem }
  } catch {
    return { success: false, totalItems: 0, item: newItem }
  }
}

export function removePlateItem(id: string, profileName?: string): PlateItem[] {
  if (typeof window === 'undefined') return []
  const all = getStoredPlateItems()
  const updated = all.filter((i) => i.id !== id)
  try {
    localStorage.setItem(PLATE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return getTodayPlateItems(profileName)
}

export function clearTodayPlate(profileName?: string): void {
  if (typeof window === 'undefined') return
  const all = getStoredPlateItems()
  const today = getTodayKey()
  const target = (profileName || getActiveProfileName()).toLowerCase()

  const preserved = all.filter((i) => {
    if (i.date !== today) return true
    return i.profile_name && i.profile_name.toLowerCase() !== target
  })

  try {
    localStorage.setItem(PLATE_KEY, JSON.stringify(preserved))
  } catch {
    // ignore
  }
}
