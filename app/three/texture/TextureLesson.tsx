"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage, type Stage } from "@/lib/three/createStage";
import styles from "../three.module.css";

const IMAGE_URL = "/three/earth.jpg";

type Params = {
  /** 재질에 이미지를 입힐지 */
  textured: boolean;
  /** 텍스처의 색 공간을 sRGB로 알려 줄지 */
  srgb: boolean;
  /** 자전 속도(라디안/초) */
  speed: number;
  /** 자전축 기울기(도) */
  tilt: number;
  /** 빛이 들어오는 방향(도). 0이면 카메라 쪽에서 비춘다. */
  light: number;
  /** 구의 가로 분할 수. 세로는 이 값의 절반이다. */
  segments: number;
};

const DEFAULTS: Params = {
  textured: true,
  srgb: true,
  speed: 0.3,
  tilt: 23.4,
  light: 40,
  segments: 48,
};

const LIGHT_DISTANCE = 5;
const LIGHT_HEIGHT = 1.5;
// 처음에 한반도가 카메라를 향하도록 돌려 둔다. 경도 0°는 +x 쪽에 놓인다.
const START_ROTATION = THREE.MathUtils.degToRad(-90 - 127);

type Status = "loading" | "loaded" | "error";

type Live = {
  stage: Stage;
  earth: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  axis: THREE.Group;
  sun: THREE.DirectionalLight;
  texture: THREE.Texture;
  /** 이미지가 도착했는지. 도착하기 전에는 재질에 텍스처를 걸지 않는다. */
  loaded: boolean;
  segments: number;
};

function lightPosition(p: Params): [number, number, number] {
  const angle = THREE.MathUtils.degToRad(p.light);
  return [
    Math.sin(angle) * LIGHT_DISTANCE,
    LIGHT_HEIGHT,
    Math.cos(angle) * LIGHT_DISTANCE,
  ];
}

// 조절판의 값을 장면에 옮긴다. 화면에는 다음 프레임에 반영된다.
function applyParams(live: Live, p: Params) {
  const { earth, axis, sun, texture } = live;

  axis.rotation.z = THREE.MathUtils.degToRad(-p.tilt);
  sun.position.set(...lightPosition(p));

  if (live.segments !== p.segments) {
    earth.geometry.dispose();
    earth.geometry = new THREE.SphereGeometry(1, p.segments, p.segments / 2);
    live.segments = p.segments;
  }

  const colorSpace = p.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (texture.colorSpace !== colorSpace) {
    texture.colorSpace = colorSpace;
    // 색 공간은 GPU에 올릴 때 정해지므로 이미지를 다시 올리게 한다.
    if (live.loaded) texture.needsUpdate = true;
  }

  const map = p.textured && live.loaded ? texture : null;
  if (earth.material.map !== map) {
    earth.material.map = map;
    // 텍스처가 생기거나 없어지면 셰이더가 달라지므로 재질을 다시 준비시킨다.
    earth.material.needsUpdate = true;
  }
}

type Props = { order: number; title: string };

export default function TextureLesson({ order, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<Live | null>(null);
  // 렌더 루프와 로딩 콜백이 읽는 최신 값.
  const paramsRef = useRef(DEFAULTS);
  const [params, setParams] = useState(DEFAULTS);
  const [status, setStatus] = useState<Status>("loading");

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
    stage.camera.position.z = 3.4;
    stage.camera.updateProjectionMatrix();

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, DEFAULTS.segments, DEFAULTS.segments / 2),
      new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }),
    );
    earth.rotation.y = START_ROTATION;

    // 기울기는 바깥 그룹이, 자전은 안쪽 구가 맡는다. 한 물체에 둘을 같이 넣으면
    // 기울어진 축이 아니라 세로축을 중심으로 돌게 된다.
    const axis = new THREE.Group();
    axis.add(earth);
    stage.scene.add(axis);

    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    stage.scene.add(sun, new THREE.AmbientLight(0xffffff, 0.25));

    // 페이지를 떠난 뒤에 이미지가 도착하면 이미 정리된 장면을 건드리지 않아야 한다.
    let disposed = false;
    // load는 빈 텍스처를 바로 돌려주고, 이미지는 나중에 채워 넣는다.
    const texture = new THREE.TextureLoader().load(
      IMAGE_URL,
      () => {
        if (disposed) return;
        live.loaded = true;
        applyParams(live, paramsRef.current);
        setStatus("loaded");
      },
      undefined,
      () => {
        if (!disposed) setStatus("error");
      },
    );
    // 비스듬히 보이는 가장자리의 지형이 뭉개지지 않게 한다.
    texture.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());

    const live: Live = {
      stage,
      earth,
      axis,
      sun,
      texture,
      loaded: false,
      segments: DEFAULTS.segments,
    };

    let frames = 0;
    stage.onFrame = (dt) => {
      earth.rotation.y += paramsRef.current.speed * dt;
    };
    stage.onRender = () => {
      frames += 1;
      if (framesRef.current) framesRef.current.textContent = String(frames);
    };

    liveRef.current = live;
    applyParams(live, paramsRef.current);
    stage.start();

    return () => {
      disposed = true;
      liveRef.current = null;
      // 무대의 정리는 geometry와 material까지만 챙기므로 텍스처는 직접 놓아 준다.
      texture.dispose();
      stage.dispose();
    };
  }, []);

  useEffect(() => {
    paramsRef.current = params;
    const live = liveRef.current;
    if (live) applyParams(live, params);
  }, [params]);

  const set = <K extends keyof Params>(key: K, value: Params[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const v = (text: string | number) => (
    <span className={styles.value}>{text}</span>
  );

  const [lx, ly, lz] = lightPosition(params).map((n) => n.toFixed(1));

  return (
    <main className={styles.lesson}>
      <article className={styles.prose}>
        <p className={styles.kicker}>{String(order).padStart(2, "0")}</p>
        <h1>{title}</h1>

        <p>
          지금까지는 물체의 표면을 색 하나로 칠했습니다. 텍스처는 표면에
          이미지를 입히는 방법입니다. 구에 세계 지도 한 장을 감으면 지구본이
          됩니다.
        </p>
        <p>
          <code>TextureLoader</code>로 이미지를 불러와 재질의{" "}
          <code>map</code>에 넣는 것이 전부입니다. 텍스처 버튼을 끄면 같은
          구가 이미지 없이 어떻게 보이는지 비교할 수 있습니다.
        </p>

        <h2>UV 좌표</h2>
        <p>
          이미지의 어느 지점을 표면의 어느 지점에 붙일지는 geometry가 정해
          둡니다. 꼭짓점마다 이미지 위의 위치를 가리키는 좌표가 하나씩 들어
          있고, 이것을 UV라고 부릅니다. u는 가로, v는 세로이며 둘 다 0에서
          1까지입니다. 왼쪽 아래가 (0, 0), 오른쪽 위가 (1, 1)입니다.
        </p>
        <p>
          <code>SphereGeometry</code>는 u를 경도에, v를 위도에 맞춰 둡니다.
          이미지의 왼쪽 끝과 오른쪽 끝은 구를 한 바퀴 돌아 같은 경선에서
          만나고, 맨 윗줄은 북극 한 점으로 모입니다.
        </p>

        <h2>지도가 2:1인 이유</h2>
        <p>
          경도는 360°, 위도는 180°이므로 가로가 세로의 두 배인 지도를 쓰면
          1°가 가로세로 같은 픽셀 수가 됩니다. 이렇게 경도와 위도를 그대로
          가로세로로 편 지도를 등장방형 도법이라고 합니다. 평면에서는 극지방이
          옆으로 길게 늘어나 보이지만, 구에 감으면 위쪽 줄이 좁게 모이면서
          제 모양을 찾습니다.
        </p>
        <p>
          구가 실제로는 삼각형을 이어 붙인 것이라는 점도 여기서 드러납니다.
          분할 수를 8까지 줄이면 윤곽이 각지고, 삼각형 하나가 넓은 지역을
          덮으면서 해안선이 꺾여 보입니다.
        </p>

        <h2>색 공간</h2>
        <p>
          JPEG나 PNG에 저장된 색은 사람 눈에 맞춰 어두운 쪽을 넉넉하게 쓰는
          sRGB 방식으로 기록되어 있습니다. 반면 조명 계산은 빛의 양에 비례하는
          값으로 해야 맞습니다. 그래서 three.js는 텍스처를 계산용 값으로 풀고,
          계산을 마친 결과를 화면에 내보낼 때 다시 sRGB로 바꿉니다.
        </p>
        <p>
          이 변환은 텍스처가 sRGB라고 알려 줘야 일어납니다.{" "}
          <code>texture.colorSpace = THREE.SRGBColorSpace</code>가 그
          표시입니다. 빠뜨리면 풀지 않은 값이 그대로 계산에 들어가고 마지막
          변환만 적용되어, 전체가 뿌옇게 밝아집니다. 색 공간 버튼을 꺼서 바다
          색이 어떻게 달라지는지 보세요. 색을 담은 이미지에는 이 표시를
          붙이고, 법선이나 거칠기처럼 색이 아닌 숫자를 담은 이미지에는 붙이지
          않습니다.
        </p>

        <h2>이미지는 나중에 도착한다</h2>
        <p>
          <code>load()</code>는 이미지를 기다리지 않고 빈 텍스처를 바로
          돌려줍니다. 받는 동안에도 렌더 루프는 계속 돌기 때문에, 그 사이에는
          이미지 없는 재질이 그려집니다. 이 페이지는 두 번째 인자로 넘긴
          콜백에서 이미지가 도착한 것을 확인한 뒤 재질에 텍스처를 겁니다.
          새로 고침 직후에 흰 구가 잠깐 보인다면 그 구간입니다.
        </p>

        <h2>자전축과 빛</h2>
        <p>
          지구의 자전축은 23.4° 기울어 있습니다. 구 하나에 기울기와 자전을
          함께 넣으면 회전이 섞이므로, 기울기는 바깥{" "}
          <code>Group</code>에 주고 구는 그 안에서 자기 y축으로만 돌립니다.
          부모의 변환이 자식에게 그대로 전해지는 성질을 쓴 것입니다.
        </p>
        <p>
          빛의 방향을 90° 가까이 돌리면 낮과 밤의 경계가 화면 가운데로
          옵니다. 완전히 검지 않은 것은 약한 <code>AmbientLight</code>를 함께
          넣었기 때문입니다.
        </p>

        <h2>텍스처도 정리한다</h2>
        <p>
          텍스처는 GPU 메모리에 올라가고, geometry나 material처럼 저절로
          사라지지 않습니다. 재질을 <code>dispose()</code>해도 거기 걸린
          텍스처는 남으므로 <code>texture.dispose()</code>를 따로 불러야
          합니다. 2048×1024 이미지 한 장은 풀어 놓으면 8MB쯤이고 밉맵까지
          더하면 더 커서, 페이지를 오갈 때마다 쌓이면 금방 부담이 됩니다.
        </p>

        <p className={styles.next}>
          노트는 여기까지입니다. 장면과 카메라, 재질, 조명, 텍스처를 차례로
          얹어 지구본 하나를 만들었습니다. <Link href="/three">목차</Link>로
          돌아가면 앞 페이지를 다시 볼 수 있습니다.
          <br />
          지구 이미지: NASA Blue Marble (NASA Goddard Space Flight Center
          Scientific Visualization Studio)
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
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.button}
              aria-pressed={params.textured}
              onClick={() => set("textured", !params.textured)}
            >
              텍스처
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={params.srgb}
              disabled={!params.textured}
              onClick={() => set("srgb", !params.srgb)}
            >
              색 공간 지정
            </button>
          </div>

          <label className={styles.control}>
            자전 속도
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={params.speed}
              onChange={(e) => set("speed", Number(e.target.value))}
            />
            <output>{params.speed.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            축 기울기
            <input
              type="range"
              min={0}
              max={90}
              step={0.1}
              value={params.tilt}
              onChange={(e) => set("tilt", Number(e.target.value))}
            />
            <output>{params.tilt.toFixed(1)}°</output>
          </label>
          <label className={styles.control}>
            빛의 방향
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={params.light}
              onChange={(e) => set("light", Number(e.target.value))}
            />
            <output>{params.light}°</output>
          </label>
          <label className={styles.control}>
            분할 수
            <input
              type="range"
              min={4}
              max={64}
              step={2}
              value={params.segments}
              onChange={(e) => set("segments", Number(e.target.value))}
            />
            <output>{params.segments}</output>
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
          {status === "loading" && (
            <p className={styles.note}>
              지구 이미지를 받는 중입니다. 도착하기 전까지는 이미지 없는
              재질이 보입니다.
            </p>
          )}
          {status === "error" && (
            <p className={styles.note}>
              지구 이미지를 불러오지 못했습니다. 재질만 그려집니다.
            </p>
          )}
        </div>

        <pre className={styles.code}>
          <code>
            {'const texture = new THREE.TextureLoader().load("/three/earth.jpg");\n'}
            {"texture.colorSpace = THREE."}
            {v(params.srgb ? "SRGBColorSpace" : "NoColorSpace")}
            {params.srgb ? ";\n\n" : "; // 기본값\n\n"}
            {"const earth = new THREE.Mesh(\n"}
            {"  new THREE.SphereGeometry(1, "}
            {v(params.segments)}
            {", "}
            {v(params.segments / 2)}
            {"),\n"}
            {"  new THREE.MeshStandardMaterial({ map: "}
            {v(params.textured ? "texture" : "null")}
            {", roughness: 1 }),\n"}
            {");\n\n"}
            {"const axis = new THREE.Group();\n"}
            {"axis.rotation.z = THREE.MathUtils.degToRad("}
            {v((-params.tilt).toFixed(1))}
            {");\n"}
            {"axis.add(earth);\n"}
            {"scene.add(axis);\n\n"}
            {"const sun = new THREE.DirectionalLight(0xffffff, 2.6);\n"}
            {"sun.position.set("}
            {v(lx)}
            {", "}
            {v(ly)}
            {", "}
            {v(lz)}
            {");\n"}
            {"scene.add(sun, new THREE.AmbientLight(0xffffff, 0.25));\n\n"}
            {"let last = 0;\n"}
            {"renderer.setAnimationLoop((time) => {\n"}
            {"  const dt = (time - last) / 1000;\n"}
            {"  last = time;\n"}
            {"  earth.rotation.y += "}
            {v(params.speed.toFixed(1))}
            {" * dt;\n"}
            {"  renderer.render(scene, camera);\n"}
            {"});\n\n"}
            {"// 페이지를 떠날 때\n"}
            {"texture.dispose();"}
          </code>
        </pre>
      </aside>
    </main>
  );
}
