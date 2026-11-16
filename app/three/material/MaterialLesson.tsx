"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage, type Stage } from "@/lib/three/createStage";
import styles from "../three.module.css";

type Shape = "box" | "sphere" | "torus" | "cone";
type Kind = "basic" | "normal" | "lambert" | "standard";

type Params = {
  shape: Shape;
  /** 곡면을 몇 조각으로 나눌지 */
  segments: number;
  kind: Kind;
  color: string;
  wireframe: boolean;
  flatShading: boolean;
  roughness: number;
  metalness: number;
};

const DEFAULTS: Params = {
  shape: "sphere",
  segments: 24,
  kind: "standard",
  // 밝은 바탕과 어두운 바탕 모두에서 보이는 중간 밝기의 초록.
  color: "#3a9a66",
  wireframe: false,
  flatShading: false,
  roughness: 0.5,
  metalness: 0,
};

const SHAPES: { id: Shape; label: string }[] = [
  { id: "box", label: "상자" },
  { id: "sphere", label: "구" },
  { id: "torus", label: "도넛" },
  { id: "cone", label: "원뿔" },
];

const KINDS: { id: Kind; label: string; className: string }[] = [
  { id: "basic", label: "Basic", className: "MeshBasicMaterial" },
  { id: "normal", label: "Normal", className: "MeshNormalMaterial" },
  { id: "lambert", label: "Lambert", className: "MeshLambertMaterial" },
  { id: "standard", label: "Standard", className: "MeshStandardMaterial" },
];

// 도형마다 생성자 이름과 인자를 정한다. 화면의 코드 조각도 이 값을 그대로 보여 준다.
// fixed는 크기처럼 고정된 인자, divided는 분할 수에서 나온 인자다.
function describeShape(shape: Shape, n: number) {
  switch (shape) {
    case "box":
      return { name: "BoxGeometry", fixed: [1.6, 1.6, 1.6], divided: [n, n, n] };
    case "sphere":
      return {
        name: "SphereGeometry",
        fixed: [1.1],
        divided: [n, Math.max(2, Math.round(n / 2))],
      };
    case "torus":
      return {
        name: "TorusGeometry",
        fixed: [0.85, 0.35],
        divided: [Math.max(3, Math.round(n / 2)), n],
      };
    case "cone":
      return { name: "ConeGeometry", fixed: [1, 1.8], divided: [n] };
  }
}

function createGeometry(shape: Shape, n: number): THREE.BufferGeometry {
  const { fixed, divided } = describeShape(shape, n);
  const args = [...fixed, ...divided];
  switch (shape) {
    case "box":
      return new THREE.BoxGeometry(...args);
    case "sphere":
      return new THREE.SphereGeometry(...args);
    case "torus":
      return new THREE.TorusGeometry(...args);
    case "cone":
      return new THREE.ConeGeometry(...args);
  }
}

type AnyMaterial =
  | THREE.MeshBasicMaterial
  | THREE.MeshNormalMaterial
  | THREE.MeshLambertMaterial
  | THREE.MeshStandardMaterial;

function createMaterial(kind: Kind): AnyMaterial {
  switch (kind) {
    case "basic":
      return new THREE.MeshBasicMaterial();
    case "normal":
      return new THREE.MeshNormalMaterial();
    case "lambert":
      return new THREE.MeshLambertMaterial();
    case "standard":
      return new THREE.MeshStandardMaterial();
  }
}

type Live = {
  stage: Stage;
  mesh: THREE.Mesh<THREE.BufferGeometry, AnyMaterial>;
  // 지금 장면에 올라가 있는 geometry와 material이 어떤 값으로 만들어졌는지.
  shapeKey: string;
  kind: Kind;
};

const shapeKeyOf = (p: Params) => `${p.shape}:${p.segments}`;

type Props = { order: number; title: string };

export default function MaterialLesson({ order, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<Live | null>(null);
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

    stage.camera.fov = 45;
    stage.camera.position.z = 4.6;
    stage.camera.updateProjectionMatrix();

    // 빛을 받는 재질이 보이도록 조명을 고정해 둔다. 조명은 다음 페이지의 주제다.
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(3, 4, 5);
    stage.scene.add(sun, new THREE.AmbientLight(0xffffff, 0.5));

    const mesh = new THREE.Mesh<THREE.BufferGeometry, AnyMaterial>(
      createGeometry(DEFAULTS.shape, DEFAULTS.segments),
      createMaterial(DEFAULTS.kind),
    );
    mesh.rotation.x = 0.35;
    stage.scene.add(mesh);

    stage.onFrame = (dt) => {
      mesh.rotation.y += dt * 0.5;
    };
    stage.start();

    liveRef.current = {
      stage,
      mesh,
      shapeKey: shapeKeyOf(DEFAULTS),
      kind: DEFAULTS.kind,
    };
    return () => {
      liveRef.current = null;
      stage.dispose();
    };
  }, []);

  // 조절판의 값을 물체에 옮긴다.
  useEffect(() => {
    const live = liveRef.current;
    if (!live) return;
    const { mesh } = live;

    // geometry는 만든 뒤에 분할 수를 바꿀 수 없다. 새로 만들어 갈아 끼우고 이전 것을 버린다.
    const shapeKey = shapeKeyOf(params);
    if (shapeKey !== live.shapeKey) {
      mesh.geometry.dispose();
      mesh.geometry = createGeometry(params.shape, params.segments);
      live.shapeKey = shapeKey;
    }

    if (params.kind !== live.kind) {
      mesh.material.dispose();
      mesh.material = createMaterial(params.kind);
      live.kind = params.kind;
    }

    const material = mesh.material;
    if (!(material instanceof THREE.MeshNormalMaterial)) {
      material.color.set(params.color);
    }
    material.wireframe = params.wireframe;
    if (
      !(material instanceof THREE.MeshBasicMaterial) &&
      material.flatShading !== params.flatShading
    ) {
      material.flatShading = params.flatShading;
      // 셰이더 코드가 달라지는 속성이라 다시 컴파일하라고 알려야 한다.
      material.needsUpdate = true;
    }
    if (material instanceof THREE.MeshStandardMaterial) {
      material.roughness = params.roughness;
      material.metalness = params.metalness;
    }
  }, [params]);

  const set = <K extends keyof Params>(key: K, value: Params[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const v = (text: string | number) => (
    <span className={styles.value}>{text}</span>
  );

  const shape = describeShape(params.shape, params.segments);
  const kind = KINDS.find((item) => item.id === params.kind) ?? KINDS[0];
  const hasColor = params.kind !== "normal";
  const hasFlatShading = params.kind !== "basic";
  const isStandard = params.kind === "standard";

  return (
    <main className={styles.lesson}>
      <article className={styles.prose}>
        <p className={styles.kicker}>{String(order).padStart(2, "0")}</p>
        <h1>{title}</h1>

        <p>
          화면에 보이는 물체는 <code>Mesh</code>이고, Mesh는 두 가지를 묶은
          것입니다. geometry는 꼭짓점과 면으로 이루어진 모양이고, material은
          그 면을 어떻게 칠할지 정합니다. 둘은 서로 독립적이라 같은 모양에
          다른 재질을 입히거나, 한 재질을 여러 모양에 함께 쓸 수 있습니다.
        </p>

        <h2>도형과 분할 수</h2>
        <p>
          three.js에는 <code>BoxGeometry</code>, <code>SphereGeometry</code>{" "}
          같은 기본 도형이 들어 있습니다. 생성자의 앞쪽 인자는 크기이고,
          뒤쪽 인자는 면을 몇 조각으로 나눌지입니다.
        </p>
        <p>
          GPU는 삼각형만 그릴 수 있어서 구처럼 둥근 면도 실제로는 작은
          삼각형을 이어 붙인 것입니다. wireframe을 켜고 분할 수를 3까지
          내려 보세요. 구가 각진 덩어리로 바뀝니다. 분할 수를 올리면 다시
          둥글어지지만 그릴 삼각형도 그만큼 많아집니다.
        </p>
        <p>
          상자는 면이 원래 평평해서 분할 수를 올려도 겉모습이 같습니다.
          꼭짓점을 직접 움직여 면을 구부릴 때가 아니면 1로 충분합니다.
        </p>

        <h2>재질 네 가지</h2>
        <ul>
          <li>
            <code>MeshBasicMaterial</code>: 빛을 계산하지 않고 정한 색으로만
            칠합니다. 명암이 없어 입체가 납작하게 보입니다.
          </li>
          <li>
            <code>MeshNormalMaterial</code>: 면이 향하는 방향을 색으로
            바꿔 보여 줍니다. 색을 고를 수 없는 대신 조명 없이도 굴곡이
            드러나서 모양을 점검할 때 씁니다.
          </li>
          <li>
            <code>MeshLambertMaterial</code>: 빛을 받는 쪽은 밝게, 반대쪽은
            어둡게 칠합니다. 반짝임이 없는 무광 표면이고 계산이 가볍습니다.
          </li>
          <li>
            <code>MeshStandardMaterial</code>: 거칠기와 금속성 두 값으로
            표면을 나타냅니다. 계산은 가장 무겁지만 실제 물체에 가깝게
            보여서 대부분의 장면에서 기본으로 고릅니다.
          </li>
        </ul>

        <h2>빛이 있어야 보이는 재질</h2>
        <p>
          Lambert와 Standard는 받은 빛으로 색을 계산하므로 장면에 조명이
          없으면 검게 나옵니다. 이 페이지에는 한쪽에서 비추는 빛 하나와 약한
          주변광을 미리 넣어 두었습니다. 조명의 종류와 놓는 법은 다음
          페이지에서 다룹니다.
        </p>

        <h2>flatShading</h2>
        <p>
          분할 수가 24인 구는 삼각형 수백 개로 되어 있는데도 매끈해 보입니다.
          면의 경계에서 밝기를 부드럽게 이어 칠하기 때문입니다.
          flatShading을 켜면 면 하나를 한 가지 밝기로 칠해서 삼각형의 경계가
          그대로 드러납니다. 각진 느낌을 일부러 낼 때 씁니다.
        </p>

        <h2>roughness와 metalness</h2>
        <p>
          Standard 재질을 고르면 조절할 수 있습니다. roughness를 낮추면
          표면이 매끄러워져 빛이 한 점에 모여 또렷하게 반사되고, 높이면
          넓게 퍼져 분필처럼 됩니다.
        </p>
        <p>
          metalness를 올리면 금속처럼 주변을 비추는 표면이 됩니다. 다만 이
          장면에는 비칠 주변이 없어서 값을 올릴수록 어두워지기만 합니다.
          금속다운 모습은 환경 맵을 넣어야 나옵니다.
        </p>

        <h2>값을 바꿀 때</h2>
        <p>
          색, roughness, wireframe은 material의 값을 바꾸면 다음 프레임에
          반영됩니다. flatShading은 셰이더 코드 자체가 달라지는 속성이라{" "}
          <code>material.needsUpdate = true</code>를 함께 적어야 합니다.
        </p>
        <p>
          geometry는 만든 뒤에 분할 수를 고칠 수 없습니다. 새로 만들어{" "}
          <code>mesh.geometry</code>에 넣고, 이전 것은{" "}
          <code>dispose()</code>로 버립니다. 꼭짓점 데이터가 GPU 메모리에
          올라가 있어서 변수에서 지우는 것만으로는 사라지지 않습니다. 분할 수
          조절을 움직일 때마다 이 페이지가 하는 일입니다.
        </p>

        <p className={styles.next}>
          다음: <Link href="/three/light">조명과 그림자</Link>. 빛의 종류에
          따라 같은 물체가 어떻게 달라지는지 봅니다.
        </p>
      </article>

      <aside className={styles.panel}>
        <div ref={mountRef} className={styles.canvas}>
          <p className={styles.fallback}>
            이 브라우저에서는 WebGL을 쓸 수 없어 장면을 그리지 못했습니다.
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.row}>
            <span id="material-shape">도형</span>
            <div
              className={styles.buttons}
              role="group"
              aria-labelledby="material-shape"
            >
              {SHAPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.button}
                  aria-pressed={params.shape === item.id}
                  onClick={() => set("shape", item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.control}>
            분할 수
            <input
              type="range"
              min={3}
              max={48}
              step={1}
              value={params.segments}
              onChange={(e) => set("segments", Number(e.target.value))}
            />
            <output>{params.segments}</output>
          </label>

          <div className={styles.row}>
            <span id="material-kind">재질</span>
            <div
              className={styles.buttons}
              role="group"
              aria-labelledby="material-kind"
            >
              {KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.button}
                  aria-pressed={params.kind === item.id}
                  onClick={() => set("kind", item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.control}>
            색
            <input
              type="color"
              value={params.color}
              disabled={!hasColor}
              onChange={(e) => set("color", e.target.value)}
            />
            <output>{hasColor ? params.color : "없음"}</output>
          </label>
          {isStandard && (
            <>
              <label className={styles.control}>
                roughness
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={params.roughness}
                  onChange={(e) => set("roughness", Number(e.target.value))}
                />
                <output>{params.roughness.toFixed(2)}</output>
              </label>
              <label className={styles.control}>
                metalness
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={params.metalness}
                  onChange={(e) => set("metalness", Number(e.target.value))}
                />
                <output>{params.metalness.toFixed(2)}</output>
              </label>
            </>
          )}

          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.button}
              aria-pressed={params.wireframe}
              onClick={() => set("wireframe", !params.wireframe)}
            >
              wireframe
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={hasFlatShading && params.flatShading}
              disabled={!hasFlatShading}
              onClick={() => set("flatShading", !params.flatShading)}
            >
              flatShading
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setParams(DEFAULTS)}
            >
              처음 값으로
            </button>
          </div>
          {!hasFlatShading && (
            <p className={styles.note}>
              Basic 재질은 명암을 계산하지 않아 flatShading을 켜도 달라지는
              것이 없습니다.
            </p>
          )}
        </div>

        <pre className={styles.code}>
          <code>
            {"const geometry = new THREE."}
            {v(shape.name)}
            {`(${shape.fixed.join(", ")}, `}
            {v(shape.divided.join(", "))}
            {");\n"}
            {"const material = new THREE."}
            {v(kind.className)}
            {"({\n"}
            {hasColor && (
              <>
                {"  color: "}
                {v(`"${params.color}"`)}
                {",\n"}
              </>
            )}
            {isStandard && (
              <>
                {"  roughness: "}
                {v(params.roughness.toFixed(2))}
                {",\n"}
                {"  metalness: "}
                {v(params.metalness.toFixed(2))}
                {",\n"}
              </>
            )}
            {hasFlatShading && (
              <>
                {"  flatShading: "}
                {v(String(params.flatShading))}
                {",\n"}
              </>
            )}
            {"  wireframe: "}
            {v(String(params.wireframe))}
            {",\n"}
            {"});\n\n"}
            {"const mesh = new THREE.Mesh(geometry, material);\n"}
            {"scene.add(mesh);\n\n"}
            {"// 도형이나 분할 수를 바꿀 때\n"}
            {"mesh.geometry.dispose();\n"}
            {"mesh.geometry = new THREE."}
            {shape.name}
            {"(...);"}
          </code>
        </pre>
      </aside>
    </main>
  );
}
