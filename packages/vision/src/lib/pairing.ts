/**
 * Pure pairing logic (testable without fs/Next).
 */

export interface PairingData {
  approved: string[]
  pending: Record<string, { platform: string; userId: string; createdAt: number }>
}

export function peerId(platform: string, userId: string): string {
  return `${platform}:${userId}`
}

export function normalizePairingData(raw: unknown): PairingData {
  if (!raw || typeof raw !== 'object') return { approved: [], pending: {} }
  const o = raw as Record<string, unknown>
  return {
    approved: Array.isArray(o.approved) ? o.approved.filter((x): x is string => typeof x === 'string') : [],
    pending: o.pending && typeof o.pending === 'object' && !Array.isArray(o.pending)
      ? (o.pending as Record<string, { platform: string; userId: string; createdAt: number }>)
      : {},
  }
}

/** Returns whether the peer is approved. */
export function isApproved(data: PairingData, platform: string, userId: string): boolean {
  return data.approved.includes(peerId(platform, userId))
}

/** Find existing pending code for this platform+userId, or null. */
export function findPendingCode(
  data: PairingData,
  platform: string,
  userId: string
): string | null {
  const entry = Object.entries(data.pending).find(
    ([, v]) => v.platform === platform && v.userId === userId
  )
  return entry ? entry[0] : null
}

/** Apply approval by code. Returns updated data and approved peerId, or null if code invalid. */
export function approveByCode(
  data: PairingData,
  code: string
): { data: PairingData; approved: string } | null {
  const key = code.trim().toUpperCase()
  const entry = data.pending[key]
  if (!entry) return null
  const pid = peerId(entry.platform, entry.userId)
  const nextPending = { ...data.pending }
  delete nextPending[key]
  const nextApproved = data.approved.includes(pid) ? data.approved : [...data.approved, pid]
  return {
    data: { approved: nextApproved, pending: nextPending },
    approved: pid,
  }
}

/** Add platform+userId to approved list. Returns updated data. */
export function approveByPeer(data: PairingData, platform: string, userId: string): PairingData {
  const pid = peerId(platform.trim(), String(userId))
  const nextApproved = data.approved.includes(pid) ? data.approved : [...data.approved, pid]
  return { ...data, approved: nextApproved }
}
