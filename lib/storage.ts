'use client'

import type { AgeGroup, Gender } from './scanner'

export type FamilyProfile = {
  id: string
  name: string
  gender: Gender
  ageGroup: AgeGroup
  avatar: string
  createdAt: number
}

export type PlateItem = {
  id: string
  product: string
  serving_size?: string
  sugar_g: number
  sat_fat_g: number
  sodium_mg: number
  date: string // YYYY-MM-DD
  timestamp: number
}

const PROFILES_KEY = 'labellens_family_profiles'
const PLATE_KEY = 'labellens_daily_plate'

export function getTodayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------------- Family Profiles (Freemium) ---------------- //

export function getStoredProfiles(): FamilyProfile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveStoredProfile(profile: Omit<FamilyProfile, 'id' | 'createdAt'>): { success: boolean; paywall?: boolean; profile?: FamilyProfile } {
  if (typeof window === 'undefined') return { success: false }
  const current = getStoredProfiles()
  
  // Freemium limit: only 1 profile allowed for free
  if (current.length >= 1) {
    return { success: false, paywall: true }
  }

  const newProfile: FamilyProfile = {
    ...profile,
    id: `prof_${Date.now()}`,
    createdAt: Date.now(),
  }

  const updated = [...current, newProfile]
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updated))
    return { success: true, profile: newProfile }
  } catch {
    return { success: false }
  }
}

export function deleteStoredProfile(id: string): FamilyProfile[] {
  if (typeof window === 'undefined') return []
  const current = getStoredProfiles()
  const updated = current.filter((p) => p.id !== id)
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

// ---------------- Today's Plate (Aggregate Daily Tracker) ---------------- //

export function getStoredPlateItems(): PlateItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLATE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getTodayPlateItems(): PlateItem[] {
  const all = getStoredPlateItems()
  const today = getTodayKey()
  return all.filter((item) => item.date === today)
}

export function addProductToPlate(item: {
  product: string
  serving_size?: string
  sugar_g: number
  sat_fat_g: number
  sodium_mg: number
}): { success: boolean; totalItems: number } {
  if (typeof window === 'undefined') return { success: false, totalItems: 0 }
  const all = getStoredPlateItems()
  const newItem: PlateItem = {
    id: `plate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    product: item.product || 'Scanned Food Product',
    serving_size: item.serving_size,
    sugar_g: Math.round(item.sugar_g * 10) / 10,
    sat_fat_g: Math.round(item.sat_fat_g * 10) / 10,
    sodium_mg: Math.round(item.sodium_mg),
    date: getTodayKey(),
    timestamp: Date.now(),
  }

  const updated = [newItem, ...all]
  try {
    localStorage.setItem(PLATE_KEY, JSON.stringify(updated))
    const todayCount = updated.filter((i) => i.date === getTodayKey()).length
    return { success: true, totalItems: todayCount }
  } catch {
    return { success: false, totalItems: 0 }
  }
}

export function removePlateItem(id: string): PlateItem[] {
  if (typeof window === 'undefined') return []
  const all = getStoredPlateItems()
  const updated = all.filter((i) => i.id !== id)
  try {
    localStorage.setItem(PLATE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated.filter((i) => i.date === getTodayKey())
}

export function clearTodayPlate(): void {
  if (typeof window === 'undefined') return
  const all = getStoredPlateItems()
  const today = getTodayKey()
  const preserved = all.filter((i) => i.date !== today)
  try {
    localStorage.setItem(PLATE_KEY, JSON.stringify(preserved))
  } catch {
    // ignore
  }
}
