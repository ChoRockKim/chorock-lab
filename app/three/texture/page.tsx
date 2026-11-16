import type { Metadata } from "next";
import BackToLab from "@/components/BackToLab";
import { getLesson } from "@/lib/three/lessons";
import TextureLesson from "./TextureLesson";

const lesson = getLesson("texture");

export const metadata: Metadata = {
  title: `${lesson.title} | three.js 노트`,
  description: lesson.summary,
};

export default function Page() {
  return (
    <>
      <BackToLab href="/three" label="three.js 노트" />
      <TextureLesson order={lesson.order} title={lesson.title} />
    </>
  );
}
