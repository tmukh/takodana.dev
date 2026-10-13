// Every interactive figure a post can use, by the name written in the Markdown fence.
import { lazy } from "react";

export const figures: Record<string, ReturnType<typeof lazy>> = {
  bytes: lazy(() => import("./glasswing/Bytes")),
  "bpe-stepper": lazy(() => import("./glasswing/BpeStepper")),
  "bpe-curve": lazy(() => import("./glasswing/BpeCurve")),
  "word-map": lazy(() => import("./glasswing/WordMap")),
  "word-vector": lazy(() => import("./glasswing/WordVector")),
};
