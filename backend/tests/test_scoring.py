"""
Scoring policy tests: event mapping, aggregation, recovery and clamping.

`score_from_events` is the single source of truth for both the live score and
the ride-summary score, so these tests read its published constants rather than
restating numbers: if a threshold or a penalty changes deliberately, the
expectations here move with it instead of needing an edit.

Pure functions, no model, no database, no clock.

Run from the `backend` directory:  python -m pytest tests/test_scoring.py -v
"""
import pytest

from app.ai.scoring import (
    GRADE_BANDS,
    MAX_SCORE,
    MIN_SCORE,
    PENALTIES,
    RECOVERY_INTERVAL_SECONDS,
    RECOVERY_POINTS,
    START_SCORE,
    grade_for,
    penalty_for,
    score_from_events,
)


def event(event_type, duration, **extra):
    return {'type': event_type, 'duration': duration, **extra}


# ── Event type mapping ─────────────────────────────────────────────────────────

def test_every_configured_event_type_maps_to_a_known_rule():
    """
    Each type the session raises has a penalty rule.

    A type present in the session's vocabulary but missing from PENALTIES would
    be scored as if it never happened: the event would appear in the breakdown's
    raw event list and cost nothing. This fails if the two lists drift apart.
    """
    from app.ai.session_manager import ALL_EVENT_TYPES

    assert ALL_EVENT_TYPES == set(PENALTIES)


def test_unknown_event_type_is_ignored_rather_than_scored():
    """
    An unrecognized type costs nothing and appears in no breakdown.

    This is also what stops a stray key from silently moving a score.
    """
    result = score_from_events([event('not_a_real_event', 120.0)])

    assert result['score'] == int(START_SCORE)
    assert result['points_lost'] == 0.0
    assert result['score_breakdown'] == []


def test_event_with_no_type_is_ignored():
    """A malformed entry is dropped instead of raising or scoring."""
    result = score_from_events([{'duration': 30.0}, {'type': None, 'duration': 30.0}])

    assert result['score'] == int(START_SCORE)
    assert result['score_breakdown'] == []


# ── Duration and penalty arithmetic ────────────────────────────────────────────

@pytest.mark.parametrize('event_type', sorted(PENALTIES))
def test_zero_duration_costs_only_the_start_penalty(event_type):
    """A confirmed event costs its start penalty the moment it is confirmed."""
    rule = PENALTIES[event_type]

    assert penalty_for(event_type, 0.0) == pytest.approx(rule['start'])


@pytest.mark.parametrize('event_type', sorted(PENALTIES))
def test_duration_inside_grace_costs_only_the_start_penalty(event_type):
    """
    Time inside the grace window is free.

    Grace exists so a detection that flickers for a moment is not billed for
    the whole grace period; without this an event type with a grace window would
    be worth less than its own grace.
    """
    rule = PENALTIES[event_type]
    if rule['grace_seconds'] <= 0:
        pytest.skip(f'{event_type} has no grace window')

    half = rule['grace_seconds'] / 2
    assert penalty_for(event_type, half) == pytest.approx(rule['start'])


@pytest.mark.parametrize('event_type', sorted(PENALTIES))
def test_duration_past_grace_adds_the_per_second_rate(event_type):
    """Beyond the grace window the penalty grows linearly with duration."""
    rule = PENALTIES[event_type]
    if rule['per_second'] <= 0:
        pytest.skip(f'{event_type} carries no per-second rate')

    billable = 4.0
    assert penalty_for(event_type, rule['grace_seconds'] + billable) == pytest.approx(
        rule['start'] + rule['per_second'] * billable
    )


def test_negative_duration_is_treated_as_zero():
    """A clock artefact cannot reduce a penalty below the start cost."""
    assert penalty_for('phone_use', -50.0) == penalty_for('phone_use', 0.0)


def test_missing_duration_is_treated_as_zero():
    """An event with no duration still costs its start penalty, not nothing."""
    result = score_from_events([{'type': 'phone_use'}])

    assert result['points_lost'] == pytest.approx(PENALTIES['phone_use']['start'])


# ── Aggregation ────────────────────────────────────────────────────────────────

def test_repeated_events_of_one_type_accumulate():
    """Two events of a type cost more than either alone, and count twice."""
    once = score_from_events([event('phone_use', 2.0)])
    twice = score_from_events([event('phone_use', 2.0), event('phone_use', 2.0)])

    assert twice['points_lost'] == pytest.approx(2 * once['points_lost'])
    breakdown = twice['score_breakdown'][0]
    assert breakdown['type'] == 'phone_use'
    assert breakdown['count'] == 2
    assert breakdown['total_seconds'] == pytest.approx(4.0)


def test_distinct_event_types_score_independently():
    """Two different types are billed separately, not merged."""
    result = score_from_events([event('yawn', 0.0), event('head_away', 0.0)])

    types = {item['type'] for item in result['score_breakdown']}
    assert types == {'yawn', 'head_away'}
    assert result['points_lost'] == pytest.approx(
        PENALTIES['yawn']['start'] + PENALTIES['head_away']['start']
    )


def test_breakdown_is_ordered_by_points_lost_descending():
    """
    The worst offender leads the breakdown.

    The UI reads the first rows as "top penalties", so a breakdown that sorted
    arbitrarily would surface the least harmful event first.
    """
    result = score_from_events([
        event('yawn', 0.0),
        event('eyes_closed', 3.0),
        event('head_away', 0.0),
    ])

    points = [item['points_lost'] for item in result['score_breakdown']]
    assert points == sorted(points, reverse=True)
    assert result['score_breakdown'][0]['type'] == 'eyes_closed'


# ── Recovery ──────────────────────────────────────────────────────────────────

def test_clean_seconds_add_recovery_proportionally():
    """Clean time credits points at the published rate, against a real penalty."""
    result = score_from_events(
        [event('phone_use', 10.0)],
        clean_seconds=RECOVERY_INTERVAL_SECONDS * 4,
    )

    assert result['recovery_points'] == pytest.approx(RECOVERY_POINTS * 4)
    assert result['points_lost'] == pytest.approx(penalty_for('phone_use', 10.0))
    assert result['score'] == int(START_SCORE - penalty_for('phone_use', 10.0) + RECOVERY_POINTS * 4)


def test_recovery_is_capped_at_the_maximum_score():
    """
    Enough clean time cannot push the score above 100.

    Credit is unbounded in time, so without the cap a long uneventful ride
    would report more than a perfect one.
    """
    result = score_from_events([], clean_seconds=RECOVERY_INTERVAL_SECONDS * 10_000)

    assert result['score'] == int(MAX_SCORE)
    assert result['grade'] == grade_for(MAX_SCORE)


def test_recovery_offsets_penalties():
    """Clean credit reduces what the events cost, and is reported separately."""
    penalty_only = score_from_events([event('phone_use', 4.0)])
    with_credit = score_from_events([event('phone_use', 4.0)], clean_seconds=10.0)

    assert with_credit['score'] > penalty_only['score']
    assert with_credit['points_lost'] == pytest.approx(penalty_only['points_lost'])
    assert with_credit['recovery_points'] > 0


def test_recovery_never_lifts_a_score_past_what_was_lost_below_start():
    """Credit is added to the raw total, so it can offset penalties."""
    result = score_from_events([event('phone_use', 60.0)], clean_seconds=120.0)

    assert result['score'] <= int(MAX_SCORE)
    assert result['recovery_points'] > 0


def test_negative_clean_seconds_are_ignored():
    """A clock artefact cannot mint score out of a negative duration."""
    result = score_from_events([], clean_seconds=-100.0)

    assert result['recovery_points'] == 0.0
    assert result['score'] == int(START_SCORE)


def test_clean_time_never_repays_a_confirmed_events_start_penalty():
    """
    Credit is bounded by the duration-billed part of the penalties charged.

    The confirmation cost is the record that the event happened, so it stays on
    the ride no matter how long clean driving follows. Without this bound a ride
    that recorded a phone could be driven clean for long enough and score its
    way back to a perfect 100/100, erasing the very thing that happened.
    """
    result = score_from_events(
        [event('phone_use', 4.0)],
        clean_seconds=RECOVERY_INTERVAL_SECONDS * 10_000,
    )

    start_cost = PENALTIES['phone_use']['start']
    billed = penalty_for('phone_use', 4.0) - start_cost

    assert result['recovery_points'] == pytest.approx(billed)
    assert result['recovery_points'] > 0
    # The confirmation cost is still on the ride, so this is not a clean score.
    assert result['score'] == int(START_SCORE - penalty_for('phone_use', 4.0) + billed)
    assert result['score'] < int(START_SCORE)


def test_credit_never_exceeds_the_debt_it_is_repaying():
    """
    Recovery is capped at the debt, not just at the maximum score.

    Capping only at MAX_SCORE would let a large penalty be partly erased while
    still reporting a healthy score.
    """
    for duration in (0.0, 1.0, 5.0, 60.0):
        for clean in (0.0, 30.0, 600.0, 100_000.0):
            result = score_from_events([event('phone_use', duration)], clean_seconds=clean)
            running = max(0.0, penalty_for('phone_use', duration) - PENALTIES['phone_use']['start'])
            assert result['recovery_points'] <= running + 1e-9, (duration, clean)
            assert result['recovery_points'] <= max(
                0.0, RECOVERY_POINTS * clean / RECOVERY_INTERVAL_SECONDS
            ) + 1e-9, (duration, clean)


def test_a_ride_with_no_events_gains_nothing_from_clean_time():
    """
    With no debt, clean time is worth nothing.

    This is the honest direction of the bound: there is nothing to repay, so the
    score simply stays where it already was rather than rising.
    """
    for clean in (0.0, 20.0, 10_000.0):
        result = score_from_events([], clean_seconds=clean)

        assert result['recovery_points'] == 0.0, clean
        assert result['score'] == int(START_SCORE), clean


def test_reported_recovery_is_the_credit_applied_not_the_credit_earned():
    """
    The summary reports the credit the score actually received.

    Reporting the uncapped figure would show a recovery on a report whose score
    never benefited from it, which is the same class of dishonesty as reporting
    a fabricated 100/100.
    """
    earned = RECOVERY_POINTS * (RECOVERY_INTERVAL_SECONDS * 10_000) / RECOVERY_INTERVAL_SECONDS
    result = score_from_events([event('phone_use', 1.0)], clean_seconds=RECOVERY_INTERVAL_SECONDS * 10_000)

    assert earned > result['recovery_points']
    assert result['recovery_points'] <= result['points_lost']


@pytest.mark.parametrize('event_type', sorted(PENALTIES))
def test_no_event_type_can_be_driven_back_to_a_clean_score(event_type):
    """
    Unlimited clean time leaves every event type below a perfect score.

    Swept over the whole vocabulary, because the bound is computed from each
    type's own rule and one type with an unusual rule could escape it.
    """
    rule = PENALTIES[event_type]
    if rule['start'] <= 0:
        pytest.skip(f'{event_type} charges no confirmation cost')

    result = score_from_events(
        [event(event_type, 5.0)],
        clean_seconds=RECOVERY_INTERVAL_SECONDS * 100_000,
    )

    assert result['score'] < int(START_SCORE)
    assert result['score'] >= int(START_SCORE) - rule['start'] - rule['per_second'] * 5.0


# ── Bounded recovery ──────────────────────────────────────────────────────────
#
# Recovery is credit for driving cleanly, and it may only repay penalties. Every
# penalty is a confirmation cost plus a rate over the event's duration, and only
# the rate is repayable — so a ride that recorded an event keeps that event's
# confirmation cost for its whole length. Without the bound, unbounded clean time
# could buy back a real distraction outright: a phone_use costing 20 points was
# repaid in full by 100 clean seconds, and the ride then reported 100/100 beside
# the event it had just charged for.

def test_recovery_never_repays_an_events_confirmation_cost():
    """
    The confirmation penalty is not earnable back, however long the clean run.

    Only the duration-billed part of the penalty is repaid, so the floor a ride
    with one event can reach is START_SCORE minus that event's start cost.
    """
    rule = PENALTIES['phone_use']

    result = score_from_events(
        [event('phone_use', 10.0)],
        clean_seconds=RECOVERY_INTERVAL_SECONDS * 10_000,
    )

    assert result['recovery_points'] == pytest.approx(rule['per_second'] * 10.0)
    assert result['score'] == int(START_SCORE - rule['start'])
    assert result['score'] < int(MAX_SCORE)


@pytest.mark.parametrize('event_type', sorted(PENALTIES))
def test_a_ride_with_any_event_is_never_scored_as_a_clean_ride(event_type):
    """
    Whatever the incident, and however much clean time follows it, no 100/100.

    This is the property the bound exists to guarantee: an unbounded credit let a
    ride with confirmed events finish on the perfect score that the summary's own
    event list contradicted.
    """
    result = score_from_events(
        [event(event_type, 3.0)],
        clean_seconds=RECOVERY_INTERVAL_SECONDS * 10_000,
    )

    assert result['points_lost'] > 0
    assert result['score'] < int(MAX_SCORE)
    assert result['score'] == int(START_SCORE - PENALTIES[event_type]['start'])


@pytest.mark.parametrize('duration', [0.0, 0.5, 1.0, 12.5, 600.0])
def test_recovery_never_exceeds_the_points_that_were_lost(duration):
    """Credit is bounded by the penalty, so it can never be spent twice over."""
    charged = score_from_events([event('phone_use', duration)])['points_lost']

    result = score_from_events([event('phone_use', duration)], clean_seconds=600.0)

    assert result['recovery_points'] <= charged
    assert result['score'] <= int(START_SCORE)


def test_recovery_still_lifts_the_score_within_its_bound():
    """
    The live behaviour is preserved, not removed: clean driving still lifts the
    score, it just stops lifting it all the way back to a clean ride.
    """
    charged = score_from_events([event('phone_use', 10.0)])
    partly_repaid = score_from_events(
        [event('phone_use', 10.0)],
        clean_seconds=RECOVERY_INTERVAL_SECONDS * 5,
    )

    assert partly_repaid['recovery_points'] == pytest.approx(RECOVERY_POINTS * 5)
    assert partly_repaid['score'] > charged['score']
    assert partly_repaid['score'] < int(START_SCORE)


def test_clean_time_on_a_ride_with_no_events_earns_no_credit():
    """
    Credit repays penalties, so with no penalty there is nothing to repay.

    The score is unchanged by the bound — an event-free ride was already at the
    ceiling, where any credit was clamped away — so this pins that clean time
    never became a way to mint score rather than a way to repay it.
    """
    result = score_from_events([], clean_seconds=RECOVERY_INTERVAL_SECONDS * 10_000)

    assert result['score'] == int(START_SCORE)
    assert result['recovery_points'] == 0.0


# ── Clamping and grading ───────────────────────────────────────────────────────

def test_score_is_clamped_at_the_minimum():
    """A long, severe event bottoms out at 0 rather than going negative."""
    result = score_from_events([event('eyes_closed', 10_000.0)])

    assert result['score'] == int(MIN_SCORE)
    assert result['points_lost'] > MAX_SCORE


def test_score_is_never_negative_for_any_event_combination():
    """Sweep of single severe events: nothing reports below the floor."""
    for event_type in PENALTIES:
        result = score_from_events([event(event_type, 500.0)])
        assert result['score'] >= int(MIN_SCORE), event_type
        assert result['score'] <= int(MAX_SCORE), event_type


@pytest.mark.parametrize('score,expected', [
    (100.0, 'Excellent'),
    (90.0, 'Excellent'),
    (89.9, 'Good'),
    (75.0, 'Good'),
    (74.9, 'Fair'),
    (60.0, 'Fair'),
    (59.9, 'Poor'),
    (40.0, 'Poor'),
    (39.9, 'Critical'),
    (0.0, 'Critical'),
])
def test_grade_bands(score, expected):
    """Grade labels are inclusive at the lower bound of each band."""
    assert grade_for(score) == expected


def test_grade_bands_cover_the_whole_range_without_gaps():
    """
    Bands are contiguous and descend to the floor.

    A gap would let a score fall through every band and hit the last label,
    reporting "Critical" for a ride that was merely mediocre.
    """
    thresholds = [threshold for threshold, _ in GRADE_BANDS]
    assert thresholds == sorted(thresholds, reverse=True)
    assert thresholds[-1] == MIN_SCORE

    # Every score in range must land in the band its value names.
    for value in range(int(MIN_SCORE), int(MAX_SCORE) + 1):
        assert grade_for(float(value)) in {label for _, label in GRADE_BANDS}


def test_score_is_a_plain_integer():
    """The score is reported as an int, so the UI never shows 82.0/100."""
    result = score_from_events([event('phone_use', 1.3)])

    assert isinstance(result['score'], int)


def test_empty_session_scores_the_start_score():
    """
    A session with no events scores START_SCORE.

    Note this is a property of the pure function only. Whether such a score may
    ever be shown to a user is decided one layer up, by the session refusing to
    build a summary for a session that never scored a frame — see
    test_session_isolation.py.
    """
    assert score_from_events([])['score'] == int(START_SCORE)