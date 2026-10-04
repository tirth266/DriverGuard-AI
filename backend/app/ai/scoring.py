"""
Event-based driver safety scoring for DriverGuard AI.

Single source of truth for both the live score and the ride-summary score:
both are produced by `score_from_events()` so they can never disagree.
"""

from typing import Any, Dict, Iterable, List

# ── Tunable constants ─────────────────────────────────────────────────────────

START_SCORE: float = 100.0
MIN_SCORE: float = 0.0
MAX_SCORE: float = 100.0

# Slow credit recovery while no event is active, so the live score reacts
# without being noisy.
RECOVERY_POINTS: float = 1.0
RECOVERY_INTERVAL_SECONDS: float = 5.0

# Per event type: fixed impact the moment the event is confirmed, plus a rate
# applied to every second of duration beyond `grace_seconds`.
PENALTIES: Dict[str, Dict[str, float]] = {
    "phone_use": {"start": 10.0, "per_second": 1.0, "grace_seconds": 0.0},
    "phone_call_suspected": {"start": 5.0, "per_second": 0.5, "grace_seconds": 0.0},
    "eyes_closed": {"start": 10.0, "per_second": 2.0, "grace_seconds": 1.0},
    "drowsy": {"start": 10.0, "per_second": 2.0, "grace_seconds": 1.0},
    "head_away": {"start": 3.0, "per_second": 1.0, "grace_seconds": 0.5},
    "head_down": {"start": 3.0, "per_second": 1.0, "grace_seconds": 0.5},
    "drinking_eating": {"start": 4.0, "per_second": 1.0, "grace_seconds": 1.0},
    "yawn": {"start": 2.0, "per_second": 0.0, "grace_seconds": 0.0},
}

GRADE_BANDS = (
    (90.0, "Excellent"),
    (75.0, "Good"),
    (60.0, "Fair"),
    (40.0, "Poor"),
    (0.0, "Critical"),
)


# ── Scoring ───────────────────────────────────────────────────────────────────


def grade_for(score: float) -> str:
    """Map a 0-100 score onto its grade band."""
    for threshold, label in GRADE_BANDS:
        if score >= threshold:
            return label
    return GRADE_BANDS[-1][1]


def penalty_for(event_type: str, duration: float) -> float:
    """Points lost for a single event of `event_type` lasting `duration` seconds."""
    rule = PENALTIES.get(event_type)
    if rule is None:
        return 0.0
    billable = max(0.0, duration - rule["grace_seconds"])
    return rule["start"] + rule["per_second"] * billable


def score_from_events(events: Iterable[Dict[str, Any]], clean_seconds: float = 0.0) -> Dict[str, Any]:
    """
    Compute the session score, grade and per-event-type breakdown.

    Args:
        events: iterable of event dicts exposing `type` and `duration`.
        clean_seconds: total seconds during which no event was active.
    """
    counts: Dict[str, int] = {}
    seconds: Dict[str, float] = {}
    points: Dict[str, float] = {}

    for event in events:
        event_type = event.get("type")
        if event_type not in PENALTIES:
            continue
        duration = max(0.0, float(event.get("duration") or 0.0))
        counts[event_type] = counts.get(event_type, 0) + 1
        seconds[event_type] = seconds.get(event_type, 0.0) + duration
        points[event_type] = points.get(event_type, 0.0) + penalty_for(event_type, duration)

    recovery = RECOVERY_POINTS * (max(0.0, clean_seconds) / RECOVERY_INTERVAL_SECONDS)
    points_lost = sum(points.values())
    raw = START_SCORE - points_lost + recovery
    score = int(round(max(MIN_SCORE, min(MAX_SCORE, raw))))

    breakdown: List[Dict[str, Any]] = [
        {
            "type": event_type,
            "count": counts[event_type],
            "total_seconds": round(seconds[event_type], 1),
            "points_lost": round(points[event_type], 1),
        }
        for event_type in counts
    ]
    breakdown.sort(key=lambda item: item["points_lost"], reverse=True)

    return {
        "score": score,
        "grade": grade_for(score),
        "points_lost": round(points_lost, 1),
        "recovery_points": round(recovery, 1),
        "score_breakdown": breakdown,
    }
