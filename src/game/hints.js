import { R, C, PEERS, cellName, unitName } from "../engine/core.js";
import { hintChain } from "../engine/techniques.js";

// Hints come in three stages: a nudge (where to look), the reasoning, then applying it.
export function computeHint(game) {
  const { values, puzzle, solution } = game;
  const wrong = values.findIndex((v, i) => v && !puzzle[i] && v !== solution[i]);
  if (wrong >= 0) {
    const v = values[wrong];
    // If it plainly clashes with a filled cell, say which one; otherwise it's the solution that disagrees.
    const clash = PEERS[wrong].find((p) => values[p] === v);
    return {
      kind: "mistake", i: wrong, name: "Check your work", level: 0,
      focus: [wrong], units: [R(wrong)], proof: clash >= 0 ? [clash] : [],
      headline: `${cellName(wrong)} isn't ${v}`,
      nudge: `Something in ${unitName(R(wrong))} is wrong. Can you spot which cell?`,
      text: clash >= 0
        ? `${cellName(wrong)} has a ${v}, but ${cellName(clash)} (ringed) already has a ${v} in the same ${R(clash) === R(wrong) ? "row" : C(clash) === C(wrong) ? "column" : "box"}. Clear ${cellName(wrong)} and look again.`
        : `${cellName(wrong)} has a ${v}, but this puzzle's only solution has a different digit there. It doesn't break a rule yet, but it leads to a dead end later. Clear it and look again.`,
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
      headline: `${cellName(i)} is ${solution[i]}`,
      nudge: "This one is tricky: no simple technique finds it.",
      text: `${cellName(i)} is ${solution[i]}. Nothing simple narrows this position down; it needs a long chain of "what if" steps, so here is the answer for one cell.`,
    }],
  };
}
