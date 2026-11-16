"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage, type Stage } from "@/lib/three/createStage";
import styles from "../three.module.css";

type Projection = "perspective" | "orthographic";

type Params = {
  projection: Projection;
  /** 원근 카메라의 세로 시야각(도) */
  fov: number;
  /** 직교 카메라가 화면에 담는 세로 길이 */
  size: number;
  /** 카메라가 가운데를 중심으로 돌아간 각도(도) */
  azimuth: number;
  height: number;
  /** 가운데에서 카메라까지의 수평 거리 */
  distance: number;
  near: number;
  far: number;
};

const DEFAULTS: Params = {
  projection: "perspective",
  fov: 50,
  size: 9,
  azimuth: 30,
  height: 4,
  distance: 11,
  near: 0.1,
  far: 40,
};

// 카메라가 바라보는 점. 바닥에 놓인 상자의 가운데 높이다.
const TARGET = new THREE.Vector3(0, 0.5, 0);
const DEPTHS = [4, 2, 0, -2, -4];

type Live = {
  stage: Stage;
  perspective: THREE.PerspectiveCamera;
  orthographic: THREE.OrthographicCamera;
};

function cameraPosition(p: Params): [number, number, number] {
  const angle = THREE.MathUtils.degToRad(p.azimuth);
  return [Math.sin(angle) * p.distance, p.height, Math.cos(angle) * p.distance];
}

// 조절판의 값을 두 카메라에 옮기고, 그릴 때 쓸 카메라를 고른다.
function applyParams(live: Live, p: Params) {
  const { stage, perspective, orthographic } = live;
  const aspect = perspective.aspect;

  for (const camera of [perspective, orthographic]) {
    camera.position.set(...cameraPosition(p));
    camera.lookAt(TARGET);
    camera.near = p.near;
    camera.far = p.far;
  }

  perspective.fov = p.fov;
  perspective.updateProjectionMatrix();

  orthographic.top = p.size / 2;
  orthographic.bottom = -p.size / 2;
  orthographic.right = (p.size * aspect) / 2;
  orthographic.left = -(p.size * aspect) / 2;
  orthographic.updateProjectionMatrix();

  stage.view = p.projection === "perspective" ? perspective : orthographic;
}

type Props = { order: number; title: string };

export default function CameraLesson({ order, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<Live | null>(null);
  // 캔버스 크기가 바뀔 때 무대가 읽는 최신 값.
  const paramsRef = useRef(DEFAULTS);
  const [params, setParams] = useState(DEFAULTS);

  // 무대를 한 번 만들고, 페이지를 떠날 때 정리한다.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let stage: Stage;
    try {
      stage = createStage(mount);
    } catch {
      // WebGL을 쓸 수 없는 환경. 캔버스가 없으므로 안내 문구가 그대로 보인다.
      return;
    }

    // 캔버스가 투명하므로 선과 면의 색을 페이지의 색에서 가져온다.
    const css = getComputedStyle(mount);
    const color = (name: string) =>
      new THREE.Color(css.getPropertyValue(name).trim());
    const accent = color("--accent");
    const card = color("--card");

    const grid = new THREE.GridHelper(12, 12, color("--muted"), color("--muted"));
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    stage.scene.add(grid);

    // 같은 크기의 상자를 두 줄로 세운다. 크기가 같아야 투영의 차이가 보인다.
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: color("--fg") });
    DEPTHS.forEach((z, index) => {
      const material = new THREE.MeshBasicMaterial({
        // 줄의 앞뒤를 구분할 수 있게 뒤로 갈수록 옅게 칠한다.
        color: accent.clone().lerp(card, (index / (DEPTHS.length - 1)) * 0.65),
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      for (const x of [-1.5, 1.5]) {
        const box = new THREE.Mesh(geometry, material);
        box.position.set(x, 0.5, z);
        box.add(new THREE.LineSegments(edges, edgeMaterial));
        stage.scene.add(box);
      }
    });

    let frames = 0;
    stage.onRender = () => {
      frames += 1;
      if (framesRef.current) framesRef.current.textContent = String(frames);
    };

    const live: Live = {
      stage,
      perspective: stage.camera,
      orthographic: new THREE.OrthographicCamera(),
    };
    // 직교 카메라의 좌우 범위는 화면 비율에 맞춰 직접 다시 계산해야 한다.
    stage.onResize = () => applyParams(live, paramsRef.current);

    liveRef.current = live;
    return () => {
      liveRef.current = null;
      stage.dispose();
    };
  }, []);

  // 움직이는 것이 없는 장면이라 루프를 돌리지 않고, 값이 바뀔 때만 한 번 그린다.
  useEffect(() => {
    paramsRef.current = params;
    const live = liveRef.current;
    if (!live) return;
    applyParams(live, params);
    live.stage.renderOnce();
  }, [params]);

  const set = <K extends keyof Params>(key: K, value: Params[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const v = (text: string | number) => (
    <span className={styles.value}>{text}</span>
  );

  const isPerspective = params.projection === "perspective";
  const [x, y, z] = cameraPosition(params).map((n) => n.toFixed(1));

  return (
    <main className={styles.lesson}>
      <article className={styles.prose}>
        <p className={styles.kicker}>{String(order).padStart(2, "0")}</p>
        <h1>{title}</h1>

        <p>
          카메라가 정하는 것은 두 가지입니다. 하나는 어디에 서서 어느 쪽을
          보는지이고, 다른 하나는 그렇게 본 3차원 공간을 평평한 화면에 어떤
          규칙으로 옮기는지입니다. 뒤쪽 규칙을 투영이라고 부릅니다.
        </p>
        <p>
          장면에는 크기가 같은 상자 열 개가 두 줄로 서 있습니다. 조절판을
          움직이면서 뒤쪽 상자가 어떻게 달라지는지 보면 됩니다.
        </p>

        <h2>위치와 방향</h2>
        <p>
          카메라도 물체처럼 <code>position</code>으로 옮깁니다. 방향을 따로
          정하지 않으면 카메라는 -z 쪽을 봅니다. 특정한 점을 보게 하려면{" "}
          <code>camera.lookAt()</code>에 그 점의 좌표를 넘깁니다.
        </p>
        <p>
          <code>lookAt</code>은 부른 순간에 방향을 한 번 맞출 뿐, 그 점을 계속
          따라가지는 않습니다. 위치를 옮겼다면 다시 불러야 합니다. 방위각과
          높이, 거리 조절은 가운데를 중심으로 한 원 위의 좌표를 계산해{" "}
          <code>position</code>에 넣고 <code>lookAt</code>을 다시 부르는
          일입니다.
        </p>

        <h2>원근 투영</h2>
        <p>
          <code>PerspectiveCamera</code>는 사람 눈이나 사진기처럼 먼 것을 작게
          그립니다. 두 줄의 상자는 뒤로 갈수록 작아지고 줄 사이도 좁아집니다.
        </p>
        <p>
          첫 번째 인자인 시야각은 화면의 위 끝과 아래 끝이 이루는 각도입니다.
          넓히면 더 많은 공간이 화면에 들어오는 만큼 물체는 작아집니다.
          시야각을 20°로 좁히고 거리를 늘리면 앞뒤 상자의 크기 차이가 줄어
          망원 렌즈로 찍은 사진처럼 깊이가 눌려 보입니다.
        </p>

        <h2>직교 투영</h2>
        <p>
          <code>OrthographicCamera</code>는 거리와 상관없이 같은 크기로
          그립니다. 투영을 직교로 바꾸면 뒤쪽 상자가 앞쪽과 같은 크기가 되고,
          두 줄은 끝까지 나란합니다. 이 상태에서 거리를 움직여도 상자의 크기는
          그대로입니다.
        </p>
        <p>
          크기를 정하는 것은 시야각이 아니라 화면에 담을 범위입니다. 생성자에
          왼쪽, 오른쪽, 위, 아래 경계를 직접 넘기고, 범위를 좁히면 확대됩니다.
          도면이나 2D 게임, 쿼터뷰 화면처럼 길이가 왜곡되면 안 되는 곳에
          씁니다.
        </p>

        <h2>near와 far</h2>
        <p>
          카메라는 near보다 가깝거나 far보다 먼 것을 그리지 않습니다. far를
          줄이면 뒤쪽 상자부터 잘려 나가고, near를 키우면 앞쪽 상자가
          잘립니다.
        </p>
        <p>
          그렇다고 범위를 넉넉하게만 잡으면 곤란합니다. 깊이를 기록하는
          정밀도에는 한계가 있어서, 범위가 넓을수록 가까이 붙은 두 면의 앞뒤를
          가리지 못하고 깜빡이는 현상이 생깁니다. 특히 near를 0에 가깝게 두면
          정밀도가 크게 떨어지므로 장면에 맞는 값을 고르는 편이 좋습니다.
        </p>

        <h2>값을 바꾼 뒤에 할 일</h2>
        <p>
          시야각, near, far, 직교 카메라의 경계는 바꾸기만 해서는 화면에
          반영되지 않습니다. 카메라가 이 값들로 미리 계산해 둔 행렬을 쓰기
          때문에 <code>camera.updateProjectionMatrix()</code>를 불러 다시
          계산시켜야 합니다. 위치와 방향은 그릴 때마다 새로 읽으므로 따로 할
          일이 없습니다.
        </p>
        <p>
          캔버스 크기가 바뀔 때도 마찬가지입니다. 원근 카메라는{" "}
          <code>aspect</code>를, 직교 카메라는 좌우 경계를 새 비율에 맞춘 뒤
          행렬을 다시 계산합니다. 빠뜨리면 화면이 가로나 세로로 늘어납니다.
        </p>

        <h2>루프 없이 그리기</h2>
        <p>
          이 장면에는 스스로 움직이는 것이 없어서 렌더 루프를 돌리지
          않았습니다. 조절판의 값이 바뀔 때만{" "}
          <code>renderer.render()</code>를 한 번 부릅니다. 장면 왼쪽 아래의
          숫자는 가만히 두면 늘지 않습니다.
        </p>

        <p className={styles.next}>
          다음: <Link href="/three/material">도형과 재질</Link>. geometry와
          material을 조합해 물체의 모양과 표면을 정합니다.
        </p>
      </article>

      <aside className={styles.panel}>
        <div ref={mountRef} className={styles.canvas}>
          <p className={styles.fallback}>
            이 브라우저에서는 WebGL을 쓸 수 없어 장면을 그리지 못했습니다.
          </p>
          <span className={styles.frames}>
            그린 프레임 <span ref={framesRef}>0</span>
          </span>
        </div>

        <div className={styles.controls}>
          <div className={styles.buttons} role="group" aria-label="투영 방식">
            <button
              type="button"
              className={styles.button}
              aria-pressed={isPerspective}
              onClick={() => set("projection", "perspective")}
            >
              원근
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={!isPerspective}
              onClick={() => set("projection", "orthographic")}
            >
              직교
            </button>
          </div>

          {isPerspective ? (
            <label className={styles.control}>
              시야각
              <input
                type="range"
                min={10}
                max={120}
                step={1}
                value={params.fov}
                onChange={(e) => set("fov", Number(e.target.value))}
              />
              <output>{params.fov}°</output>
            </label>
          ) : (
            <label className={styles.control}>
              담는 높이
              <input
                type="range"
                min={2}
                max={20}
                step={0.1}
                value={params.size}
                onChange={(e) => set("size", Number(e.target.value))}
              />
              <output>{params.size.toFixed(1)}</output>
            </label>
          )}
          <label className={styles.control}>
            방위각
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={params.azimuth}
              onChange={(e) => set("azimuth", Number(e.target.value))}
            />
            <output>{params.azimuth}°</output>
          </label>
          <label className={styles.control}>
            높이
            <input
              type="range"
              min={0.5}
              max={12}
              step={0.1}
              value={params.height}
              onChange={(e) => set("height", Number(e.target.value))}
            />
            <output>{params.height.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            거리
            <input
              type="range"
              min={2}
              max={20}
              step={0.1}
              value={params.distance}
              onChange={(e) => set("distance", Number(e.target.value))}
            />
            <output>{params.distance.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            near
            <input
              type="range"
              min={0.1}
              max={8}
              step={0.1}
              value={params.near}
              onChange={(e) => set("near", Number(e.target.value))}
            />
            <output>{params.near.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            far
            <input
              type="range"
              min={9}
              max={40}
              step={0.5}
              value={params.far}
              onChange={(e) => set("far", Number(e.target.value))}
            />
            <output>{params.far.toFixed(1)}</output>
          </label>

          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.button}
              onClick={() => setParams(DEFAULTS)}
            >
              처음 값으로
            </button>
          </div>
        </div>

        <pre className={styles.code}>
          <code>
            {isPerspective ? (
              <>
                {"const camera = new THREE."}
                {v("PerspectiveCamera")}
                {"(\n  "}
                {v(params.fov)}
                {", width / height, "}
                {v(params.near.toFixed(1))}
                {", "}
                {v(params.far.toFixed(1))}
                {",\n);\n"}
              </>
            ) : (
              <>
                {"const h = "}
                {v(params.size.toFixed(1))}
                {"; // 화면에 담는 세로 길이\n"}
                {"const w = h * (width / height);\n"}
                {"const camera = new THREE."}
                {v("OrthographicCamera")}
                {"(\n  -w / 2, w / 2, h / 2, -h / 2, "}
                {v(params.near.toFixed(1))}
                {", "}
                {v(params.far.toFixed(1))}
                {",\n);\n"}
              </>
            )}
            {"\ncamera.position.set("}
            {v(x)}
            {", "}
            {v(y)}
            {", "}
            {v(z)}
            {");\n"}
            {"camera.lookAt(0, 0.5, 0);\n\n"}
            {"// 시야각, near, far, 경계를 바꿨다면\n"}
            {"camera.updateProjectionMatrix();\n\n"}
            {"renderer.render(scene, camera);"}
          </code>
        </pre>
      </aside>
    </main>
  );
}
