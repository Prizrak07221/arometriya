// Барлық тақырыптардың тізімі
import {
  parallelogram, quadfamily, trapezoid, trianglemid,
  pythagoras, similar, trig, circleangles,
} from "./geometry/plane.js";
import { prism, pyramid, revolution, sphere } from "./geometry/solids.js";

export const TOPICS = [
  parallelogram, quadfamily, trapezoid, trianglemid,
  pythagoras, similar, trig, circleangles,
  prism, pyramid, revolution, sphere,
];

export const CATEGORIES = ["Барлығы", "Жазықтық", "Кеңістік"];

export const byId = (id) => TOPICS.find((t) => t.id === id);

/** Басқару элементтерінің бастапқы мәндері */
export function defaultParams(topic) {
  const p = {};
  for (const c of topic.controls || []) p[c.id] = c.value;
  return p;
}
