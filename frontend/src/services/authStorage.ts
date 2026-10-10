/**
 * Browser storage for the signed-in session.
 *
 * The token and the user profile are one session, so they are read, written and
 * cleared as a pair. They used to be read from two independent
 * `localStorage || sessionStorage` chains and written to whichever one the user
 * happened to pick at login, which let a browser end up holding account A's
 * profile in localStorage and account B's token in sessionStorage and restore
 * the mismatched pair on reload. Every read here therefore returns a complete
 * pair or nothing, and a half-pair or a duplicate left over from that behaviour
 * is discarded rather than merged.
 *
 * Nothing in this module decides authorization. It only remembers who was
 * signed in; what that account may do is decided by the server.
 */

const TOKEN_KEY = 'driverguard_auth_token'
const USER_KEY = 'driverguard_user_data'

export interface StoredSession {
  token: string
  user: string
}

/** localStorage can throw outright under some privacy settings. */
function storages(): Storage[] {
  try {
    return [window.localStorage, window.sessionStorage].filter(Boolean)
  } catch {
    return []
  }
}

function readPair(storage: Storage): StoredSession | null {
  const token = storage.getItem(TOKEN_KEY)
  const user = storage.getItem(USER_KEY)
  return token && user ? { token, user } : null
}

function purge(storage: Storage): void {
  try {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
  } catch {
    /* storage unavailable; nothing to clear */
  }
}

/**
 * The stored session, or null when there is no complete one.
 *
 * If more than one storage holds a session, the first wins and the rest are
 * dropped: that state can only have been produced by the mixed-storage bug, and
 * leaving it in place is what lets two accounts alternate on reload.
 */
export function restoreSession(): StoredSession | null {
  let found: StoredSession | null = null

  for (const storage of storages()) {
    const session = readPair(storage)
    if (session) {
      if (!found) {
        found = session
      } else {
        purge(storage)
      }
    } else {
      // Either nothing here, or one half of a pair. A half can never be
      // completed into a session, so it is dropped instead of being paired
      // with a token from the other storage.
      purge(storage)
    }
  }

  return found
}

/**
 * Replace the stored session with this one.
 *
 * `rememberMe` picks localStorage over sessionStorage. Whatever it picks, the
 * other one is cleared, so a session-only user can never leave a persistent
 * copy behind for a later account to inherit.
 */
export function saveSession(token: string, user: string, rememberMe: boolean): void {
  const [local, session] = storages()

  for (const storage of storages()) purge(storage)
  if (!rememberMe && !session) return

  const target = rememberMe ? local : session
  if (!target) return
  try {
    target.setItem(TOKEN_KEY, token)
    target.setItem(USER_KEY, user)
  } catch {
    /* storage full or unavailable; the session stays in memory for this tab */
  }
}

/**
 * Rewrite only the profile, leaving the token where it is.
 *
 * Used when the signed-in account's own details change. The profile must land in
 * the same storage as the token or the two would drift apart again.
 */
export function saveUser(user: string): void {
  for (const storage of storages()) {
    if (storage.getItem(TOKEN_KEY)) {
      try {
        storage.setItem(USER_KEY, user)
      } catch {
        /* storage unavailable */
      }
      return
    }
  }
}

/** Drop the session from every storage. */
export function clearSession(): void {
  for (const storage of storages()) purge(storage)
}

export const AUTH_TOKEN_KEY = TOKEN_KEY
export const AUTH_USER_KEY = USER_KEY