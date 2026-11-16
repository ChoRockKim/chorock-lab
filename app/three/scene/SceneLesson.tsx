"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage, type Stage } from "@/lib/three/createStage";
import styles from "../three.module.css";

const DEFAULTS = {
  speed: 0.8,
  distance: 4,
  fov: 60,
  color: "#2f7d4f",
  running: true,
};

type Live = { stage: Stage; material: THREE.MeshBasicMaterial };

type Props = { order: number; title: string };

export default function SceneLesson({ order, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<Live | null>(null);
  // 렌더 루프가 프레임마다 읽는 값. state로 읽으면 루프를 매번 다시 만들어야 한다.
  const speedRef = useRef(DEFAULTS.speed);
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

    const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const material = new THREE.MeshBasicMaterial({
      color: DEFAULTS.color,
      // 면을 아주 조금 뒤로 밀어, 같은 깊이에 놓인 모서리 선과 겹쳐 깜빡이지 않게 한다.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const cube = new THREE.Mesh(geometry, material);
    // MeshBasicMaterial은 조명을 계산하지 않아 면이 한 색으로 뭉쳐 보인다.
    // 모서리 선을 덧그려 입체가 읽히게 한다.
    cube.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x1b1a1d }),
      ),
    );
    stage.scene.add(cube);

    let frames = 0;
    stage.onFrame = (dt) => {
      cube.rotation.x += speedRef.current * dt * 0.6;
      cube.rotation.y += speedRef.current * dt;
    };
    stage.onRender = () => {
      frames += 1;
      // 프레임마다 바뀌는 숫자라 state 대신 DOM에 직접 쓴다.
      if (framesRef.current) framesRef.current.textContent = String(frames);
    };

    liveRef.current = { stage, material };
    return () => {
      liveRef.current = null;
      stage.dispose();
    };
  }, []);

  // 조절판의 값을 장면에 옮긴다. 화면에 반영되는 것은 다음 프레임이 그려질 때다.
  useEffect(() => {
    speedRef.current = params.speed;
    const live = liveRef.current;
    if (!live) return;

    const { stage, material } = live;
    stage.camera.position.z = params.distance;
    stage.camera.fov = params.fov;
    stage.camera.updateProjectionMatrix();
    material.color.set(params.color);

    if (params.running) stage.start();
    else stage.stop();
  }, [params]);

  const set = <K extends keyof typeof DEFAULTS>(
    key: K,
    value: (typeof DEFAULTS)[K],
  ) => setParams((prev) => ({ ...prev, [key]: value }));

  const v = (text: string | number) => (
    <span className={styles.value}>{text}</span>
  );

  return (
    <main className={styles.lesson}>
      <article className={styles.prose}>
        <p className={styles.kicker}>{String(order).padStart(2, "0")}</p>
        <h1>{title}</h1>

        <p>
          three.js로 화면에 무언가를 그리려면 세 가지가 필요합니다. 이
          페이지의 정육면체도 이 세 가지만으로 그린 것입니다.
        </p>
        <ul>
          <li>
            장면(<code>Scene</code>): 그릴 물체를 담는 공간입니다. 물체는{" "}
            <code>scene.add()</code>로 넣어야 보입니다.
          </li>
          <li>
            카메라(<code>PerspectiveCamera</code>): 장면을 어디서 어떤 각도로
            볼지 정합니다.
          </li>
          <li>
            렌더러(<code>WebGLRenderer</code>): 카메라가 본 장면을{" "}
            <code>&lt;canvas&gt;</code>에 그립니다.
          </li>
        </ul>

        <h2>카메라는 뒤로 물러나 있어야 한다</h2>
        <p>
          물체와 카메라는 둘 다 원점(0, 0, 0)에서 시작합니다. 그대로 두면
          카메라가 정육면체 안에 들어가 있어 아무것도 보이지 않습니다. 그래서{" "}
          <code>camera.position.z</code>를 키워 카메라를 뒤로 뺍니다.
        </p>
        <p>
          카메라 거리를 줄이면 정육면체가 커지고, 시야각을 넓히면 같은
          거리에서도 작아집니다. 시야각을 크게 한 채로 가까이 가면 광각 렌즈처럼
          모서리가 과장되어 보입니다.
        </p>

        <h2>렌더 루프</h2>
        <p>
          <code>renderer.render(scene, camera)</code>는 호출한 순간의 모습을 한
          장 그릴 뿐입니다. 움직임은 값을 조금 바꾸고 다시 그리는 일을 초당
          수십 번 반복해서 만듭니다. 이 반복이 렌더 루프이고,{" "}
          <code>renderer.setAnimationLoop()</code>에 함수를 넘기면 브라우저가
          화면을 갱신할 때마다 그 함수를 불러 줍니다.
        </p>
        <p>
          루프를 멈추고 색이나 거리를 바꿔 보세요. 값은 바뀌었지만 다시 그리는
          주체가 없어 화면은 그대로입니다. 한 프레임 그리기를 누르면 그때
          반영됩니다.
        </p>

        <h2>회전에 dt를 곱하는 이유</h2>
        <p>
          프레임마다 같은 각도를 더하면 주사율이 높은 화면에서 더 빨리 돕니다.
          120Hz 화면은 60Hz 화면보다 함수를 두 배 자주 부르기 때문입니다. 지난
          프레임 이후 흐른 시간(dt)을 곱하면 화면과 무관하게 초당 같은 각도로
          회전합니다.
        </p>

        <h2>React에서 쓸 때</h2>
        <p>
          three.js가 만든 geometry, material, 렌더러는 컴포넌트가 사라져도
          저절로 없어지지 않습니다. <code>useEffect</code>의 정리 함수에서
          루프를 멈추고 각각 <code>dispose()</code>를 불러야 GPU 메모리가 새지
          않습니다. 이 노트에서는 그 처리를 무대 하나에 모아 페이지마다 다시
          씁니다.
        </p>

        <p className={styles.next}>
          다음: <Link href="/three/camera">카메라</Link>. 시야각과 위치를 더
          자세히 다루고, 원근 투영과 직교 투영을 비교합니다.
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
          <label className={styles.control}>
            회전 속도
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={params.speed}
              onChange={(e) => set("speed", Number(e.target.value))}
            />
            <output>{params.speed.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            카메라 거리
            <input
              type="range"
              min={2}
              max={10}
              step={0.1}
              value={params.distance}
              onChange={(e) => set("distance", Number(e.target.value))}
            />
            <output>{params.distance.toFixed(1)}</output>
          </label>
          <label className={styles.control}>
            시야각
            <input
              type="range"
              min={20}
              max={110}
              step={1}
              value={params.fov}
              onChange={(e) => set("fov", Number(e.target.value))}
            />
            <output>{params.fov}°</output>
          </label>
          <label className={styles.control}>
            색
            <input
              type="color"
              value={params.color}
              onChange={(e) => set("color", e.target.value)}
            />
            <output>{params.color}</output>
          </label>

          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.button}
              onClick={() => set("running", !params.running)}
            >
              {params.running ? "루프 멈추기" : "루프 다시 돌리기"}
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={params.running}
              onClick={() => liveRef.current?.stage.renderOnce()}
            >
              한 프레임 그리기
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setParams(DEFAULTS)}
            >
              처음 값으로
            </button>
          </div>
          {!params.running && (
            <p className={styles.note}>
              루프가 멈춰 있습니다. 값을 바꿔도 다시 그리기 전에는 화면이
              그대로입니다.
            </p>
          )}
        </div>

        <pre className={styles.code}>
          <code>
            {"const scene = new THREE.Scene();\n"}
            {"const camera = new THREE.PerspectiveCamera("}
            {v(params.fov)}
            {", width / height, 0.1, 100);\n"}
            {"camera.position.z = "}
            {v(params.distance.toFixed(1))}
            {";\n\n"}
            {"const renderer = new THREE.WebGLRenderer({ antialias: true });\n"}
            {"renderer.setSize(width, height);\n"}
            {"container.appendChild(renderer.domElement);\n\n"}
            {"const cube = new THREE.Mesh(\n"}
            {"  new THREE.BoxGeometry(1.4, 1.4, 1.4),\n"}
            {"  new THREE.MeshBasicMaterial({ color: "}
            {v(`"${params.color}"`)}
            {" }),\n"}
            {");\n"}
            {"scene.add(cube);\n\n"}
            {params.running ? (
              <>
                {"let last = 0;\n"}
                {"renderer.setAnimationLoop((time) => {\n"}
                {"  const dt = (time - last) / 1000;\n"}
                {"  last = time;\n"}
                {"  cube.rotation.y += "}
                {v(params.speed.toFixed(1))}
                {" * dt;\n"}
                {"  renderer.render(scene, camera);\n"}
                {"});"}
              </>
            ) : (
              <>
                {"renderer.setAnimationLoop("}
                {v("null")}
                {"); // 루프 정지"}
              </>
            )}
          </code>
        </pre>
      </aside>
    </main>
  );
}
