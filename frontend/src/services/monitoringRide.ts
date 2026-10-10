/**
 * Starting the ride a monitoring session reports on.
 *
 * Monitoring itself does not need a ride, but End Ride does: it has to close a
 * ride and read back a stored report. So this resolves *what kind* of ride to
 * open before the first frame is sent, and fails loudly when it cannot, rather
 * than leaving the session running with a null rideId that End Ride can only
 * refuse.
 *
 * Which kind of ride is decided from the account's own fleet, not from the
 * workspace the UI happens to be showing:
 *
 * - An account with no company owns no fleet, so it records a **personal** ride:
 *   no driver, vehicle or company, sent as an empty body. This is the case that
 *   previously could not start a ride at all, because it depended on a driver
 *   record linked to the user that a personal account never has.
 * - An account that owns a company records a **fleet** ride on a driver and
 *   vehicle from that fleet.
 *
 * Neither driver nor vehicle is ever defaulted to "the first one in the list":
 * a ride attributed to somebody else's driver would be a real report about the
 * wrong person, so an unresolvable driver or vehicle is an actionable error.
 */

import { ApiError, companyApi, driverApi, rideApi, vehicleApi, RIDE_STATUS_ACTIVE } from './fleetApi'

export class RideStartError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RideStartError'
  }
}

/** What the ride was opened against, for display and for the End Ride flow. */
export interface RideActors {
  driverId: number
  vehicleId: number
}

/**
 * The fleet driver and vehicle this account may open a ride with.
 *
 * Only the signed-in user's own driver record is used, and only a vehicle that
 * is actually assigned to that driver. Anything else is left to the user to fix
 * rather than guessed at.
 */
async function resolveFleetActors(userId: number): Promise<RideActors> {
  const { drivers } = await driverApi.list(1, 100)
  const driver = drivers.find(d => d.user_id === userId)
  if (!driver) {
    throw new RideStartError(
      'No driver in your fleet is linked to your account, so there is nobody to record this ride against. ' +
      'Add a driver with your account email in your fleet dashboard, then start monitoring again.',
    )
  }

  let vehicleId = driver.assigned_vehicle_id
  if (!vehicleId) {
    const { vehicles } = await vehicleApi.list(1, 100)
    vehicleId = vehicles.find(v => v.assigned_driver_id === driver.id)?.id ?? null
  }
  if (!vehicleId) {
    throw new RideStartError(
      `${driver.full_name} has no vehicle assigned, so this ride has no vehicle to record. ` +
      'Assign a vehicle to that driver in your fleet dashboard, then start monitoring again.',
    )
  }

  return { driverId: driver.id, vehicleId }
}

/**
 * Closes the ride that is blocking this one, if there is one.
 *
 * Only the caller's own rides are ever considered, and for a fleet ride only the
 * one held by the same driver: a user may have another driver's ride legitimately
 * open, and ending that one would close a ride somebody is still monitoring.
 */
async function closeBlockingRide(actors: RideActors | null): Promise<boolean> {
  const { rides } = await rideApi.list()
  const blocking = rides.find(r =>
    r.status === RIDE_STATUS_ACTIVE && (!actors || r.driver_id === actors.driverId),
  )
  if (!blocking) return false
  await rideApi.end(blocking.id)
  return true
}

/**
 * Opens the ride for a monitoring session and returns its id.
 *
 * The returned id is the one every frame of the session carries and the one End
 * Ride closes, so a ride opened here is the only ride that session can report
 * on.
 */
export async function startMonitoringRide(userId: number): Promise<number> {
  const { company } = await companyApi.get()
  const actors: RideActors | null = company ? await resolveFleetActors(userId) : null
  const body = actors ?? {}

  let ride
  try {
    ;({ ride } = await rideApi.start(body))
  } catch (error) {
    // Only one ride per driver (and, for a personal ride, per account) may be
    // open at a time, and a session that ended without confirming it leaves one
    // behind. That ride is over, so it is closed and the start retried once. Any
    // other failure is the server's answer and is reported as-is, rather than
    // retried into a session that would still have no ride.
    if (!(error instanceof ApiError) || error.status !== 400) throw error
    if (!(await closeBlockingRide(actors))) throw error
    ;({ ride } = await rideApi.start(body))
  }

  return ride.id
}