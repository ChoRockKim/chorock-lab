import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lab.chorock.page"),
  title: { default: "chorock lab", template: "%s | chorock lab" },
  description: "작은 실험을 만들어 모아 두는 곳입니다.",
};

// 루트 레이아웃은 일부러 비워 둔다. 실험마다 화면이 완전히 달라도 되도록
// 공통 헤더나 여백을 여기서 강제하지 않는다.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
