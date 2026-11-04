export function createLimiter({ minIntervalMs = 1000, maxConcurrent = 1 } = {}) {
  let active = 0;
  let lastStartedAt = 0;
  const queue = [];

  function pump() {
    if (active >= maxConcurrent) return;
    const job = queue.shift();
    if (!job) return;
    const wait = Math.max(0, minIntervalMs - (Date.now() - lastStartedAt));
    active += 1;
    lastStartedAt = Date.now() + wait;
    setTimeout(() => {
      job.resolve();
    }, wait);
  }

  async function acquire() {
    await new Promise((resolve) => {
      queue.push({ resolve });
      pump();
    });
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active -= 1;
      pump();
    };
  }

  return { acquire };
}

export async function withBackoff(attempt, baseMs = 400) {
  const ms = Math.min(4000, baseMs * 2 ** attempt) + Math.floor(Math.random() * 150);
  await new Promise((resolve) => setTimeout(resolve, ms));
}
