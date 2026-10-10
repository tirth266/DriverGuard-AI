/**
 * Shape of a finalized ride report.
 *
 * Produced by the backend for every scored frame (`process_frame.session`), read
 * live through `/api/video/session/summary`, and frozen onto the ride row by
 * `/api/rides/{id}/end`. The last of those is the one that survives a refresh,
 * so these types live here rather than in the camera feed: the API client needs
 * them to type a stored ride, and importing from the feed would make the client
 * depend on a React component.
 */

export type SessionEvent = {
  type: string
  source: string
  start_time: number
  end_time: number
  duration: number
  max_confidence: number | null
  min_measurement: number | null
  min_score: number
}

export type ScoreBreakdown = {
  type: string
  count: number
  total_seconds: number
  points_lost: number
}

export type SessionSummary = {
  duration_seconds: number
  final_score: number
  grade: string
  lowest_session_score: number
  points_lost: number
  score_breakdown: ScoreBreakdown[]
  total_events: number
  phone_events: number
  total_distracted_duration: number
  events: SessionEvent[]
  score_timeline: Array<{ offset_seconds: number; score: number }>
}

/**
 * Whether a payload is a ride report that can actually be rendered.
 *
 * Only the fields the report cannot be drawn without are checked. A session that
 * was never scored still returns a well-formed summary of zeroes and a full
 * START_SCORE, which is why this is a shape check and not a validity check: a
 * summary has to come from a ride the backend actually measured.
 */
export function isSessionSummary(value: unknown): value is SessionSummary {
  if (!value || typeof value !== 'object') return false
  const summary = value as Partial<SessionSummary>
  return (
    typeof summary.final_score === 'number' &&
    typeof summary.grade === 'string' &&
    typeof summary.total_events === 'number' &&
    Array.isArray(summary.events) &&
    Array.isArray(summary.score_breakdown) &&
    Array.isArray(summary.score_timeline)
  )
}