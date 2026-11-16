// 실험 목록의 단일 출처. 여기에 한 줄을 추가하면 기본 주소(/)의 목록에 나타난다.
// slug는 app/ 아래 폴더 이름과 같아야 한다: app/<slug>/page.tsx → lab.chorock.page/<slug>
export type Experiment = {
  slug: string;
  title: string;
  summary: string;
  /** YYYY-MM-DD. 목록은 이 값의 내림차순으로 정렬된다. */
  date: string;
  tags: string[];
};

export const experiments: Experiment[] = [
  {
    slug: "spring-ball",
    title: "스프링 공",
    summary: "공을 끌었다 놓으면 스프링 물리로 제자리에 돌아옵니다.",
    date: "2026-11-16",
    tags: ["물리", "포인터 이벤트"],
  },
];

export function listExperiments(): Experiment[] {
  // 날짜가 같은 형식의 문자열이라 코드 단위 비교로 충분하다.
  return [...experiments].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

export function getExperiment(slug: string): Experiment {
  const found = experiments.find((e) => e.slug === slug);
  if (!found) throw new Error(`lib/experiments.ts에 "${slug}" 항목이 없습니다.`);
  return found;
}
