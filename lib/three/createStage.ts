import * as THREE from "three";

// three.js 노트의 모든 페이지가 공유하는 무대. 장면·카메라·렌더러를 만들고
// 직접 챙겨야 하는 세 가지(크기 대응, 렌더 루프, 정리)를 한곳에서 처리한다.
export type Stage = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** 실제로 그릴 때 쓰는 카메라. 기본값은 camera이고, 다른 카메라로 바꿔 끼울 수 있다. */
  view: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  /** 프레임마다 그리기 직전에 불린다. dt는 지난 프레임 이후 흐른 시간(초). */
  onFrame: (dt: number) => void;
  /** 한 프레임을 그린 직후에 불린다. */
  onRender: () => void;
  /** 캔버스 크기가 바뀌면 다시 그리기 직전에 불린다. 직접 만든 카메라의 비율을 여기서 맞춘다. */
  onResize: (width: number, height: number) => void;
  start: () => void;
  stop: () => void;
  renderOnce: () => void;
  dispose: () => void;
};

// 고해상도 화면에서 픽셀 수가 제곱으로 늘어나므로 배율에 상한을 둔다.
const MAX_PIXEL_RATIO = 2;
// 탭이 백그라운드에 있다 돌아오면 dt가 몇 초씩 튀므로 상한을 둔다.
const MAX_DT = 1 / 30;

/** WebGL을 쓸 수 없는 환경에서는 예외를 던진다. */
export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

  let running = false;
  let last = 0;

  const stage: Stage = {
    scene,
    camera,
    view: camera,
    renderer,
    onFrame: () => {},
    onRender: () => {},
    onResize: () => {},
    start() {
      if (running) return;
      running = true;
      last = 0;
      renderer.setAnimationLoop((time) => {
        const dt = last === 0 ? 0 : Math.min((time - last) / 1000, MAX_DT);
        last = time;
        stage.onFrame(dt);
        stage.renderOnce();
      });
    },
    stop() {
      running = false;
      renderer.setAnimationLoop(null);
    },
    renderOnce() {
      renderer.render(scene, stage.view);
      stage.onRender();
    },
    dispose() {
      stage.stop();
      observer.disconnect();
      scene.traverse((object) => {
        const item = object as Partial<THREE.Mesh>;
        item.geometry?.dispose();
        const materials = Array.isArray(item.material)
          ? item.material
          : item.material
            ? [item.material]
            : [];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      // 개발 모드에서 effect가 두 번 실행될 때 WebGL 컨텍스트가 쌓이지 않게 바로 놓아 준다.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };

  const observer = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = container;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    stage.onResize(width, height);
    // setSize는 캔버스를 비우므로 루프가 멈춰 있어도 한 번은 다시 그린다.
    stage.renderOnce();
  });
  observer.observe(container);

  return stage;
}
