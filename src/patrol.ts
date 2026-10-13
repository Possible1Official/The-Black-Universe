import {attendVisitor} from './visibility';
/** Deterministic local waypoint behavior. No pathfinder or remote AI service. */
export interface Point { x: number; z: number }
export interface PatrolState {
  waypoint: 0 | 1;
  wait: number;
  blocked: number;
  mode: 'patrolling' | 'waiting' | 'attending' | 'inspecting';
}
export const freshPatrol = (): PatrolState => ({waypoint: 0, wait: 0, blocked: 0, mode: 'patrolling'});
export function planPatrol(
  previous: PatrolState, position: Point, route: readonly [Point, Point],
  visitor: Point, dt: number, speaking = false, visible = true,
) {
  const state = {...previous};
  const visitorDistance = Math.hypot(visitor.x-position.x, visitor.z-position.z);
  if (attendVisitor(visitorDistance,previous.mode==='attending',speaking,visible)) {
    state.mode = 'attending'; state.blocked = 0;
    return {state, displacement: {x: 0, z: 0}, facing: visitor};
  }
  if (state.wait > 0) {
    state.wait = Math.max(0, state.wait-dt); state.mode = 'waiting';
    return {state, displacement: {x: 0, z: 0}, facing: route[state.waypoint]};
  }
  const destination = route[state.waypoint];
  const dx = destination.x-position.x, dz = destination.z-position.z;
  const distance = Math.hypot(dx,dz);
  if (distance < .12) {
    state.waypoint = state.waypoint === 0 ? 1 : 0;
    state.wait = 1.4; state.blocked = 0; state.mode = 'waiting';
    return {state, displacement: {x: 0, z: 0}, facing: route[state.waypoint]};
  }
  state.mode = 'patrolling';
  const step = Math.min(distance, .65*dt);
  return {state, displacement: {x: dx/distance*step, z: dz/distance*step}, facing: destination};
}
/** Reverse the local route after a sustained obstruction instead of walking in place. */
export function recordPatrolMovement(state: PatrolState, intended: number, actual: number, dt: number): PatrolState {
  const blocked = intended > .001 && actual < intended*.1 ? state.blocked+dt : 0;
  if (blocked >= 2) return {...state, waypoint: state.waypoint === 0 ? 1 : 0, wait: .4, blocked: 0, mode: 'waiting'};
  return {...state, blocked};
}
export function turnToward(current: number, desired: number, dt: number): number {
  const delta = Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
  return current + Math.max(-2.4*dt,Math.min(2.4*dt,delta));
}
