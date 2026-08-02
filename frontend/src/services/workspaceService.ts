/**
 * Workspace Service Helper
 * Manages workspace account type persistence.
 * Currently uses localStorage; designed to easily swap to backend API in future.
 */

export type AccountType = 'personal' | 'business'

const ACCOUNT_TYPE_KEY = 'driverguard_account_type'
const WORKSPACE_SELECTED_KEY = 'workspace_selected'

export const workspaceService = {
  /** Check if workspace has been selected before */
  isWorkspaceSelected(): boolean {
    try {
      return localStorage.getItem(WORKSPACE_SELECTED_KEY) === 'true'
    } catch {
      return false
    }
  },

  /** Get saved workspace preference ('personal' | 'business' | null) */
  getWorkspacePreference(): AccountType | null {
    try {
      const val = localStorage.getItem(ACCOUNT_TYPE_KEY)
      if (val === 'personal' || val === 'business') return val
      return null
    } catch {
      return null
    }
  },

  /** Permanently save workspace preference */
  saveWorkspacePreference(type: AccountType): void {
    try {
      localStorage.setItem(ACCOUNT_TYPE_KEY, type)
      localStorage.setItem(WORKSPACE_SELECTED_KEY, 'true')
    } catch (e) {
      console.warn('Failed to save workspace preference:', e)
    }
  },

  /** Clear workspace preference (only on manual Change/Reset Workspace from Settings) */
  clearWorkspacePreference(): void {
    try {
      localStorage.removeItem(ACCOUNT_TYPE_KEY)
      localStorage.removeItem(WORKSPACE_SELECTED_KEY)
    } catch (e) {
      console.warn('Failed to clear workspace preference:', e)
    }
  },
}
