import Link from "next/link";
import styles from "./BackToLab.module.css";

// 실험 화면 왼쪽 위에 떠 있는 "목록으로" 링크. 실험이 화면 전체를 쓰더라도
// 돌아갈 길은 남도록 fixed로 띄운다. 필요 없는 실험은 쓰지 않으면 된다.
export default function BackToLab() {
  return (
    <Link className={styles.back} href="/">
      ← lab
    </Link>
  );
}
