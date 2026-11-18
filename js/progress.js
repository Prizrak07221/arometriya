// Оқушының нәтижесін құрылғының өзінде сақтау
const KEY = "arometriya.progress.v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* жеке режимде немесе жады толғанда — үнсіз өтеміз */
  }
}

export const getAll = () => read();

export function get(topicId) {
  return read()[topicId] || null;
}

/** Тест нәтижесін сақтау (ең жақсы нәтиже қалады) */
export function save(topicId, correct, total) {
  const data = read();
  const prev = data[topicId];
  if (!prev || correct > prev.correct) {
    data[topicId] = { correct, total, at: new Date().toISOString() };
    write(data);
  } else {
    data[topicId] = { ...prev, at: new Date().toISOString() };
    write(data);
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* елемейміз */
  }
}

export function summary(topics) {
  const data = read();
  let done = 0, correct = 0, total = 0;
  for (const t of topics) {
    const r = data[t.id];
    if (!r) continue;
    done++;
    correct += r.correct;
    total += r.total;
  }
  return { done, correct, total, topics: topics.length };
}
