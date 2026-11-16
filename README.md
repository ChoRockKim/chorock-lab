# chorock lab

작은 실험을 모아 두는 사이트입니다. 주소는 https://lab.chorock.page 이고, 글은 https://chorock.page 에 씁니다.

## 실행

```bash
npm install
npm run dev
npm run build   # 타입 검사 포함
npm run lint
```

## 실험 추가하기

1. `app/<slug>/page.tsx`를 만든다. 폴더 이름이 주소가 된다(`lab.chorock.page/<slug>`). slug는 영문 소문자와 하이픈만 쓴다.
2. `lib/experiments.ts`의 `experiments` 배열에 같은 slug로 한 줄을 추가한다. 기본 주소의 목록은 이 배열로 그린다.
3. 스타일은 그 폴더 안의 CSS 모듈에 둔다. `app/globals.css`에는 모든 실험이 공유하는 바탕만 있다.

루트 레이아웃은 비어 있으므로 실험마다 `layout.tsx`를 따로 둘 수 있다. 목록으로 돌아가는 링크가 필요하면 `components/BackToLab.tsx`를 쓴다.

`app/spring-ball`이 예시다.

## Next가 아닌 스택으로 만든 실험

별도 Vercel 프로젝트로 배포한 뒤 `next.config.ts`의 `rewrites`로 `/<slug>/:path*`를 그 배포 주소로 넘긴다. 주소는 그대로 `lab.chorock.page/<slug>`가 된다.
