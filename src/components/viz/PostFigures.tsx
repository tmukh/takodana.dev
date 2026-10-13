"use client";

// Mounts interactive figures into the placeholders the Markdown pipeline leaves in a post
// (<figure data-viz="name" data-props="{...}">, see rehypeFigures in lib/posts.ts). Each figure is
// its own lazily loaded chunk, so a post only downloads the figures it uses.

import { Suspense, useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { figures } from "./registry";

type Slot = { el: HTMLElement; name: string; props: Record<string, unknown> };

export default function PostFigures() {
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    const found: Slot[] = [];
    document.querySelectorAll<HTMLElement>("figure[data-viz]").forEach((el) => {
      const name = el.dataset.viz ?? "";
      let props: Record<string, unknown> = {};
      try {
        props = JSON.parse(el.dataset.props || "{}");
      } catch {
        // A typo in a post's JSON shouldn't take the page down; the figure gets its defaults.
      }
      el.querySelector(".viz-fallback")?.remove();
      found.push({ el, name, props });
    });
    // Collecting DOM nodes the server-rendered HTML left behind has to happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(found);
  }, []);

  return (
    <>
      {slots.map(({ el, name, props }, i) => {
        const Figure = figures[name] as ComponentType<Record<string, unknown>> | undefined;
        return createPortal(
          Figure ? (
            <Suspense fallback={<p className="viz-loading">Loading figure…</p>}>
              <Figure {...props} />
            </Suspense>
          ) : (
            <p className="viz-loading">Unknown figure “{name}”.</p>
          ),
          el,
          `${name}-${i}`,
        );
      })}
    </>
  );
}
