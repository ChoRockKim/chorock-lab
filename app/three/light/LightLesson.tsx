"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage, type Stage } from "@/lib/three/createStage";
import styles from "../three.module.css";

type Kind = "directional" | "point" | "spot";

type Params = {
  kind: Kind;
  /** 주변광 세기 */
  ambient: number;
  /** 평행광 세기 */
  intensity: number;
  /** 점광과 스포트라이트의 세기(칸델라) */
  candela: number;
  /** 조명이 가운데를 중심으로 돌아간 각도(도) */
  azimuth: number;
  height: number;
  color: string;
  /** 그림자를 켜는 세 곳 */
  onRenderer: boolean;
  onLight: boolean;
  onObjects: boolean;
  mapSize: number;
};

const DEFAULTS: Params = {
  kind: "directional",
  ambient: 0.4,
  intensity: 2.5,
  candela: 80,
  azimuth: -40,
  height: 4,
  color: "#ffffff",
  onRenderer: true,
  onLight: true,
  onObjects: true,
  mapSize: 1024,
};

const KINDS: { kind: Kind; label: string; className: string }[] = [
  { kind: "directional", label: "평행광", className: "DirectionalLight" },
  { kind: "point", label: "점광", className: "PointLight" },
  { kind: "spot", label: "스포트라이트", className: "SpotLight" },
];
const MAP_SIZES = [256, 1024, 2048];

// 조명에서 가운데까지의 수평 거리.
const RADIUS = 4;
const SPOT_ANGLE = Math.PI / 5;
const SPOT_PENUMBRA = 0.4;

type MainLight = THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;

type Live = {
  stage: Stage;
  ambient: THREE.AmbientLight;
  lights: Record<Kind, MainLight>;
  /** 조명이 어디 있는지 보여 주는 작은 구와, 가운데로 이은 선 */
  marker: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  ray: THREE.Line;
  objects: THREE.Mesh[];
  floor: THREE.Mesh;
  /** 직전에 적용한 그림자 설정. 달라졌을 때만 재질을 다시 컴파일한다. */
  shadowKey: string;
};

function lightPosition(p: Params): [number, number, number] {
  const angle = THREE.MathUtils.degToRad(p.azimuth);
  return [Math.sin(angle) * RADIUS, p.height, Math.cos(angle) * RADIUS];
}

function applyParams(live: Live, p: Params) {
  const { stage, lights, marker, ray } = live;
  const position = lightPosition(p);

  live.ambient.intensity = p.ambient;

  for (const kind of Object.keys(lights) as Kind[]) {
    const light = lights[kind];
    light.visible = kind === p.kind;
    light.position.set(...position);
    light.color.set(p.color);
    light.intensity = kind === "directional" ? p.intensity : p.candela;
    light.castShadow = p.onLight;
    if (light.shadow.mapSize.x !== p.mapSize) {
      light.shadow.mapSize.set(p.mapSize, p.mapSize);
      // 이미 만들어진 그림자 맵은 크기가 고정이라, 버리고 다음 프레임에 새로 만들게 한다.
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
  }

  marker.position.set(...position);
  marker.material.color.set(p.color);
  ray.geometry.setFromPoints([new THREE.Vector3(...position), new THREE.Vector3()]);

  stage.renderer.shadowMap.enabled = p.onRenderer;
  for (const object of live.objects) object.castShadow = p.onObjects;
  live.floor.receiveShadow = p.onObjects;

  // 그림자를 쓸지는 셰이더를 만들 때 정해진다. 설정이 바뀌면 재질을 다시 컴파일시킨다.
  const shadowKey = `${p.onRenderer}/${p.onLight}/${p.onObjects}`;
  if (shadowKey !== live.shadowKey) {
    live.shadowKey = shadowKey;
    for (const mesh of [...live.objects, live.floor]) {
      (mesh.material as THREE.Material).needsUpdate = true;
    }
  }
}

type Props = { order: number; title: string };

export default function LightLesson({ order, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);
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
    stage.camera.position.set(6, 5.5, 9);
    stage.camera.lookAt(0, 0.4, 0);
    stage.camera.updateProjectionMatrix();

    // 캔버스가 투명하므로 물체와 바닥의 색을 페이지의 색에서 가져온다.
    const css = getComputedStyle(mount);
    const color = (name: string) =>
      new THREE.Color(css.getPropertyValue(name).trim());
    const accent = color("--accent");
    const card = color("--card");
    const muted = color("--muted");

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 64),
      new THREE.MeshStandardMaterial({
        color: card.clone().lerp(muted, 0.35),
        roughness: 0.9,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    stage.scene.add(floor);

    // 빛에 반응하는 재질. 빛이 하나도 없으면 검게 그려진다.
    const solid = (tone: number) =>
      new THREE.MeshStandardMaterial({
        color: accent.clone().lerp(card, tone),
        roughness: 0.55,
      });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), solid(0));
    box.position.set(-1.9, 0.6, 0.5);
    box.rotation.y = 0.5;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 48, 24),
      solid(0.25),
    );
    sphere.position.set(0, 0.75, -0.7);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 48), solid(0.5));
    cone.position.set(1.9, 0.8, 0.6);
    const objects = [box, sphere, cone];
    stage.scene.add(...objects);

    const ambient = new THREE.AmbientLight(0xffffff, DEFAULTS.ambient);
    stage.scene.add(ambient);

    const directional = new THREE.DirectionalLight();
    // 평행광의 그림자는 이 상자 모양 범위 안에서만 생긴다. 장면에 꼭 맞게 좁힌다.
    Object.assign(directional.shadow.camera, {
      left: -6,
      right: 6,
      top: 6,
      bottom: -6,
      near: 0.5,
      far: 20,
    });
    const point = new THREE.PointLight();
    const spot = new THREE.SpotLight();
    spot.angle = SPOT_ANGLE;
    spot.penumbra = SPOT_PENUMBRA;
    const lights: Record<Kind, MainLight> = { directional, point, spot };
    for (const light of Object.values(lights)) {
      // 면이 자기 자신의 그림자에 걸려 줄무늬가 생기는 것을 막는다.
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.03;
      // 처음 적용할 때 조절판의 해상도로 맞춰지도록 비워 둔다.
      light.shadow.mapSize.set(0, 0);
      stage.scene.add(light);
    }

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 8),
      new THREE.MeshBasicMaterial(),
    );
    // 흰 조명이 밝은 배경에 묻히지 않도록 테두리를 두른다.
    marker.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 8),
        new THREE.MeshBasicMaterial({ color: color("--fg"), side: THREE.BackSide }),
      ),
    );
    const ray = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: muted }),
    );
    stage.scene.add(marker, ray);

    let frames = 0;
    stage.onRender = () => {
      frames += 1;
      if (framesRef.current) framesRef.current.textContent = String(frames);
    };

    liveRef.current = {
      stage,
      ambient,
      lights,
      marker,
      ray,
      objects,
      floor,
      shadowKey: "",
    };
    return () => {
      liveRef.current = null;
      // 그림자 맵은 조명이 따로 들고 있어서 무대의 정리에 포함되지 않는다.
      for (const light of Object.values(lights)) light.dispose();
      stage.dispose();
    };
  }, []);

  // 움직이는 것이 없는 장면이라 루프를 돌리지 않고, 값이 바뀔 때만 한 번 그린다.
  useEffect(() => {
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

  const isDirectional = params.kind === "directional";
  const className = KINDS.find((item) => item.kind === params.kind)!.className;
  const [x, y, z] = lightPosition(params).map((n) => n.toFixed(1));
  const shadowVisible = params.onRenderer && params.onLight && params.onObjects;

  return (
    <main className={styles.lesson}>
      <article className={styles.prose}>
        <p className={styles.kicker}>{String(order).padStart(2, "0")}</p>
        <h1>{title}</h1>

        <p>
          앞에서 쓴 <code>MeshBasicMaterial</code>은 빛을 계산하지 않아서 조명이
          없어도 제 색으로 보였습니다. 이 장면의 물체는{" "}
          <code>MeshStandardMaterial</code>로 만들었고, 이 재질은 받은 빛만큼만
          밝아집니다. 주변광과 조명의 세기를 둘 다 0으로 내리면 물체가 검게
          변합니다.
        </p>
        <p>
          장면 위에 떠 있는 작은 구가 조명의 위치이고, 구에서 뻗은 선은 장면의
          가운데를 가리킵니다.
        </p>

        <h2>주변광</h2>
        <p>
          <code>AmbientLight</code>는 방향이 없는 빛입니다. 모든 면을 같은
          밝기로 비추기 때문에 주변광만 켜면 면과 면의 경계가 사라져 물체가
          납작해 보입니다. 그림자도 만들지 못합니다. 보통은 다른 조명이 닿지
          않는 쪽이 완전히 검어지지 않도록 조금만 섞습니다.
        </p>

        <h2>평행광</h2>
        <p>
          <code>DirectionalLight</code>는 햇빛처럼 장면 전체를 같은 방향으로
          비춥니다. <code>position</code>은 빛이 나오는 자리가 아니라 방향을
          정하는 값입니다. 빛은 그 위치에서 목표점(기본값은 원점)을 향하는
          방향으로 어디에나 똑같이 들어옵니다. 조명을 높이 올려도 밝기는
          그대로이고 그림자의 각도만 달라집니다.
        </p>

        <h2>점광과 스포트라이트</h2>
        <p>
          <code>PointLight</code>는 전구처럼 한 점에서 사방으로 퍼집니다.{" "}
          <code>SpotLight</code>는 같은 빛을 원뿔 안으로 모은 것이고, 원뿔의
          너비는 <code>angle</code>로, 가장자리가 흐려지는 정도는{" "}
          <code>penumbra</code>로 정합니다.
        </p>
        <p>
          두 조명은 실제 빛처럼 거리의 제곱에 반비례해 어두워집니다. 종류를
          점광으로 바꾸고 높이를 올려 보면 평행광과 달리 장면 전체가
          어두워집니다. 세기의 단위도 다릅니다. 칸델라로 재기 때문에 평행광에서
          쓰던 1이나 2 같은 값을 넣으면 거의 보이지 않고, 몇 미터 떨어진 물체를
          비추려면 수십에서 수백은 되어야 합니다. three.js r155보다 오래된
          예제의 값을 그대로 옮기면 화면이 어둡게 나오는 까닭이 여기에
          있습니다.
        </p>

        <h2>그림자는 세 곳에서 켠다</h2>
        <p>
          그림자는 기본으로 꺼져 있고, 다음 세 곳을 모두 켜야 나타납니다.
          조절판에서 하나만 꺼도 그림자가 사라집니다.
        </p>
        <ul>
          <li>
            렌더러: <code>renderer.shadowMap.enabled</code>
          </li>
          <li>
            조명: <code>light.castShadow</code>
          </li>
          <li>
            물체: 그림자를 만드는 쪽에 <code>castShadow</code>, 그림자가 맺히는
            쪽에 <code>receiveShadow</code>
          </li>
        </ul>
        <p>
          켜는 곳이 나뉜 것은 그림자가 비싸기 때문입니다. three.js는 조명의
          자리에서 장면을 한 번 더 그려 조명에서 각 지점까지의 깊이를 그림자
          맵이라는 이미지에 적어 둡니다. 화면을 그릴 때는 이 깊이와 비교해
          조명에서 가려진 지점을 어둡게 칠합니다. 그림자를 내는 조명이 하나
          늘 때마다 장면을 한 번씩 더 그리는 셈이고, 사방을 비추는 점광은 여섯
          방향을 그립니다. 그래서 필요한 조명과 물체에만 켭니다.
        </p>

        <h2>그림자 맵의 해상도</h2>
        <p>
          그림자의 선명함은 <code>light.shadow.mapSize</code>가 정합니다.
          기본값은 512이고, 256으로 낮추면 가장자리가 계단처럼 깨집니다. 값을
          두 배로 올리면 픽셀 수는 네 배가 되므로 눈에 거슬리지 않는 가장
          작은 값을 고릅니다.
        </p>
        <p>
          평행광은 <code>light.shadow.camera</code>가 가리키는 상자 모양 범위
          안에서만 그림자를 만듭니다. 범위를 넓게 잡으면 같은 해상도가 넓은
          면적에 퍼져 그림자가 흐려집니다. 장면을 겨우 덮을 만큼 좁히는 것이
          해상도를 올리는 것보다 먼저입니다.
        </p>

        <p className={styles.next}>
          다음: <Link href="/three/texture">텍스처</Link>. 구에 이미지를 입혀
          지구본을 완성합니다.
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
          <div className={styles.buttons} role="group" aria-label="조명 종류">
            {KINDS.map((item) => (
              <button
                key={item.kind}
                type="button"
                className={styles.button}
                aria-pressed={params.kind === item.kind}
                onClick={() => set("kind", item.kind)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {isDirectional ? (
            <label className={styles.control}>
              세기
              <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={params.intensity}
                onChange={(e) => set("intensity", Number(e.target.value))}
              />
              <output>{params.intensity.toFixed(1)}</output>
            </label>
          ) : (
            <label className={styles.control}>
              세기(cd)
              <input
                type="range"
                min={0}
                max={300}
                step={1}
                value={params.candela}
                onChange={(e) => set("candela", Number(e.target.value))}
              />
              <output>{params.candela}</output>
            </label>
          )}
          <label className={styles.control}>
            방향
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
              min={1}
              max={9}
              step={0.1}
              value={params.height}
              onChange={(e) => set("height", Number(e.target.value))}
            />
            <output>{params.height.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            조명 색
            <input
              type="color"
              value={params.color}
              onChange={(e) => set("color", e.target.value)}
            />
            <output />
          </label>
          <label className={styles.control}>
            주변광
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={params.ambient}
              onChange={(e) => set("ambient", Number(e.target.value))}
            />
            <output>{params.ambient.toFixed(2)}</output>
          </label>

          <div className={styles.row} role="group" aria-label="그림자를 켜는 곳">
            <span>그림자</span>
            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.button}
                aria-pressed={params.onRenderer}
                onClick={() => set("onRenderer", !params.onRenderer)}
              >
                렌더러
              </button>
              <button
                type="button"
                className={styles.button}
                aria-pressed={params.onLight}
                onClick={() => set("onLight", !params.onLight)}
              >
                조명
              </button>
              <button
                type="button"
                className={styles.button}
                aria-pressed={params.onObjects}
                onClick={() => set("onObjects", !params.onObjects)}
              >
                물체
              </button>
            </div>
          </div>
          <div className={styles.row} role="group" aria-label="그림자 맵 해상도">
            <span>해상도</span>
            <div className={styles.buttons}>
              {MAP_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={styles.button}
                  aria-pressed={params.mapSize === size}
                  onClick={() => set("mapSize", size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.button}
              onClick={() => setParams(DEFAULTS)}
            >
              처음 값으로
            </button>
          </div>
          {!shadowVisible && (
            <p className={styles.note}>
              세 곳 중 꺼진 곳이 있어 그림자가 그려지지 않습니다.
            </p>
          )}
        </div>

        <pre className={styles.code}>
          <code>
            {"renderer.shadowMap.enabled = "}
            {v(String(params.onRenderer))}
            {";\n\n"}
            {"scene.add(new THREE.AmbientLight(0xffffff, "}
            {v(params.ambient.toFixed(2))}
            {"));\n\n"}
            {"const light = new THREE."}
            {v(className)}
            {"(\n  "}
            {v(`"${params.color}"`)}
            {", "}
            {isDirectional ? (
              v(params.intensity.toFixed(1))
            ) : (
              <>
                {v(params.candela)}
                {params.kind === "spot" && ", 0, Math.PI / 5, 0.4"}
              </>
            )}
            {",\n);"}
            {isDirectional ? "\n" : " // 세기는 칸델라\n"}
            {"light.position.set("}
            {v(x)}
            {", "}
            {v(y)}
            {", "}
            {v(z)}
            {");\n"}
            {"light.castShadow = "}
            {v(String(params.onLight))}
            {";\n"}
            {"light.shadow.mapSize.set("}
            {v(params.mapSize)}
            {", "}
            {v(params.mapSize)}
            {");\n"}
            {"scene.add(light);\n\n"}
            {"box.castShadow = "}
            {v(String(params.onObjects))}
            {";\n"}
            {"floor.receiveShadow = "}
            {v(String(params.onObjects))}
            {";"}
          </code>
        </pre>
      </aside>
    </main>
  );
}
