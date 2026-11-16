"use client";

import { useEffect, useRef } from "react";
import styles from "./spring-ball.module.css";

// 감쇠 스프링: 가속도 = -STIFFNESS * 변위 - DAMPING * 속도
const STIFFNESS = 180;
const DAMPING = 12;
// 변위와 속도가 모두 이 값 아래로 내려오면 멈춘 것으로 본다.
const REST = 0.05;

export default function SpringBall() {
  const ballRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;

    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const grab = { x: 0, y: 0 };
    let dragging = false;
    let frame = 0;
    let last = 0;

    const render = () => {
      ball.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    };

    const step = (now: number) => {
      // 탭이 백그라운드에 있다 돌아오면 dt가 커져 적분이 발산하므로 상한을 둔다.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      vel.x += (-STIFFNESS * pos.x - DAMPING * vel.x) * dt;
      vel.y += (-STIFFNESS * pos.y - DAMPING * vel.y) * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      const settled =
        Math.abs(pos.x) < REST &&
        Math.abs(pos.y) < REST &&
        Math.abs(vel.x) < REST &&
        Math.abs(vel.y) < REST;

      if (settled) {
        pos.x = pos.y = vel.x = vel.y = 0;
        render();
        frame = 0;
        return;
      }

      render();
      frame = requestAnimationFrame(step);
    };

    const release = () => {
      if (!dragging) return;
      dragging = false;
      ball.classList.remove(styles.dragging);

      // 움직임 줄이기 설정에서는 튕기지 않고 바로 제자리에 둔다.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        pos.x = pos.y = vel.x = vel.y = 0;
        render();
        return;
      }

      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    const onDown = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = 0;
      dragging = true;
      vel.x = vel.y = 0;
      grab.x = e.clientX - pos.x;
      grab.y = e.clientY - pos.y;
      ball.setPointerCapture(e.pointerId);
      ball.classList.add(styles.dragging);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      pos.x = e.clientX - grab.x;
      pos.y = e.clientY - grab.y;
      render();
    };

    ball.addEventListener("pointerdown", onDown);
    ball.addEventListener("pointermove", onMove);
    ball.addEventListener("pointerup", release);
    ball.addEventListener("pointercancel", release);

    return () => {
      cancelAnimationFrame(frame);
      ball.removeEventListener("pointerdown", onDown);
      ball.removeEventListener("pointermove", onMove);
      ball.removeEventListener("pointerup", release);
      ball.removeEventListener("pointercancel", release);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.anchor} aria-hidden />
      <div ref={ballRef} className={styles.ball} />
      <p className={styles.hint}>공을 끌었다 놓아 보세요</p>
    </main>
  );
}
