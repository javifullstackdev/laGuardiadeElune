/** Shrinks an element until its text fits on one line. */
export function fitToOneLine(el: HTMLElement, max: number, min: number) {
  el.style.whiteSpace = "nowrap";
  const fits = (size: number) => {
    el.style.fontSize = `${size}px`;
    return el.scrollWidth <= el.clientWidth + 1;
  };
  if (fits(max)) {
    el.style.fontSize = `${max}px`;
    return;
  }
  let low = min;
  let high = max;
  let best = min;
  while (high - low > 0.4) {
    const mid = (low + high) / 2;
    if (fits(mid)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  let size = best;
  while (size > 11 && !fits(size)) size -= 0.5;
  el.style.fontSize = `${size}px`;
}
