// OWNER: Pitch presentation. Public, preloaded examples; never writes shared job state.
import towns from "@/data/towns.json";
export const jurisdictions = {
  home: towns.find((t) => t.city === "Philadelphia")!,
  destination: towns.find((t) => t.city === "Princeton")!,
};
export const sections = [
  { id: "problem", label: "The gap" },
  { id: "borders", label: "Across borders" },
  { id: "how", label: "How it works" },
  { id: "correction", label: "See it work" },
  { id: "record", label: "What travels" },
  { id: "build", label: "The build" },
] as const;
export interface Company {
  name: string;
  area: string;
  url: string;
  logo?: string;
}
export const companies: Company[] = [
  {
    name: "Divia Electric",
    area: "Princeton area",
    url: "https://www.diviaelectric.com/",
    logo: "divia.png",
  },
  {
    name: "Princeton Air",
    area: "Princeton area",
    url: "https://www.princetonair.com/electrical/",
    logo: "princeton-air.svg",
  },
  {
    name: "EMCOR Group",
    area: "National",
    url: "https://emcorgroup.com/",
    logo: "emcor.svg",
  },
  {
    name: "Quanta Services",
    area: "National",
    url: "https://www.quantaservices.com/",
    logo: "quanta.png",
  },
  {
    name: "M. J. Electric",
    area: "National",
    url: "https://www.mjelectric.com/homepage-mje/",
    logo: "mj-electric.png",
  },
  {
    name: "Interstates",
    area: "National",
    url: "https://www.interstates.com/",
    logo: "interstates.svg",
  },
];
export const guideBeats = [
  {
    title: "Know where you’re working.",
    label: "01 / LOCATE",
    copy: "Confirm the town. Bring the worker’s home jurisdiction and the job’s local references into the same conversation.",
    say: "I have you in Princeton, New Jersey. Is that right?",
    detail: "GPS → town → worker confirmation",
  },
  {
    title: "Give the call a pair of eyes.",
    label: "02 / LOOK",
    copy: "A phone in a chest harness shares still frames. Boomer sees the part while the electrician keeps their hands on the job.",
    say: "Show me the back of the device.",
    detail: "Harness camera → recent still frames",
  },
  {
    title: "One step. In your ear.",
    label: "03 / GUIDE",
    copy: "A reviewed step template keeps the call grounded. Ask it to repeat, explain or go back without reaching for a screen.",
    say: "Find the pair marked LINE. Say ‘repeat’ whenever you need it.",
    detail: "Reviewed template → voice guidance",
  },
  {
    title: "Check the work you can see.",
    label: "04 / CHECK",
    copy: "Say ‘done.’ Boomer checks the recent image, explains a visible correction, or asks for a clearer view. Physical tests stay with the electrician.",
    say: "Not yet. Those are the LOAD terminals.",
    detail: "Done → visual check → next step or correction",
  },
] as const;
export const replayBeats = [
  {
    label: "The setup",
    title: "A familiar job. A second set of eyes.",
    speaker: "WORKER",
    say: "Kitchen outlet needs to be a GFCI.",
    note: "Example begins after the two spoken hard gates. The prop stays disconnected throughout.",
    connected: false,
    correct: false,
  },
  {
    label: "The mistake",
    title: "The worker says ‘done.’",
    speaker: "WORKER",
    say: "Done. Check that.",
    note: "The incoming pair is shown on LOAD in this staged example. The camera view is the evidence—not the worker’s confidence.",
    connected: true,
    correct: false,
  },
  {
    label: "The correction",
    title: "Not yet. Here’s what’s off.",
    speaker: "BOOMER",
    say: "Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE.",
    note: "A specific, visible correction. No guess about what is behind the wall or whether the circuit is de-energized.",
    connected: true,
    correct: false,
  },
  {
    label: "The record",
    title: "The correction travels with the job.",
    speaker: "BOOMER",
    say: "Looks right. The incoming pair is on LINE.",
    note: "The corrected observation is logged separately from spoken confirmations. TEST / RESET remains a simulated worker report on this inert prop.",
    connected: true,
    correct: true,
  },
] as const;
