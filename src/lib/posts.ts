// Posts and essays are Markdown files with front matter, rendered to HTML at build time:
// no Markdown parser and no syntax highlighter ship to the browser.
import fs from "node:fs";
import path from "node:path";
import rehypeShiki from "@shikijs/rehype";
import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type Kind = "post" | "essay";

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

/**
 * Interactive figures in Markdown. A fenced block
 *
 *     ```figure
 *     bpe-stepper
 *     {"text": "optional JSON props"}
 *     ```
 *
 * becomes <figure data-viz="bpe-stepper" data-props="...">, with a short text fallback inside.
 * PostFigures (a client component) mounts the interactive version into it in the browser.
 */
function rehypeFigures() {
  const text = (n: HastNode): string => n.value ?? (n.children ?? []).map(text).join("");
  const walk = (node: HastNode) => {
    node.children = (node.children ?? []).map((child) => {
      const code = child.tagName === "pre" ? child.children?.[0] : undefined;
      const classes = (code?.properties?.className as string[] | undefined) ?? [];
      if (!code || !classes.includes("language-figure")) {
        walk(child);
        return child;
      }
      const [name, ...rest] = text(code).trim().split("\n");
      return {
        type: "element",
        tagName: "figure",
        properties: { className: ["viz"], dataViz: name.trim(), dataProps: rest.join("\n").trim() || "{}" },
        children: [
          {
            type: "element",
            tagName: "p",
            properties: { className: ["viz-fallback"] },
            children: [{ type: "text", value: "Interactive figure: it needs JavaScript to run." }],
          },
        ],
      };
    });
  };
  return (tree: HastNode) => walk(tree);
}

export type PostMeta = {
  slug: string;
  kind: Kind;
  title: string;
  date: string; // YYYY-MM-DD
  series: string; // e.g. "Night Sky · M3", "Homelab", "Incident", "Essay"
  group: "Night Sky Digest" | "glasswing" | "Homelab" | "Incidents" | "Essays";
  summary: string;
  readingMinutes: number;
};

const ROOT = path.join(process.cwd(), "src", "content");
const DIRS: Record<Kind, string> = { post: "posts", essay: "essays" };

function files(kind: Kind): string[] {
  const dir = path.join(ROOT, DIRS[kind]);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
}

function meta(kind: Kind, file: string): PostMeta {
  const raw = fs.readFileSync(path.join(ROOT, DIRS[kind], file), "utf8");
  const { data, content } = matter(raw);
  for (const key of ["title", "date", "summary"]) {
    if (!data[key]) throw new Error(`${DIRS[kind]}/${file}: front matter is missing "${key}"`);
  }
  return {
    slug: file.replace(/\.md$/, ""),
    kind,
    title: data.title,
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
    series: data.series ?? (kind === "essay" ? "Essay" : "Build log"),
    group: data.group ?? (kind === "essay" ? "Essays" : "Night Sky Digest"),
    summary: data.summary,
    readingMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 220)),
  };
}

export function allPosts(): PostMeta[] {
  return (["post", "essay"] as Kind[])
    .flatMap((kind) => files(kind).map((f) => meta(kind, f)))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function renderPost(slug: string): Promise<{ meta: PostMeta; html: string } | null> {
  for (const kind of ["post", "essay"] as Kind[]) {
    const file = `${slug}.md`;
    if (!files(kind).includes(file)) continue;
    const { content } = matter(fs.readFileSync(path.join(ROOT, DIRS[kind], file), "utf8"));
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeFigures)
        .use(rehypeSlug)
        .use(rehypeShiki, { theme: "github-dark-dimmed" })
        .use(rehypeStringify)
        .process(content),
    );
    return { meta: meta(kind, file), html };
  }
  return null;
}
