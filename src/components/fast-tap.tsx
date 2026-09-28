import { useEffect } from "react";

export function FastTap() {
  useEffect(() => {
    const start = new Map<number, { x: number; y: number; el: HTMLElement }>();
    let blockTrusted: { el: HTMLElement; until: number } | null = null;

    const control = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      if (target.closest("input, textarea, select")) return null;
      const el = target.closest("button, a");
      return el instanceof HTMLElement ? el : null;
    };

    const down = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      const el = control(event.target);
      if (!el || el.getAttribute("aria-disabled") === "true") return;
      start.set(event.pointerId, { x: event.clientX, y: event.clientY, el });
      event.preventDefault();
    };

    const up = (event: PointerEvent) => {
      const arm = start.get(event.pointerId);
      start.delete(event.pointerId);
      if (!arm || !arm.el.isConnected) return;
      if (Math.hypot(event.clientX - arm.x, event.clientY - arm.y) > 22) return;
      blockTrusted = { el: arm.el, until: performance.now() + 700 };
      arm.el.click();
    };

    const cancel = (event: PointerEvent) => {
      start.delete(event.pointerId);
    };

    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || !blockTrusted) return;
      const el = control(event.target);
      if (el === blockTrusted.el && performance.now() < blockTrusted.until) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("pointerdown", down, { capture: true, passive: false });
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
