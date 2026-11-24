const duration = 12 * 60;
const cooldown = 30_000;

// Elapsed seconds, team (0 for home, 1 for away), points, headline, commentary.
const plays = [
  [
    0,
    null,
    0,
    "Fourth quarter",
    "Eastside start the fourth with a one-point lead.",
  ],
  [
    6,
    1,
    2,
    "Metro take the lead",
    "A backdoor cut sets up an easy layup for the Kings.",
  ],
  [
    22,
    0,
    3,
    "Corner three",
    "The Comets get the lead back from the left corner.",
  ],
  [
    51,
    null,
    0,
    "Block at the rim",
    "Eastside turn away a driving layup and push the ball upcourt.",
  ],
  [
    83,
    1,
    3,
    "Metro answer",
    "The Kings hit a pull-up three after a high screen.",
  ],
  [
    115,
    0,
    2,
    "Comets in transition",
    "Eastside turn a loose ball into two points on the break.",
  ],
  [150, 1, 2, "Offensive rebound", "Metro collect the miss and tip it in."],
  [
    183,
    0,
    3,
    "Three from the wing",
    "Eastside swing it across the floor and splash a three.",
  ],
  [222, 1, 2, "Tie game", "A turnaround jumper draws the Kings level."],
  [
    262,
    0,
    2,
    "Eastside edge ahead",
    "A hard drive splits the defence for a layup.",
  ],
  [
    303,
    1,
    3,
    "Kings retake the lead",
    "Metro take advantage of a late closeout from deep.",
  ],
  [340, 0, 2, "Comets answer", "Eastside pick out the roll man for two."],
  [
    380,
    null,
    0,
    "Metro timeout",
    "The Kings call time with just over five minutes to play.",
  ],
  [
    410,
    1,
    2,
    "Metro score out of the timeout",
    "A baseline cut gives the Kings the lead again.",
  ],
  [
    450,
    0,
    3,
    "Eastside from distance",
    "The Comets hit a three from the top of the key.",
  ],
  [488, 1, 2, "All square again", "Metro finish a fast break and tie it up."],
  [528, 0, 2, "Comets up by two", "Eastside convert a pair of free throws."],
  [
    567,
    1,
    3,
    "Metro go up by one",
    "The Kings knock down a contested corner three.",
  ],
  [
    604,
    0,
    3,
    "Lead changes hands",
    "Eastside answer with a three of their own.",
  ],
  [641, 1, 2, "Kings level it", "Metro beat the shot clock with a floater."],
  [
    678,
    0,
    2,
    "Late Eastside lead",
    "A putback gives the Comets a two-point cushion.",
  ],
  [
    701,
    1,
    1,
    "One-point game",
    "Metro split two free throws with nineteen seconds left.",
  ],
  [
    714,
    0,
    2,
    "Eastside extend the lead",
    "Two free throws give the Comets a three-point lead.",
  ],
  [
    duration,
    null,
    0,
    "Final buzzer",
    "Metro miss from deep and Eastside win the showcase.",
  ],
];

export function createDemo(enabled, broadcast) {
  let revision = Date.now();
  let state = { enabled, revision, match: null, events: [], restartAt: null };

  function emit() {
    state.revision = revision = Math.max(revision + 1, Date.now());
    broadcast(state);
  }

  function advance(index) {
    const [elapsed, team, points, eventType, message] = plays[index];
    const match = state.match;
    if (team === 0) match.homeScore += points;
    if (team === 1) match.awayScore += points;
    const remaining = duration - elapsed;
    const clock =
      Math.floor(remaining / 60) +
      ":" +
      String(remaining % 60).padStart(2, "0");
    state.events.push({
      id: index + 1,
      sequence: index + 1,
      clock,
      eventType,
      message,
    });

    if (remaining === 0) {
      match.status = "finished";
      state.restartAt = Math.max(Date.now(), match.endTime) + cooldown;
    }
    emit();

    const next = plays[index + 1];
    if (next) {
      const wait = match.startTime + next[0] * 1000 - Date.now();
      setTimeout(() => advance(index + 1), Math.max(0, wait)).unref();
    }
  }

  return {
    snapshot: () => state,
    start() {
      if (
        !enabled ||
        state.match?.status === "live" ||
        Date.now() < state.restartAt
      )
        return false;

      const now = Date.now();
      state = {
        enabled,
        revision,
        events: [],
        restartAt: null,
        match: {
          id: now,
          sport: "Basketball",
          homeTeam: "Eastside Comets",
          awayTeam: "Metro Kings",
          codes: ["ESC", "MTK"],
          homeScore: 76,
          awayScore: 75,
          startTime: now,
          endTime: now + duration * 1000,
          status: "live",
        },
      };
      advance(0);
      return true;
    },
  };
}
