"use client";

import { useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { AgentState } from "@/lib/types";
import { ROLE_RING_COLOR, DEFAULT_RING_COLOR } from "./layout";
import {
  getRandomOfficeSpots,
  getDeskSpot,
  getRandomDialogue,
  type OfficeSpot,
} from "./AgentBehavior";

const WALK_SPEED = 2.4; // world units per second

export interface LiveAgentStatus {
  x: number;
  z: number;
  y?: number;
  rotationY: number;
  isWalking: boolean;
  bubbleText: string;
}

export interface NavWaypoint {
  x: number;
  y: number;
  z: number;
  isStair?: boolean;
}

export interface PersonLookConfig {
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  hairStyle: "short" | "side" | "curly" | "bun" | "long";
  glasses?: boolean;
  headphones?: boolean;
  tie?: boolean;
  backpack?: boolean;
}

export const ROLE_LOOKS: Record<string, PersonLookConfig> = {
  // --- LANTAI 2 (Mezzanine: Strategy, Architecture & Security) ---
  pm: {
    shirt: "#7c3aed", // Royal violet collared shirt
    pants: "#1e1b4b", // Deep navy trousers
    skin: "#c68a5e",
    hair: "#1c1917",
    hairStyle: "side",
    tie: true,
    glasses: true,
  },
  analyst: {
    shirt: "#0284c7", // Bright cyan blouse
    pants: "#0f172a", // Charcoal dress pants
    skin: "#f5c6a5",
    hair: "#3b2012",
    hairStyle: "bun",
    glasses: true,
  },
  security: {
    shirt: "#b91c1c", // Security tactical polo
    pants: "#18181b", // Tactical black cargo
    skin: "#a86e45",
    hair: "#140f0c",
    hairStyle: "short",
    backpack: true,
  },
  designer: {
    shirt: "#c026d3", // Magenta creative knit
    pants: "#3b0764", // Plum trousers
    skin: "#fbcfe8",
    hair: "#451a03",
    hairStyle: "long",
    glasses: true,
  },
  // --- LANTAI 1 (Core Engineering, Infrastructure & Data) ---
  dev: {
    shirt: "#15803d", // Emerald coder hoodie
    pants: "#1e293b", // Slate denim
    skin: "#d6a07a",
    hair: "#1e1b18",
    hairStyle: "curly",
    headphones: true,
  },
  qa: {
    shirt: "#ea580c", // Energetic QA orange sweater
    pants: "#27272a", // Dark charcoal trousers
    skin: "#e0b08a",
    hair: "#2b2016",
    hairStyle: "short",
    glasses: true,
  },
  devops: {
    shirt: "#0d9488", // Teal infrastructure shirt
    pants: "#111827", // Night black trousers
    skin: "#b97d52",
    hair: "#191310",
    hairStyle: "side",
    headphones: true,
  },
  dba: {
    shirt: "#2563eb", // Deep SQL blue dress shirt
    pants: "#1e293b", // Slate dress trousers
    skin: "#f5c6a5",
    hair: "#1e1b18",
    hairStyle: "short",
    tie: true,
  },
};

export interface PersonBones {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  head: THREE.Group;
  sh: [THREE.Group, THREE.Group];
  el: [THREE.Group, THREE.Group];
  hand: [THREE.Mesh, THREE.Mesh];
  hip: [THREE.Group, THREE.Group];
  knee: [THREE.Group, THREE.Group];
  mug: THREE.Mesh;
}

// Procedural 3D Character Assembly (Zero external GLTF files needed, renders in 0ms)
function buildPerson(cfg: PersonLookConfig): PersonBones {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);

  const mat = (color: string, rough = 0.75, metal = 0.05) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

  const box = (w: number, h: number, d: number, r = 0.02) =>
    new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));

  const mesh = (geo: THREE.BufferGeometry, material: THREE.Material) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const pantsM = mat(cfg.pants, 0.85);
  const shirtM = mat(cfg.shirt, 0.7);
  const skinM = mat(cfg.skin, 0.6);
  const hairM = mat(cfg.hair, 0.8);
  const shoeM = mat("#262626", 0.5);
  const darkM = mat("#18181b", 0.3);

  // Pelvis / Hips
  hips.add(mesh(box(0.34, 0.17, 0.22, 0.07), pantsM));

  // Spine & Torso
  const spine = new THREE.Group();
  spine.position.y = 0.06;
  hips.add(spine);

  const torso = mesh(new THREE.CapsuleGeometry(0.16, 0.26, 6, 18), shirtM);
  torso.scale.set(1.14, 1, 0.74);
  torso.position.y = 0.25;
  spine.add(torso);

  // Clothing details
  if (cfg.headphones) {
    const hood = mesh(new THREE.TorusGeometry(0.1, 0.035, 10, 20), shirtM);
    hood.position.set(0, 0.5, -0.08);
    hood.rotation.x = 1.2;
    spine.add(hood);
  } else {
    const collar = mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 18, Math.PI * 1.3), mat("#ffffff", 0.7));
    collar.position.set(0, 0.5, 0.01);
    collar.rotation.set(Math.PI / 2 - 0.2, 0, Math.PI * 0.85);
    spine.add(collar);
  }

  if (cfg.tie) {
    const tie = mesh(box(0.05, 0.22, 0.02, 0.008), mat("#fbbf24", 0.6));
    tie.position.set(0, 0.34, 0.125);
    tie.rotation.x = -0.12;
    spine.add(tie);
  }

  if (cfg.backpack) {
    const bag = mesh(box(0.28, 0.34, 0.14, 0.05), mat("#334155", 0.8));
    bag.position.set(0, 0.28, -0.17);
    const flap = mesh(box(0.26, 0.1, 0.02, 0.01), mat("#1e293b", 0.8));
    flap.position.set(0, 0.38, -0.245);
    spine.add(bag, flap);
  }

  // Neck
  const neck = mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), skinM);
  neck.position.y = 0.53;
  spine.add(neck);

  // Head
  const head = new THREE.Group();
  head.position.y = 0.67;
  spine.add(head);

  const R = 0.128;
  const skull = mesh(new THREE.SphereGeometry(R, 32, 24), skinM);
  skull.scale.set(1, 1.1, 1.02);
  head.add(skull);

  // Cute Facial Features
  for (const s of [-1, 1]) {
    // Eyes
    const eye = mesh(new THREE.SphereGeometry(0.016, 10, 8), darkM);
    eye.position.set(s * 0.046, 0.012, R * 0.93);
    // Eyebrows
    const brow = mesh(box(0.04, 0.008, 0.01, 0.003), hairM);
    brow.position.set(s * 0.047, 0.045, R * 0.96);
    // Ears
    const ear = mesh(new THREE.SphereGeometry(0.03, 10, 8), skinM);
    ear.scale.set(0.6, 1, 0.8);
    ear.position.set(s * R * 0.98, 0, 0);
    head.add(eye, brow, ear);
  }

  // Cute Nose
  const nose = mesh(new THREE.SphereGeometry(0.018, 10, 8), skinM);
  nose.position.set(0, -0.012, R * 1.02);
  // Friendly Smile
  const mouth = mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI), mat("#e11d48", 0.6));
  mouth.position.set(0, -0.055, R * 0.93);
  mouth.rotation.z = Math.PI;
  head.add(nose, mouth);

  // Hair Styles
  const cap = mesh(new THREE.SphereGeometry(R * 1.07, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM);
  cap.position.set(0, 0.012, -0.012);
  cap.scale.set(1, 1.1, 1.04);
  head.add(cap);

  if (cfg.hairStyle === "short" || cfg.hairStyle === "side") {
    const backHair = mesh(new THREE.SphereGeometry(R * 1.04, 20, 14, Math.PI * 0.55, Math.PI * 0.9, Math.PI * 0.3, Math.PI * 0.35), hairM);
    backHair.position.y = -0.01;
    head.add(backHair);
    if (cfg.hairStyle === "side") {
      const part = mesh(box(0.1, 0.03, 0.06, 0.012), hairM);
      part.position.set(0.05, 0.1, 0.08);
      part.rotation.z = -0.25;
      head.add(part);
    }
  } else if (cfg.hairStyle === "curly") {
    for (let i = 0; i < 14; i++) {
      const c = mesh(new THREE.SphereGeometry(0.038, 10, 8), hairM);
      const a = (i / 14) * Math.PI * 2;
      const up = 0.3 + (i % 3) * 0.2;
      c.position.set(Math.sin(a) * R * 0.9 * Math.cos(up), R * 0.55 + Math.sin(up) * 0.06, Math.cos(a) * R * 0.85 * Math.cos(up) - 0.015);
      head.add(c);
    }
  } else if (cfg.hairStyle === "bun" || cfg.hairStyle === "long") {
    const longHair = cfg.hairStyle === "long";
    const hang = mesh(new THREE.CylinderGeometry(R * 1.02, R * (longHair ? 1.18 : 1.1), longHair ? 0.4 : 0.26, 20, 1, true, Math.PI * 0.62, Math.PI * 0.76), hairM);
    hang.position.y = longHair ? -0.14 : -0.08;
    head.add(hang);
    if (!longHair) {
      const bun = mesh(new THREE.SphereGeometry(0.058, 14, 10), hairM);
      bun.position.set(0, 0.12, -0.1);
      head.add(bun);
    }
  }

  // Glasses
  if (cfg.glasses) {
    const gm = mat("#0f172a", 0.3, 0.5);
    for (const s of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 20), gm);
      ring.position.set(s * 0.047, 0.012, R * 1.01);
      head.add(ring);
    }
    const bridge = mesh(new THREE.BoxGeometry(0.03, 0.005, 0.005), gm);
    bridge.position.set(0, 0.015, R * 1.03);
    head.add(bridge);
  }

  // Headphones
  if (cfg.headphones) {
    const hm = mat("#18181b", 0.4, 0.3);
    const band = mesh(new THREE.TorusGeometry(R * 1.12, 0.014, 8, 28, Math.PI), hm);
    band.position.y = 0.01;
    head.add(band);
    for (const s of [-1, 1]) {
      const cup = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16), mat(cfg.shirt, 0.5));
      cup.rotation.z = Math.PI / 2;
      cup.position.set(s * R * 1.05, 0, 0);
      head.add(cup);
    }
  }

  // Shoulders, Elbows, Hands (Articulated Joints)
  const sh: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  const el: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  const handMeshes: [THREE.Mesh, THREE.Mesh] = [null as any, null as any];

  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    sh[i].position.set(s * 0.2, 0.44, 0);
    spine.add(sh[i]);

    const upper = mesh(new THREE.CapsuleGeometry(0.05, 0.19, 4, 12), shirtM);
    upper.position.y = -0.14;
    sh[i].add(upper);

    el[i].position.y = -0.29;
    sh[i].add(el[i]);

    const fore = mesh(new THREE.CapsuleGeometry(0.043, 0.17, 4, 12), shirtM);
    fore.position.y = -0.12;
    el[i].add(fore);

    const h = mesh(new THREE.SphereGeometry(0.047, 12, 10), skinM);
    h.position.y = -0.26;
    h.scale.set(0.9, 1.1, 0.7);
    el[i].add(h);
    handMeshes[i] = h;
  }

  // Coffee mug held in right hand (index 1)
  const mugGeo = new THREE.CylinderGeometry(0.032, 0.028, 0.07, 12);
  const mug = mesh(mugGeo, mat("#ffffff", 0.3));
  mug.position.set(0, -0.06, 0.04);
  mug.visible = false;
  handMeshes[1].add(mug);

  // Hips, Thighs, Knees, Feet (Articulated Legs)
  const hip: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  const knee: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];

  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    hip[i].position.set(s * 0.095, -0.03, 0);
    hips.add(hip[i]);

    const thigh = mesh(new THREE.CapsuleGeometry(0.068, 0.26, 4, 12), pantsM);
    thigh.position.y = -0.2;
    hip[i].add(thigh);

    knee[i].position.y = -0.41;
    hip[i].add(knee[i]);

    const shin = mesh(new THREE.CapsuleGeometry(0.058, 0.27, 4, 12), pantsM);
    shin.position.y = -0.18;
    knee[i].add(shin);

    const foot = mesh(box(0.11, 0.07, 0.23, 0.03), shoeM);
    foot.position.set(0, -0.4, 0.05);
    knee[i].add(foot);
  }

  return { root, hips, spine, head, sh, el, hand: handMeshes, hip, knee, mug };
}

export interface PoseData {
  hipsY?: number;
  spineX?: number;
  spineZ?: number;
  headX?: number;
  headY?: number;
  headZ?: number;
  lShX?: number;
  lShZ?: number;
  lElX?: number;
  lElZ?: number;
  rShX?: number;
  rShZ?: number;
  rElX?: number;
  rElZ?: number;
  lHipX?: number;
  rHipX?: number;
  lKneeX?: number;
  rKneeX?: number;
}

const lerpK = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, Math.max(0, k));

function lerpVal(current: number, target: number, alpha: number): number {
  const k = Math.min(1, Math.max(0, alpha));
  return current + (target - current) * k;
}

function lerpAngle(current: number, target: number, alpha: number): number {
  const k = Math.min(1, Math.max(0, alpha));
  let diff = (target - current) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * k;
}

function applyPose(bones: PersonBones, T: PoseData, dt: number) {
  const k = Math.min(1, Math.max(0, dt * 9));

  bones.spine.rotation.x = lerpK(bones.spine.rotation.x, T.spineX ?? 0, k);
  bones.spine.rotation.z = lerpK(bones.spine.rotation.z, T.spineZ ?? 0, k);

  bones.head.rotation.x = lerpK(bones.head.rotation.x, T.headX ?? 0, k * 1.2);
  bones.head.rotation.y = lerpK(bones.head.rotation.y, T.headY ?? 0, k);
  bones.head.rotation.z = lerpK(bones.head.rotation.z, T.headZ ?? 0, k);

  // Left Shoulder & Elbow
  bones.sh[0].rotation.x = lerpK(bones.sh[0].rotation.x, T.lShX ?? 0, k);
  bones.sh[0].rotation.z = lerpK(bones.sh[0].rotation.z, T.lShZ ?? 0.08, k);
  bones.el[0].rotation.x = lerpK(bones.el[0].rotation.x, T.lElX ?? 0, k);
  bones.el[0].rotation.z = lerpK(bones.el[0].rotation.z, T.lElZ ?? 0, k);

  // Right Shoulder & Elbow
  bones.sh[1].rotation.x = lerpK(bones.sh[1].rotation.x, T.rShX ?? 0, k);
  bones.sh[1].rotation.z = lerpK(bones.sh[1].rotation.z, T.rShZ ?? -0.08, k);
  bones.el[1].rotation.x = lerpK(bones.el[1].rotation.x, T.rElX ?? 0, k);
  bones.el[1].rotation.z = lerpK(bones.el[1].rotation.z, T.rElZ ?? 0, k);

  // Hips & Knees
  bones.hip[0].rotation.x = lerpK(bones.hip[0].rotation.x, T.lHipX ?? 0, k * 1.4);
  bones.knee[0].rotation.x = lerpK(bones.knee[0].rotation.x, T.lKneeX ?? 0, k * 1.4);

  bones.hip[1].rotation.x = lerpK(bones.hip[1].rotation.x, T.rHipX ?? 0, k * 1.4);
  bones.knee[1].rotation.x = lerpK(bones.knee[1].rotation.x, T.rKneeX ?? 0, k * 1.4);

  bones.hips.position.y = lerpK(bones.hips.position.y, T.hipsY ?? 0.9, k);
}

// Procedural Dynamic Poses
function walkPose(phase: number, isStair = false, climbingUp = true): PoseData {
  const sw = Math.sin(phase);
  const kneeBend = isStair ? 0.9 : 0.72;
  return {
    hipsY: 0.9 + Math.abs(Math.cos(phase)) * 0.038,
    spineX: isStair ? (climbingUp ? 0.12 : -0.06) : 0.04,
    headX: isStair ? (climbingUp ? 0.14 : -0.04) : 0.05,
    lHipX: sw * 0.52,
    rHipX: -sw * 0.52,
    lKneeX: Math.max(0, -sw) * kneeBend,
    rKneeX: Math.max(0, sw) * kneeBend,
    lShX: -sw * 0.4,
    lShZ: 0.1,
    lElX: -0.25,
    rShX: sw * 0.4,
    rShZ: -0.1,
    rElX: -0.25,
  };
}

function typePose(t: number, seed: number): PoseData {
  const tw = Math.sin(t * 14 + seed);
  return {
    hipsY: 0.50, // Hips rest directly on chair cushion
    lHipX: -1.5,
    rHipX: -1.5,
    lKneeX: 1.45,
    rKneeX: 1.45,
    spineX: 0.14,
    headX: 0.1 + Math.sin(t * 1.5 + seed) * 0.03,
    headY: Math.sin(t * 0.6 + seed) * 0.08,
    lShX: -0.65,
    lShZ: 0.18,
    lElX: -1.0 + tw * 0.08,
    rShX: -0.65,
    rShZ: -0.18,
    rElX: -1.0 - tw * 0.08,
  };
}

function readPose(t: number, seed: number): PoseData {
  return {
    hipsY: 0.50, // Hips rest directly on chair cushion
    lHipX: -1.5,
    rHipX: -1.5,
    lKneeX: 1.45,
    rKneeX: 1.45,
    spineX: -0.04,
    headX: 0.06,
    headY: Math.sin(t * 0.8 + seed) * 0.22,
    lShX: -0.4,
    lShZ: 0.3,
    lElX: -1.2,
    rShX: -0.85,
    rShZ: -0.05,
    rElX: -1.45 + Math.sin(t * 2) * 0.04,
  };
}

function meetingPose(t: number, seed: number): PoseData {
  return {
    hipsY: 0.50, // Hips rest on conference chair cushion
    lHipX: -1.5,
    rHipX: -1.5,
    lKneeX: 1.45,
    rKneeX: 1.45,
    spineX: 0.08,
    headX: 0.06 + Math.sin(t * 1.3 + seed) * 0.03,
    headY: Math.sin(t * 0.5 + seed) * 0.15,
    lShX: -0.72,
    lShZ: 0.18,
    lElX: -0.92,
    rShX: -0.72 + Math.sin(t * 2.5 + seed) * 0.08,
    rShZ: -0.18,
    rElX: -0.92,
  };
}

function sofaPose(t: number): PoseData {
  return {
    hipsY: 0.42, // Hips sink comfortably into sofa cushion
    lHipX: -1.4,
    rHipX: -1.4,
    lKneeX: 1.35,
    rKneeX: 1.35,
    spineX: -0.18,
    headX: -0.08 + Math.sin(t * 0.8) * 0.04,
    lShX: -0.45,
    lShZ: 0.25,
    lElX: -0.95,
    rShX: -0.45,
    rShZ: -0.25,
    rElX: -0.95,
  };
}

function coffeePose(t: number): PoseData {
  const sip = (t % 7) < 2.2;
  return {
    hipsY: 0.9,
    lHipX: 0,
    rHipX: 0,
    lKneeX: 0,
    rKneeX: 0,
    spineX: -0.02,
    headX: sip ? -0.18 : 0.05,
    lShX: 0.1,
    lElX: -0.15,
    rShX: sip ? -1.1 : -0.55,
    rShZ: sip ? -0.35 : -0.15,
    rElX: sip ? -2.1 : -1.35,
  };
}

function balconyPose(t: number): PoseData {
  return {
    hipsY: 0.9,
    lHipX: 0,
    rHipX: 0,
    lKneeX: 0,
    rKneeX: 0,
    spineX: 0.1,
    headX: 0.15,
    headY: Math.sin(t * 0.5) * 0.2,
    lShX: -0.8,
    lShZ: 0.35,
    lElX: -1.4,
    rShX: -0.8,
    rShZ: -0.35,
    rElX: -1.4,
  };
}

function whiteboardPose(t: number): PoseData {
  return {
    hipsY: 0.9,
    lHipX: 0,
    rHipX: 0,
    lKneeX: 0,
    rKneeX: 0,
    spineX: 0.05,
    headX: 0.12,
    rShX: -1.2 + Math.sin(t * 3) * 0.15,
    rShZ: 0.2,
    rElX: -0.8,
    lShX: 0.1,
    lElX: -0.2,
  };
}

// Architectural Staircase Navigation: routes character across floors through physical stairs
export function buildPathToSpot(
  currentPos: { x: number; y: number; z: number },
  targetSpot: OfficeSpot
): NavWaypoint[] {
  const currentFloor: 1 | 2 = currentPos.y > 1.8 ? 2 : 1;
  const targetFloor = targetSpot.floor;

  const waypoints: NavWaypoint[] = [];

  if (currentFloor === 1 && targetFloor === 2) {
    // === NAIK TANGGA (Lantai 1 -> Lantai 2) ===
    waypoints.push({ x: -9.2, y: 0.0, z: 4.4 });
    waypoints.push({ x: -9.2, y: 0.15, z: 3.6, isStair: true });
    waypoints.push({ x: -9.2, y: 1.15, z: 2.4, isStair: true });
    waypoints.push({ x: -9.2, y: 2.18, z: 1.2, isStair: true });
    waypoints.push({ x: -9.2, y: 3.46, z: -0.3, isStair: true });
    waypoints.push({ x: -8.5, y: 3.6, z: 0.2 });
    waypoints.push({ x: targetSpot.x, y: 3.6, z: targetSpot.z });
  } else if (currentFloor === 2 && targetFloor === 1) {
    // === TURUN TANGGA (Lantai 2 -> Lantai 1) ===
    waypoints.push({ x: -8.5, y: 3.6, z: 0.2 });
    waypoints.push({ x: -9.2, y: 3.46, z: -0.3, isStair: true });
    waypoints.push({ x: -9.2, y: 2.18, z: 1.2, isStair: true });
    waypoints.push({ x: -9.2, y: 1.15, z: 2.4, isStair: true });
    waypoints.push({ x: -9.2, y: 0.15, z: 3.6, isStair: true });
    waypoints.push({ x: -9.2, y: 0.0, z: 4.4 });
    waypoints.push({ x: targetSpot.x, y: 0.0, z: targetSpot.z });
  } else {
    // === SAME FLOOR NAVIGATION ===
    const walkY = targetFloor === 2 ? 3.6 : 0.0;
    waypoints.push({ x: targetSpot.x, y: walkY, z: targetSpot.z });
  }

  return waypoints;
}

export function CharacterModel({
  agent,
  onSelect,
  livePositionsRef,
}: {
  agent: AgentState;
  onSelect?: (agent: AgentState) => void;
  livePositionsRef?: React.MutableRefObject<Record<string, LiveAgentStatus>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const role = agent.subagent_type;
  const ringColor = ROLE_RING_COLOR[role] ?? DEFAULT_RING_COLOR;
  const working = agent.status === "working";
  const lookConfig = ROLE_LOOKS[role] ?? ROLE_LOOKS.dev;

  // Build procedural cute character (instantly in memory, zero GLTF loading!)
  const bones = useMemo(() => buildPerson(lookConfig), [lookConfig]);

  const currentSpotRef = useRef<OfficeSpot>(getDeskSpot(role));
  const pathQueueRef = useRef<NavWaypoint[]>([]);
  const currentDialogue = useRef<string>(agent.last_action || "Fokus kerja...");
  const nextChangeTime = useRef<number>(performance.now() + 8000 + Math.random() * 10000);
  const walkPhase = useRef<number>(0);
  const randomSeed = useRef<number>(Math.random() * 100);

  // Set initial position onto desk chair
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const initialSpot = getDeskSpot(role);
    const floorY = initialSpot.floor === 2 ? 3.6 : 0.0;
    groupRef.current.position.set(initialSpot.x, floorY, initialSpot.z);
    groupRef.current.rotation.y = initialSpot.faceAngle;
    currentSpotRef.current = initialSpot;
    pathQueueRef.current = [];
  }, [role]);

  // When live events arrive from backend, prioritize own desk via realistic path
  useEffect(() => {
    if (agent.last_action) {
      currentDialogue.current = agent.last_action;
      if (working) {
        const deskSpot = getDeskSpot(role);
        currentSpotRef.current = deskSpot;
        if (groupRef.current) {
          pathQueueRef.current = buildPathToSpot(groupRef.current.position, deskSpot);
        }
        nextChangeTime.current = performance.now() + 18000;
      }
    }
  }, [agent.last_action, role, working]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = "pointer";
      return () => {
        document.body.style.cursor = "auto";
      };
    }
  }, [hovered]);

  useFrame((_, rawDelta) => {
    if (!groupRef.current) return;

    // Clamp delta to protect against tab lag or frame drops
    const delta = Math.min(rawDelta, 0.08);
    const now = performance.now();
    const timeSec = now / 1000;

    // Pick new random spot across 2-floor office
    if (now > nextChangeTime.current) {
      nextChangeTime.current = now + 12000 + Math.random() * 16000;

      const spots = getRandomOfficeSpots(role);
      let chosenSpot: OfficeSpot;
      if (Math.random() < 0.40) {
        chosenSpot = getDeskSpot(role);
      } else {
        const otherSpots = spots.filter((s) => s.id !== currentSpotRef.current.id);
        chosenSpot = otherSpots[Math.floor(Math.random() * otherSpots.length)] || getDeskSpot(role);
      }

      currentSpotRef.current = chosenSpot;
      currentDialogue.current = agent.last_action || getRandomDialogue(role, chosenSpot.category);
      pathQueueRef.current = buildPathToSpot(groupRef.current.position, chosenSpot);
    }

    const currentX = groupRef.current.position.x;
    const currentY = groupRef.current.position.y;
    const currentZ = groupRef.current.position.z;
    const targetSpot = currentSpotRef.current;

    let isWalking = false;

    if (pathQueueRef.current.length > 0) {
      isWalking = true;
      const wp = pathQueueRef.current[0];
      const dx = wp.x - currentX;
      const dy = wp.y - currentY;
      const dz = wp.z - currentZ;

      // Update walk animation phase
      walkPhase.current += delta * 9.5;

      if (wp.isStair) {
        // --- PHYSICAL STAIR CLIMBING & DESCENDING ---
        const dist3D = Math.hypot(dx, dy, dz);
        const stairSpeed = WALK_SPEED * 0.9;
        const step = Math.min(dist3D, stairSpeed * delta);

        if (dist3D > 0.001) {
          groupRef.current.position.x += (dx / dist3D) * step;
          groupRef.current.position.y += (dy / dist3D) * step;
          groupRef.current.position.z += (dz / dist3D) * step;
        }

        const climbingUp = dy >= 0;
        const stairHeading = climbingUp ? Math.PI : 0;
        groupRef.current.rotation.y = lerpAngle(
          groupRef.current.rotation.y,
          stairHeading,
          delta * 10
        );

        // Apply organic stair walk pose
        applyPose(bones, walkPose(walkPhase.current, true, climbingUp), delta);
        bones.mug.visible = false;

        if (dist3D < 0.18) {
          pathQueueRef.current.shift();
        }
      } else {
        // --- FLAT FLOOR WALKING ---
        const distXZ = Math.hypot(dx, dz);
        const step = Math.min(distXZ, WALK_SPEED * delta);

        if (distXZ > 0.001) {
          groupRef.current.position.x += (dx / distXZ) * step;
          groupRef.current.position.z += (dz / distXZ) * step;
        }

        groupRef.current.position.y = lerpVal(currentY, wp.y, delta * 10);

        if (distXZ > 0.05) {
          const travelHeading = Math.atan2(dx, dz);
          groupRef.current.rotation.y = lerpAngle(
            groupRef.current.rotation.y,
            travelHeading,
            delta * 10
          );
        }

        // Apply natural flat floor walk pose
        applyPose(bones, walkPose(walkPhase.current, false), delta);
        bones.mug.visible = false;

        if (distXZ < 0.14) {
          pathQueueRef.current.shift();
        }
      }
    } else {
      // --- ARRIVED AT FINAL DESTINATION SPOT ---
      groupRef.current.position.x = targetSpot.x;
      groupRef.current.position.z = targetSpot.z;
      // Floor height: Floor 1 is 0.0, Floor 2 is 3.6 (sitting drop is handled inside the skeleton by hipsY)
      const floorLevelY = targetSpot.floor === 2 ? 3.6 : 0.0;
      groupRef.current.position.y = lerpVal(currentY, floorLevelY, delta * 8);

      groupRef.current.rotation.y = lerpAngle(
        groupRef.current.rotation.y,
        targetSpot.faceAngle,
        delta * 6
      );

      // Select realistic situational pose based on spot category
      let spotPoseData: PoseData;
      if (targetSpot.category === "desk") {
        spotPoseData = working ? typePose(timeSec, randomSeed.current) : readPose(timeSec, randomSeed.current);
        bones.mug.visible = false;
      } else if (targetSpot.category === "meeting") {
        spotPoseData = meetingPose(timeSec, randomSeed.current);
        bones.mug.visible = false;
      } else if (targetSpot.category === "sofa") {
        spotPoseData = sofaPose(timeSec);
        bones.mug.visible = false;
      } else if (targetSpot.category === "coffee" || targetSpot.category === "waterCooler") {
        spotPoseData = coffeePose(timeSec);
        bones.mug.visible = true; // Hold coffee cup
      } else if (targetSpot.category === "balcony" || targetSpot.category === "window") {
        spotPoseData = balconyPose(timeSec);
        bones.mug.visible = false;
      } else if (targetSpot.category === "whiteboard") {
        spotPoseData = whiteboardPose(timeSec);
        bones.mug.visible = false;
      } else {
        spotPoseData = readPose(timeSec, randomSeed.current);
        bones.mug.visible = false;
      }

      applyPose(bones, spotPoseData, delta);
    }

    // Protection check against non-finite or rogue positions
    if (!Number.isFinite(groupRef.current.position.y) || Math.abs(groupRef.current.position.y) > 20) {
      const fallbackY = targetSpot.floor === 2 ? 3.6 : 0.0;
      groupRef.current.position.set(targetSpot.x, fallbackY, targetSpot.z);
      groupRef.current.rotation.y = targetSpot.faceAngle;
    }

    // Role ring - stays anchored 2cm above the floor under the character
    if (ringRef.current) {
      const pulse = 1 + Math.sin(now / 240) * 0.08;
      const baseScale = hovered ? 1.25 : 1.0;
      ringRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
      ringRef.current.position.y = 0.02;
    }

    // Sync live coordinates to shared ref for HUD labels
    if (livePositionsRef && livePositionsRef.current) {
      livePositionsRef.current[role] = {
        x: groupRef.current.position.x,
        z: groupRef.current.position.z,
        y: groupRef.current.position.y,
        rotationY: groupRef.current.rotation.y,
        isWalking,
        bubbleText: currentDialogue.current,
      };
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(agent);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Procedural Character Hierarchy */}
      <primitive object={bones.root} />

      {/* Glowing Neon Role Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.35, 0.52, 32]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={hovered ? 1.0 : 0.45}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}
