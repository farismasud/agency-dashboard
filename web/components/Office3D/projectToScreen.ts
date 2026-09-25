import * as THREE from "three";

// Must match Scene.tsx's <PerspectiveCamera> props exactly - this is plain
// three.js math done OUTSIDE any mounted Canvas/WebGL context, so it stays
// in sync with the real camera only because both are fixed and hardcoded
// the same way. If Scene.tsx's camera ever becomes movable, this needs to
// read the live camera instead of duplicating its config.
const CAMERA_POSITION = new THREE.Vector3(6, 7, 9);
const CAMERA_LOOKAT = new THREE.Vector3(0, 1, 0);
const FOV = 45;

// Projects a 3D world point to a percentage position within the camera's
// viewport (0-100 for left/top), given the container's current aspect ratio.
export function projectToScreenPercent(
  worldPos: [number, number, number],
  aspect: number,
): { leftPct: number; topPct: number } {
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100);
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_LOOKAT);
  camera.updateProjectionMatrix();

  const vector = new THREE.Vector3(...worldPos);
  vector.project(camera);

  const leftPct = ((vector.x + 1) / 2) * 100;
  const topPct = ((1 - vector.y) / 2) * 100;
  return { leftPct, topPct };
}
