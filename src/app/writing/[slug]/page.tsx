import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { allPosts, renderPost } from "@/lib/posts";
import styles from "./post.module.css";

// Static export: every post is generated at build time; unknown slugs are 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await renderPost(slug);
  return post ? { title: post.meta.title, description: post.meta.summary } : {};
}

export default async function Post({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = await renderPost(slug);
  if (!post) notFound();
  const { meta, html } = post;
  return (
    <>
      <SiteHeader current="/writing/" />
      <main>
        <article className={styles.article}>
          <Link href="/writing/" className={styles.back}>
            ← Writing
          </Link>
          <p className={styles.meta}>
            {meta.series} · {meta.date} · {meta.readingMinutes} min read
          </p>
          <h1 className={styles.title}>{meta.title}</h1>
          <p className={styles.summary}>{meta.summary}</p>
          {/* Our own Markdown, rendered at build time from files in this repository. */}
          <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
