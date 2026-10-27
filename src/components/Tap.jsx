import { IOS_HAPTICS } from "../game/sound.js";

// A haptic tap for iPhone. Drop it inside a button: it lays an invisible label over the button,
// wired to a hidden native switch. The finger's tap lands on the label, the label passes it to
// the switch as a real (trusted) click, and iOS plays the switch's haptic. The tap still bubbles
// up to the button as usual; the switch's own click is stopped so the button doesn't fire twice.
// Renders nothing elsewhere, where the Vibration API does the job.
export function Tap({ on = true }) {
  if (!IOS_HAPTICS || !on) return null;
  return (
    <label className="tap" aria-hidden>
      <input type="checkbox" switch="" tabIndex={-1} onClick={(e) => e.stopPropagation()} />
    </label>
  );
}
