// three.js 노트의 목차. ready가 true인 항목만 링크가 된다.
// slug는 app/three/ 아래 폴더 이름과 같아야 한다: app/three/<slug>/page.tsx
export type Lesson = {
  slug: string;
  title: string;
  summary: string;
  ready: boolean;
};

export const lessons: Lesson[] = [
  {
    slug: "scene",
    title: "장면과 렌더 루프",
    summary: "장면, 카메라, 렌더러를 만들고 매 프레임 다시 그립니다.",
    ready: true,
  },
  {
    slug: "camera",
    title: "카메라",
    summary: "시야각과 위치, 원근과 직교 투영의 차이를 봅니다.",
    ready: true,
  },
  {
    slug: "material",
    title: "도형과 재질",
    summary: "geometry와 material을 조합해 물체의 모양과 표면을 정합니다.",
    ready: true,
  },
  {
    slug: "light",
    title: "조명과 그림자",
    summary: "빛의 종류에 따라 같은 물체가 어떻게 달라지는지 봅니다.",
    ready: true,
  },
  {
    slug: "texture",
    title: "텍스처",
    summary: "구에 이미지를 입혀 지구본을 완성합니다.",
    ready: true,
  },
];

export function getLesson(slug: string): Lesson & { order: number } {
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  if (index === -1) throw new Error(`lib/three/lessons.ts에 "${slug}" 항목이 없습니다.`);
  return { ...lessons[index], order: index + 1 };
}
