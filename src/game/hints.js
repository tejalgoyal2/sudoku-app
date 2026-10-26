import { R, cellName, unitName } from "../engine/core.js";
import { hintChain } from "../engine/techniques.js";

// Hints come in three stages: a nudge (where to look), the reasoning, then applying it.
export function computeHint(game) {
  const { values, puzzle, solution } = game;
  const wrong = values.findIndex((v, i) => v && !puzzle[i] && v !== solution[i]);
  if (wrong >= 0) {
    return {
      kind: "mistake", i: wrong, name: "Check your work", level: 0,
      focus: [wrong], units: [R(wrong)],
      nudge: `Something in ${unitName(R(wrong))} doesn't add up.`,
      text: `${cellName(wrong)} can't be ${values[wrong]} — it leads to a contradiction later. Clear it and look again.`,
    };
  }
  const chain = hintChain(values);
  if (chain) return { kind: "logic", chain };

  const i = game.selected !== null && !values[game.selected] ? game.selected : values.indexOf(0);
  if (i < 0) return null;
  return {
    kind: "logic",
    chain: [{
      id: "reveal", name: "Reveal", level: 7, place: { i, d: solution[i] }, focus: [i], units: [], digits: [solution[i]],
      nudge: "This spot needs techniques beyond the hint library.",
      text: `${cellName(i)} is ${solution[i]}. This position needs advanced chains, so here's the answer for one cell.`,
    }],
  };
}
