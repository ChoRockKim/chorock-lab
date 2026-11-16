import Link from "next/link";
import { listExperiments } from "@/lib/experiments";
import styles from "./page.module.css";

export default function Home() {
  const items = listExperiments();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>chorock lab</h1>
        <p className={styles.lead}>
          작은 실험을 만들어 모아 두는 곳입니다. 글은{" "}
          <a className={styles.inline} href="https://chorock.page">
            chorock.page
          </a>
          에 씁니다.
        </p>
      </header>

      {items.length === 0 && (
        <p className={styles.empty}>아직 올린 실험이 없습니다.</p>
      )}

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.slug}>
            <Link className={styles.card} href={`/${item.slug}`}>
              <span className={styles.date}>{item.date}</span>
              <span className={styles.name}>{item.title}</span>
              <span className={styles.summary}>{item.summary}</span>
              <span className={styles.tags}>
                {item.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
