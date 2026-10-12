import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import WritingList from "@/components/WritingList";
import s from "@/components/page.module.css";
import { plannedPosts } from "@/data/site";
import { allPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "Writing" };

export default function Writing() {
  const published = allPosts();
  const titles = new Set(published.map((p) => p.title));
  const drafts = plannedPosts.filter((p) => !titles.has(p.title));
  return (
    <>
      <SiteHeader current="/writing/" />
      <main className={s.main}>
        <section className={s.hero}>
          <h1 className={s.title}>Writing</h1>
          <p className={s.lede}>
            Build logs on how the projects were built, milestone by milestone, including the parts that broke.
          </p>
        </section>
        <WritingList published={published} drafts={drafts} />
      </main>
      <SiteFooter />
    </>
  );
}
