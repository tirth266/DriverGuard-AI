/**
 * GPS Hook for DriverGuard AI
 * Handles browser geolocation for ride tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react'

export interface GPSLocation {
  latitude: number
  longitude: number
  accuracy: number | null
  timestamp: string
}

export interface GPSState {
  location: GPSLocation | null
  error: string | null
  loading: boolean
  supported: boolean
  watching: boolean
}

export function useGPS() {
  const [state, setState] = useState<GPSState>({
    location: null,
    error: null,
    loading: false,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    watching: false,
  })

  const watchIdRef = useRef<number | null>(null)

  const getCurrentLocation = useCallback((): Promise<GPSLocation> => {
    return new Promise((resolve, reject) => {
      if (!state.supported) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
          }
          setState(prev => ({ ...prev, location, loading: false }))
          resolve(location)
        },
        (error) => {
          let message = 'Unable to retrieve location'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location access in browser settings.'
              break
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.'
              break
            case error.TIMEOUT:
              message = 'Location request timed out.'
              break
          }
          setState(prev => ({ ...prev, error: message, loading: false }))
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }, [state.supported])

  const startWatching = useCallback((onUpdate: (location: GPSLocation) => void) => {
    if (!state.supported || state.watching) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        }
        setState(prev => ({ ...prev, location, error: null }))
        onUpdate(location)
      },
      (error) => {
        let message = 'Location tracking error'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out.'
            break
        }
        setState(prev => ({ ...prev, error: message }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    )

    setState(prev => ({ ...prev, watching: true }))
  }, [state.supported])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setState(prev => ({ ...prev, watching: false }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    ...state,
    getCurrentLocation,
    startWatching,
    stopWatching,
  }
}