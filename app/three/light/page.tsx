import type { Metadata } from "next";
import BackToLab from "@/components/BackToLab";
import { getLesson } from "@/lib/three/lessons";
import LightLesson from "./LightLesson";

const lesson = getLesson("light");

export const metadata: Metadata = {
  title: `${lesson.title} | three.js 노트`,
  description: lesson.summary,
};

export default function Page() {
  return (
    <>
      <BackToLab href="/three" label="three.js 노트" />
      <LightLesson order={lesson.order} title={lesson.title} />
    </>
  );
}
