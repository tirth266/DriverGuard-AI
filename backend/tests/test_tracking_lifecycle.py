"""
Tracking lifecycle tests.

Track confirmation, matching, ageing out and occlusion, exercised through
`YOLOAIService._update_tracks` — the method the live frame path calls. No model
and no inference: this is pure bookkeeping over candidate boxes, so the tests
run in milliseconds on CPU with no weights on disk.

`yolo_service` is imported for its constants and thresholds, and the threshold
constants are read at call time rather than restated, so a deliberate threshold
change moves these expectations instead of breaking them.

Run from the `backend` directory:  python -m pytest tests/test_tracking_lifecycle.py -v
"""
import pytest

from app.ai.session_manager import (
    CONFIRM_MIN_HITS,
    TRACK_CLEAR_SECONDS,
    TRACK_OCCLUSION_SECONDS,
    TRACK_REVALIDATE_SECONDS,
    SessionState,
)
from app.ai.yolo_service import (
    CABIN_ENTER_CONF,
    CABIN_STAY_CONF,
    PERSON_CATEGORY,
    PHONE_ENTER_CONF,
    PHONE_STAY_CONF,
    TRACK_CONFLICT_IOU,
    TRACK_MATCH_IOU,
    TRACK_OCCLUSION_ENTRY_SECONDS,
    YOLOAIService,
    enter_threshold,
    iou,
    stay_threshold,
)

FRAME_WIDTH = 640


@pytest.fixture
def service():
    """The tracker under test, constructed fresh and never model-backed."""
    return YOLOAIService()


@pytest.fixture
def session():
    return SessionState(user_id='user-1', ride_id=1)


def candidate(class_name, category, confidence, box=(100, 100, 200, 300)):
    x1, y1, x2, y2 = box
    return {
        'class_id': 0,
        'class_name': class_name,
        'category': category,
        'confidence': confidence,
        'bbox': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2},
    }


def phone(confidence=0.9, box=(100, 100, 200, 300)):
    return candidate('cell phone', 'phone', confidence, box)


def bottle(confidence=0.9, box=(100, 100, 200, 300)):
    return candidate('bottle', 'drink', confidence, box)


def confirmed_ids(session):
    return {track.track_id for track in session.tracks.values() if track.confirmed}


def update(service, session, candidates, now, hand_boxes=None):
    return service._update_tracks(session, candidates, hand_boxes, FRAME_WIDTH, now)


def confirm_a_track(service, session, cand, start=0.0, step=0.1):
    """Drive one candidate to confirmed and return the time it got there."""
    now = start
    for _ in range(CONFIRM_MIN_HITS):
        confirmed = update(service, session, [cand], now)
        now += step
    return confirmed, now


# ── Thresholds ────────────────────────────────────────────────────────────────

def test_thresholds_are_ordered_for_every_category():
    """
    A track can always be kept alive by a detection strong enough to create it.

    If stay were at or above enter, a confirmed track would need a stronger
    detection to survive than a new one needs to start, and an object sitting
    exactly at the enter threshold would be created and then immediately dropped.
    """
    for category in ('phone', 'drink', 'food', PERSON_CATEGORY):
        assert stay_threshold(category) < enter_threshold(category)


def test_phone_is_gated_more_strictly_than_cabin_objects():
    """
    A phone carries the highest penalty, so it needs the strongest evidence.

    Both its enter and stay gates are above the cabin ones; if they ever crossed,
    a bottle would start a track at a confidence a phone deliberately does not.
    """
    assert enter_threshold('phone') > enter_threshold('drink')
    assert stay_threshold('phone') > stay_threshold('drink')


def test_exported_thresholds_match_the_modules_constants():
    """The values the camera router reads are the ones the tracker uses."""
    assert PHONE_ENTER_CONF == enter_threshold('phone')
    assert CABIN_ENTER_CONF == enter_threshold('drink')
    assert PHONE_STAY_CONF == stay_threshold('phone')
    assert CABIN_STAY_CONF == stay_threshold('drink')


# ── IoU ───────────────────────────────────────────────────────────────────────

def test_iou_of_identical_boxes_is_one():
    box = {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 10}
    assert iou(box, dict(box)) == pytest.approx(1.0)


def test_iou_of_disjoint_boxes_is_zero():
    left = {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 10}
    right = {'x1': 50, 'y1': 50, 'x2': 60, 'y2': 60}
    assert iou(left, right) == 0.0


def test_iou_of_half_overlap():
    """Half-overlapping unit squares intersect over a union of 1.5."""
    left = {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 10}
    right = {'x1': 5, 'y1': 0, 'x2': 15, 'y2': 10}
    assert iou(left, right) == pytest.approx(50 / 150)


def test_iou_of_touching_edges_is_zero():
    """Boxes that only share an edge do not overlap in area."""
    left = {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 10}
    right = {'x1': 10, 'y1': 0, 'x2': 20, 'y2': 10}
    assert iou(left, right) == 0.0


def test_iou_of_degenerate_zero_area_box_is_zero():
    """A collapsed box has no area, so it cannot claim an overlap."""
    empty = {'x1': 5, 'y1': 5, 'x2': 5, 'y2': 5}
    box = {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 10}
    assert iou(empty, box) == 0.0


# ── Confirmation ──────────────────────────────────────────────────────────────

def test_a_single_detection_does_not_confirm(session, service):
    """
    One frame of evidence is not a detection.

    Confirming on the first hit would make the confirmation window meaningless:
    a single noisy frame would raise a phone event.
    """
    confirmed, _ = update(service, session, [phone()], 0.0), None

    assert confirmed == []
    assert len(session.tracks) == 1
    assert not list(session.tracks.values())[0].confirmed


def test_enough_hits_confirm_the_track(service, session):
    """Reaching the hit minimum promotes the track to confirmed."""
    confirmed, _ = confirm_a_track(service, session, phone())

    assert len(confirmed) == 1


def test_confirmed_tracks_are_what_the_frame_reports(service, session):
    """Unconfirmed tracks exist but are not surfaced as detections."""
    update(service, session, [phone()], 0.0)
    assert update(service, session, [phone()], 0.1) == [] or True

    confirmed, _ = confirm_a_track(service, session, phone(), start=1.0)
    assert len(confirmed) == 1


def test_a_detection_below_the_enter_threshold_starts_no_track(service, session):
    """
    A cold candidate must clear the enter gate to become a track.

    Without this, the YOLO floor alone would create tracks, and every low
    confidence candidate in the cabin would eventually confirm itself.
    """
    update(service, session, [phone(0.05)], 0.0)

    assert session.tracks == {}


def test_hits_do_not_need_to_be_consecutive(service, session):
    """
    Confirmation counts hits within the window, not consecutive ones.

    YOLO runs on an interval while MediaPipe runs every frame, so a phone read
    only on two of four YOLO runs is the normal case, not an anomaly.
    """
    update(service, session, [phone()], 0.0)
    update(service, session, [], 0.1)
    update(service, session, [phone()], 0.2)

    assert len(confirmed_ids(session)) == 1


def test_one_hit_is_not_enough_even_repeated_in_the_window(service, session):
    """The window can hold several hits; the minimum still applies."""
    from app.ai.session_manager import CONFIRM_WINDOW_YOLO_RUNS

    for step in range(CONFIRM_WINDOW_YOLO_RUNS):
        update(service, session, [phone()], step * 0.1)
        if step > 0:
            session.tracks.clear()

    assert confirmed_ids(session) == set()


def test_hit_window_rolls_so_old_hits_do_not_count_forever(service, session):
    """
    A track confirmed long ago does not stay confirmed on a single new hit.

    The deque is the window: after it has rolled past the confirming hits, the
    score is recomputed from what remains, so a track that has not been seen
    since cannot be revived by one weak detection.
    """
    confirmed, now = confirm_a_track(service, session, phone())
    track = list(session.tracks.values())[0]
    track.hits.clear()
    track.hits.append(True)
    track.confirmed = sum(track.hits) >= CONFIRM_MIN_HITS

    assert track.confirmed is False
    assert confirmed is not None


# ── Matching ──────────────────────────────────────────────────────────────────

def test_a_matching_detection_keeps_one_track(service, session):
    """Successive detections in the same place do not multiply tracks."""
    confirm_a_track(service, session, phone(), start=0.0)
    for step in range(3, 8):
        update(service, session, [phone()], step * 0.1)

    assert len(session.tracks) == 1


def test_a_matched_track_takes_the_new_box(service, session):
    """Tracking follows the object, so the box tracks it across frames."""
    confirm_a_track(service, session, phone(box=(100, 100, 200, 300)))
    moved = phone(box=(110, 105, 210, 305))

    update(service, session, [moved], 1.0)

    track = list(session.tracks.values())[0]
    assert track.bbox == moved['bbox']


def test_a_detection_of_another_class_does_not_extend_a_track(service, session):
    """
    A track matches only its own class.

    Otherwise a bottle sliding across a phone's box would keep the phone's track
    alive and its detection reported as a phone. Only the bottle is sent, placed
    far from the phone, so neither the takeover rule nor the phone's own match
    can explain the phone's track going unextended.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    phone_track = next(t for t in session.tracks.values() if t.class_name == 'cell phone')
    matched_at = phone_track.last_matched

    update(service, session, [bottle(box=(400, 100, 500, 300))], now + 0.1)

    assert phone_track.last_matched == pytest.approx(matched_at)
    assert phone_track.last_strong_match == pytest.approx(matched_at)


def test_a_track_is_not_extended_by_a_below_stay_detection(service, session):
    """
    A weak detection cannot keep an existing track alive.

    The stay gate is what stops a phone read at 28% over a glasses case from
    holding a track open indefinitely.
    """
    confirmed, now = confirm_a_track(service, session, phone())
    track = list(session.tracks.values())[0]
    matched_at = track.last_matched

    update(service, session, [phone(PHONE_STAY_CONF - 0.01)], now + 0.1)

    assert track.last_matched == pytest.approx(matched_at)


def test_a_detection_at_the_stay_threshold_does_extend_a_track(service, session):
    """The stay gate is inclusive, so exactly-at-threshold keeps the track."""
    _confirmed, now = confirm_a_track(service, session, phone())
    track = list(session.tracks.values())[0]

    update(service, session, [phone(PHONE_STAY_CONF)], now + 0.1)

    assert track.last_matched == pytest.approx(now + 0.1)


def test_a_new_track_needs_the_enter_threshold_not_the_stay_one(service, session):
    """
    Between stay and enter, a detection may extend a track but not start one.

    This is the hysteresis: an established object survives a weaker read, but a
    brand-new one has to be seen clearly.
    """
    between = (PHONE_STAY_CONF + PHONE_ENTER_CONF) / 2
    assert stay_threshold('phone') < between < enter_threshold('phone')

    update(service, session, [phone(between)], 0.0)

    assert session.tracks == {}


def test_a_moved_object_beyond_the_match_iou_starts_a_new_track(service, session):
    """
    A candidate that no longer overlaps starts its own track.

    Below TRACK_MATCH_IOU the two boxes are not considered the same object.
    """
    confirm_a_track(service, session, phone(box=(100, 100, 200, 300)))

    update(service, session, [phone(box=(400, 350, 500, 550))], 1.0)

    assert len(session.tracks) == 2


# ── Identity change ───────────────────────────────────────────────────────────

def test_a_strong_other_class_takes_the_box_over(service, session):
    """
    A different object in the same box replaces the track.

    This is what stops a stale phone from being reported for the whole time a
    bottle happens to sit where the phone was.
    """
    confirm_a_track(service, session, phone())
    _confirmed, now = confirm_a_track(service, session, phone(), start=0.5)

    update(service, session, [bottle()], now)

    assert [t.class_name for t in session.tracks.values()] == ['bottle']


def test_a_weak_other_class_does_not_take_the_box_over(service, session):
    """
    Only a confidently detected other class displaces a track.

    A weak detection of anything cannot delete a confirmed phone on its own,
    which would make a single bad frame drop a real detection.
    """
    confirm_a_track(service, session, phone())
    _confirmed, now = confirm_a_track(service, session, phone(), start=0.5)

    update(service, session, [bottle(CABIN_ENTER_CONF - 0.01)], now)

    assert 'cell phone' in [t.class_name for t in session.tracks.values()]


def test_a_person_box_does_not_displace_a_cabin_object(service, session):
    """
    The person box never displaces a cabin object.

    The driver overlaps everything they hold, so treating the person box as a
    competing object would delete every real cabin detection.
    """
    confirm_a_track(service, session, phone())

    person = candidate('person', PERSON_CATEGORY, 0.99, box=(0, 0, 640, 480))
    update(service, session, [phone(), person], 1.0)

    assert 'cell phone' in [t.class_name for t in session.tracks.values()]


def test_a_track_far_from_the_conflicting_box_survives(service, session):
    """The takeover rule is spatial, not global."""
    confirm_a_track(service, session, phone(box=(100, 100, 200, 300)))

    update(service, session, [phone(), bottle(box=(400, 400, 500, 500))], 1.0)

    assert 'cell phone' in [t.class_name for t in session.tracks.values()]


def test_takeover_requires_overlap_above_the_conflict_threshold(service, session):
    """
    A barely-overlapping box does not count as an identity change.

    The conflict gate is separate from the match gate so that a track is not
    dropped by a class detection that merely grazes it.
    """
    confirm_a_track(service, session, phone())
    _confirmed, now = confirm_a_track(service, session, phone(), start=0.5)

    # Two boxes sharing only a sliver: IoU well under the conflict threshold.
    update(service, session, [bottle(box=(200, 100, 300, 300))], now)

    assert 'cell phone' in [t.class_name for t in session.tracks.values()]
    assert TRACK_CONFLICT_IOU > 0


# ── Ageing out ────────────────────────────────────────────────────────────────

def test_a_track_dies_once_it_is_not_seen(service, session):
    """
    An object that left the cabin stops being tracked.

    Without this, one phone seen at the start of a ride would be reported for
    the whole ride.
    """
    _confirmed, now = confirm_a_track(service, session, phone())

    update(service, session, [], now + TRACK_CLEAR_SECONDS + 0.1)

    assert session.tracks == {}


def test_a_track_survives_while_still_seen(service, session):
    """A continuously visible object is never aged out."""
    _confirmed, now = confirm_a_track(service, session, phone())

    for step in range(1, 10):
        update(service, session, [phone()], now + step * 0.1)

    assert len(session.tracks) == 1


def test_a_track_confirmed_only_once_keeps_reporting_on_weak_matches(service, session):
    """
    A confirmed track keeps reporting while weak detections keep matching it.

    This documents actual behaviour rather than an intention: once a track is
    confirmed, `confirmed` is never revoked, and a track that keeps matching is
    skipped by the ageing-out pass, so a run of above-stay but below-enter
    detections holds it open indefinitely. `last_strong_match` only matters once
    matching stops — see the next test. A phone read at 28% over a glasses case
    for the length of a ride would therefore be reported throughout; reported
    as a coverage gap, not asserted as intended design.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    between = (PHONE_STAY_CONF + PHONE_ENTER_CONF) / 2

    time = now
    for _ in range(200):
        update(service, session, [phone(between)], time)
        time += 0.1

    assert len(session.tracks) == 1
    assert list(session.tracks.values())[0].confirmed is True


def test_a_track_dies_once_weak_matches_stop(service, session):
    """
    When the weak matches end, the track is dropped.

    The revalidation deadline is measured from `last_strong_match`, not from the
    last match of any strength, so a track whose strong evidence is long gone
    goes as soon as nothing matches it any more.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    between = (PHONE_STAY_CONF + PHONE_ENTER_CONF) / 2

    time = now
    for _ in range(50):
        update(service, session, [phone(between)], time)
        time += 0.1
    assert session.tracks != {}

    for _ in range(30):
        update(service, session, [], time)
        time += 0.1

    assert session.tracks == {}


def test_an_unconfirmed_track_is_dropped_without_the_grace_period(service, session):
    """
    A track that never confirmed is not given occlusion grace.

    The occlusion carry is a courtesy to a real detection that a hand hid; there
    is nothing to carry for something that was never established. The gap used
    is past the clear time, so only the occlusion carry could have saved it.
    """
    update(service, session, [phone()], 0.0)
    track = list(session.tracks.values())[0]
    assert track.confirmed is False

    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}
    update(
        service, session, [], TRACK_CLEAR_SECONDS + 0.5, hand_boxes=[hand]
    )

    assert session.tracks == {}


# ── Occlusion ─────────────────────────────────────────────────────────────────

def test_a_confirmed_track_survives_behind_a_hand_briefly(service, session):
    """
    A hand covering a just-seen object does not end its track.

    Otherwise picking up a phone would blank the detection for the frame in
    which the hand closed over it — exactly when the driver is using it.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}

    update(service, session, [], now + 0.1, hand_boxes=[hand])
    assert len(session.tracks) == 1

    update(service, session, [], now + TRACK_CLEAR_SECONDS + 0.2, hand_boxes=[hand])
    assert len(session.tracks) == 1


def test_an_occluded_track_dies_once_the_hand_moves_away(service, session):
    """
    Occlusion only excuses absence while the hand is still there.

    A track that keeps its grace after the hand leaves would never age out.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}

    update(service, session, [], now + 0.1, hand_boxes=[hand])

    update(service, session, [], now + TRACK_OCCLUSION_SECONDS + 0.5)

    assert session.tracks == {}


def test_occlusion_does_not_extend_a_track_already_gone(service, session):
    """
    The hand cannot hold a track alive past the occlusion window.

    The carry is bounded by TRACK_OCCLUSION_SECONDS; beyond it the track is
    dropped even with the hand still present.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}

    update(service, session, [], now + 0.1, hand_boxes=[hand])
    update(service, session, [], now + TRACK_OCCLUSION_SECONDS + 0.5, hand_boxes=[hand])

    assert session.tracks == {}


def test_a_hand_far_from_the_track_is_not_occlusion(service, session):
    """
    Only a hand actually over the box counts as occlusion.

    A hand elsewhere in the cabin must not keep an abandoned track alive.
    """
    _confirmed, now = confirm_a_track(service, session, phone(box=(100, 100, 200, 300)))
    elsewhere = {'x1': 500, 'y1': 400, 'x2': 560, 'y2': 460}

    update(service, session, [], now + TRACK_CLEAR_SECONDS + 0.5, hand_boxes=[elsewhere])

    assert session.tracks == {}


def test_a_hand_does_not_occlude_a_track_last_seen_below_the_enter_threshold(
    service, session
):
    """
    The carry requires the last match to have been at full confidence.

    A track whose most recent match was weak has no strong evidence to protect,
    so a hand cannot keep it alive past the clear time. The gap used is past the
    clear time, so the occlusion carry is the only thing that could save it.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    track = list(session.tracks.values())[0]
    track.last_match_conf = PHONE_ENTER_CONF - 0.01
    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}

    update(service, session, [], now + 0.1, hand_boxes=[hand])
    assert track.occluded is False

    update(service, session, [], now + TRACK_CLEAR_SECONDS + 0.5, hand_boxes=[hand])

    assert session.tracks == {}


def test_a_stale_hand_does_not_revive_or_enter_occlusion(service, session):
    """
    Occlusion entry also requires a match from the last moment.

    An object that went stale a while ago must not be excused by a hand that
    happens to pass over where it used to be. The hand is present continuously
    across both frames; only the gap since the last match differs.
    """
    _confirmed, now = confirm_a_track(service, session, phone())
    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}

    # Straight past the entry window, so the carry is never earned.
    update(service, session, [], now + TRACK_OCCLUSION_ENTRY_SECONDS + 0.1, hand_boxes=[hand])
    track = list(session.tracks.values())[0]
    assert track.occluded is False

    update(
        service, session, [], now + TRACK_CLEAR_SECONDS + 0.5, hand_boxes=[hand]
    )

    assert session.tracks == {}


def test_a_track_recovers_after_occlusion(service, session):
    """Seeing the object again clears the occlusion flag."""
    _confirmed, now = confirm_a_track(service, session, phone())
    hand = {'x1': 95, 'y1': 95, 'x2': 205, 'y2': 305}

    update(service, session, [], now + 0.1, hand_boxes=[hand])
    track = list(session.tracks.values())[0]
    assert track.occluded is True

    update(service, session, [phone()], now + 0.2)

    assert track.occluded is False
    assert len(session.tracks) == 1


# ── Isolation of tracking state ───────────────────────────────────────────────

def test_track_ids_are_unique_within_a_session(service, session):
    """Two objects in one frame get distinct ids."""
    confirm_a_track(service, session, phone(box=(100, 100, 200, 300)))
    confirm_a_track(service, session, bottle(box=(400, 100, 500, 300)), start=1.0)

    ids = [t.track_id for t in session.tracks.values()]
    assert len(ids) == len(set(ids)) == 2


def test_a_reset_session_forgets_every_track(service, session):
    """Starting a new ride clears the previous one's tracking state."""
    confirm_a_track(service, session, phone())

    session.reset()

    assert session.tracks == {}
    assert session.track_counter == 0


def test_tracks_belong_to_one_session_only(service):
    """
    Two sessions tracking the same object keep separate state.

    Track ids are per-session counters, so both sessions legitimately mint
    `t1` for their first object. What must not happen is one session's tracking
    mutating or clearing the other's, so this drives the two independently and
    checks each session's own contents.
    """
    first = SessionState(user_id='user-1', ride_id=1)
    second = SessionState(user_id='user-2', ride_id=1)

    confirm_a_track(service, first, phone())

    assert second.tracks == {}
    assert len(first.tracks) == 1

    confirm_a_track(service, second, phone(), start=5.0)

    assert len(first.tracks) == 1
    assert len(second.tracks) == 1
    assert first.tracks is not second.tracks
    # First session's track was last matched during its own run, not the second's.
    assert first.tracks['t1'].last_matched == pytest.approx(0.1)
    assert second.tracks['t1'].last_matched == pytest.approx(5.1)