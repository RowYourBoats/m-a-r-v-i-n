// Shared lifecycle for animated SVG diagrams.
// Diagrams call attachLifecycle(svgEl, start, stop). The runtime decides when
// to invoke them based on viewport visibility and reduced-motion preference.
//
// - prefers-reduced-motion: never starts. The diagram's static skeleton still
//   renders because the diagram component builds geometry before calling this.
// - off-screen: stop() called so the animation pauses. start() called when the
//   element scrolls back into view.
// - no IntersectionObserver: starts once and never stops (very old browsers).
export function attachLifecycle(
  target: Element,
  start: () => void,
  stop: () => void,
): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }

  let active = false;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !active) {
          active = true;
          start();
        } else if (!entry.isIntersecting && active) {
          active = false;
          stop();
        }
      }
    },
    { rootMargin: "100px" },
  );
  io.observe(target);
}
