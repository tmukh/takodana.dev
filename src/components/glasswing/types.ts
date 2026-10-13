// Messages from the glasswing Web Worker (public/glasswing/<release>/worker.js).

export type ModelConfig = {
  vocab_size: number;
  dim: number;
  n_layers: number;
  n_heads: number;
  n_kv_heads: number;
  hidden_dim: number;
  max_seq_len: number;
};

/** One token through the model. Arrays are flat, row-major. */
export type StepMsg = {
  type: "step";
  prompt: boolean;
  token: number;
  text: string;
  pos: number;
  /** [layers, heads, pos+1]: this token's attention over every position so far. */
  attention: Float32Array;
  /** [layers, hidden]: MLP neuron activations. */
  mlp: Float32Array;
  /** [layers+1, dim]: residual stream after the embedding and after each layer. */
  resid: Float32Array;
  topIds: Uint32Array;
  topProbs: Float32Array;
  topTexts: string[];
  /** Logit lens [layers+1, 5]: top tokens if the model stopped after the embedding / each layer. */
  lensIds: Uint32Array;
  lensProbs: Float32Array;
  lensTexts: string[];
};

export type WorkerMsg =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; config: ModelConfig; version: string }
  | StepMsg
  | { type: "done"; reason: "end" | "length" | "stopped" }
  | { type: "error"; message: string };

/** Attention of token `step` over position `j`, for one head or the mean over heads. */
export function attentionWeight(step: StepMsg, cfg: ModelConfig, layer: number, head: number | "all", j: number) {
  const n = step.pos + 1;
  const row = (h: number) => step.attention[(layer * cfg.n_heads + h) * n + j];
  if (head !== "all") return row(head);
  let sum = 0;
  for (let h = 0; h < cfg.n_heads; h++) sum += row(h);
  return sum / cfg.n_heads;
}
