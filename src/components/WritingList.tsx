"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlannedPost } from "@/data/site";
import type { PostMeta } from "@/lib/posts";
import s from "./page.module.css";
import f from "./WritingList.module.css";

const GROUPS = ["All", "Night Sky Digest", "Homelab", "Incidents", "Essays"] as const;

export default function WritingList({ published, drafts }: { published: PostMeta[]; drafts: PlannedPost[] }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
  // Only offer filters that match something (no essays yet, for instance).
  const groups = GROUPS.filter((g) => g === "All" || [...published, ...drafts].some((i) => i.group === g));
  const show = <T extends { group: string }>(items: T[]) => (group === "All" ? items : items.filter((i) => i.group === group));
  return (
    <>
      <div role="group" aria-label="Filter by series" className={f.filters}>
        {groups.map((g) => (
          <button key={g} type="button" aria-pressed={group === g} className={f.filter} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      <ol className={s.rows}>
        {show(published).map((p) => (
          <li key={p.slug}>
            <span className={s.rowMeta}>
              {p.date}
              <br />
              {p.series}
            </span>
            <div className={s.rowBody} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link href={`/writing/${p.slug}/`} className={s.postLink}>
                {p.title}
              </Link>
              <span style={{ color: "var(--ink-2)" }}>{p.summary}</span>
            </div>
          </li>
        ))}
        {show(drafts).map((p) => (
          <li key={p.title}>
            <span className={s.rowMeta}>{p.series}</span>
            <div className={s.rowBody} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className={s.postLink} style={{ color: "var(--muted)" }}>{p.title}</span>
              <span style={{ color: "var(--ink-2)" }}>{p.blurb}</span>
            </div>
            <span className={s.badge}>coming</span>
          </li>
        ))}
      </ol>
    </>
  );
}
