import type { Metadata } from "next";
import Link from "next/link";
import BackToLab from "@/components/BackToLab";
import { getExperiment } from "@/lib/experiments";
import { lessons } from "@/lib/three/lessons";
import styles from "./three.module.css";

const experiment = getExperiment("three");

export const metadata: Metadata = {
  title: experiment.title,
  description: experiment.summary,
};

export default function Page() {
  return (
    <main className={styles.index}>
      <BackToLab />
      <header className={styles.header}>
        <h1 className={styles.title}>{experiment.title}</h1>
        <p className={styles.lead}>
          three.js를 배우면서 정리하는 노트입니다. 페이지마다 실제로 도는 장면이
          있고, 값을 바꾸면 화면과 코드가 함께 바뀝니다.
        </p>
      </header>

      <ol className={styles.toc}>
        {lessons.map((lesson, index) => {
          const body = (
            <>
              <span className={styles.number}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{lesson.title}</span>
                <span className={styles.summary}>{lesson.summary}</span>
              </span>
              {!lesson.ready && <span className={styles.soon}>준비 중</span>}
            </>
          );

          return (
            <li key={lesson.slug}>
              {lesson.ready ? (
                <Link className={styles.row} href={`/three/${lesson.slug}`}>
                  {body}
                </Link>
              ) : (
                <div className={`${styles.row} ${styles.disabled}`}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
