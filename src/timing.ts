export const FIXED_STEP=1/60;
export const MAX_FRAME_SECONDS=.25;
export const MAX_STEPS=15;
// Bounded catch-up preserves 60 Hz collision steps; never enlarge a physics step.
export class FixedFrameClock {
  private remainder=0;
  reset(){this.remainder=0;}
  advance(seconds:number){
    const elapsed=Number.isFinite(seconds)?Math.max(0,seconds):0;
    const accepted=Math.min(elapsed,MAX_FRAME_SECONDS),pending=this.remainder+accepted;
    const steps=Math.min(MAX_STEPS,Math.floor((pending+1e-9)/FIXED_STEP));
    this.remainder=Math.max(0,pending-steps*FIXED_STEP);
    return {steps,remainder:this.remainder,dropped:elapsed-accepted};
  }
}
export const JUMP_BUFFER_SECONDS=.2;
export function stepJumpBuffer(buffer:number,grounded:boolean){
  return {jump:grounded&&buffer>0,remaining:grounded?0:Math.max(0,buffer-FIXED_STEP)};
}
