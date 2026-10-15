import { useEffect, RefObject } from "react";

const DRAG_THRESHOLD = 5; // px of movement before a press counts as a drag

/**
 * Lets a horizontally scrolling element be dragged with the mouse.
 * Mouse only: touch and trackpads keep their native scrolling.
 * A real drag swallows the click that follows it, so cards/links
 * underneath don't trigger when you let go.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId = -1;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      isDown = true;
      dragging = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      pointerId = e.pointerId;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;

      if (!dragging && Math.abs(dx) > DRAG_THRESHOLD) {
        dragging = true;
        el.setPointerCapture(pointerId);
        // Smooth-scroll and snapping would fight the drag and make it laggy.
        el.style.scrollBehavior = "auto";
        el.style.scrollSnapType = "none";
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
      }

      if (dragging) el.scrollLeft = startScroll - dx;
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;

      if (dragging) {
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
        // Hand control back to the CSS classes (snap settles on release).
        el.style.scrollBehavior = "";
        el.style.scrollSnapType = "";
        el.style.cursor = "";
        el.style.userSelect = "";
        // Keep `dragging` true just long enough to eat the trailing click.
        setTimeout(() => { dragging = false; }, 0);
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (dragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Stops the browser's native ghost-image drag on <img> and <a>.
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, [ref]);
}