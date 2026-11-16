import Link from "next/link";
import styles from "./BackToLab.module.css";

type Props = {
  href?: string;
  label?: string;
};

// 화면 왼쪽 위에 떠 있는 "돌아가기" 링크. 실험이 화면 전체를 쓰더라도
// 돌아갈 길은 남도록 fixed로 띄운다. 기본값은 실험 목록(/)이다.
export default function BackToLab({ href = "/", label = "lab" }: Props) {
  return (
    <Link className={styles.back} href={href}>
      ← {label}
    </Link>
  );
}
