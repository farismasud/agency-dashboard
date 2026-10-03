"use client";

import { useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { AgentState } from "@/lib/types";
import { ROLE_RING_COLOR, DEFAULT_RING_COLOR, TOOL_LEAD_STYLE, floorY } from "./layout";
import {
  buildPath,
  claimSpot,
  getDeskSpot,
  getRandomDialogue,
  getSpotById,
  pickBreakSpot,
  pickNextSpot,
  type NavWaypoint,
  type OfficeSpot,
} from "./AgentBehavior";
import type { AgentDirective } from "./activity";

const WALK_SPEED = 2.4; // world units per second
const SLEEP_AFTER_MS = 5 * 60_000; // idle this long → nap

export type ViewFloor = "all" | 1 | 2;

export interface LiveAgentStatus {
  x: number;
  z: number;
  y: number;
  rotationY: number;
  isWalking: boolean;
  bubbleText: string;
  spotLabel: string;
  hidden: boolean;
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

// Same silhouette as the Claude lead, tinted per tool so leads read apart at a glance.
const toolLeadLook = (shirt: string): PersonLookConfig => ({
  shirt,
  pants: "#111827",
  skin: "#d6a07a",
  hair: "#0c0a09",
  hairStyle: "short",
  headphones: true,
});

export const ROLE_LOOKS: Record<string, PersonLookConfig> = {
  ...Object.fromEntries(Object.entries(TOOL_LEAD_STYLE).map(([role, style]) => [role, toolLeadLook(style.color)])),
  // Main Claude session
  lead: {
    shirt: "#1f2937", // Charcoal blazer
    pants: "#111827",
    skin: "#d6a07a",
    hair: "#0c0a09",
    hairStyle: "side",
    tie: true,
  },
  // Any subagent type without its own look (Explore, general-purpose...)
  guest: {
    shirt: "#64748b",
    pants: "#334155",
    skin: "#e0b08a",
    hair: "#3b2012",
    hairStyle: "short",
    backpack: true,
  },
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
  const handMeshes: THREE.Mesh[] = [];

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
    handMeshes.push(h);
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

  return { root, hips, spine, head, sh, el, hand: [handMeshes[0], handMeshes[1]], hip, knee, mug };
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

function tvPose(t: number, seed: number): PoseData {
  // Every so often the whole sofa reacts to the match on screen.
  const cheer = Math.sin(t * 0.45 + seed) > 0.92;
  return {
    ...sofaPose(t),
    spineX: cheer ? 0.12 : -0.2,
    headX: cheer ? -0.2 : -0.04,
    headY: 0,
    rShX: cheer ? -2.6 : -0.45,
    rShZ: cheer ? -0.1 : -0.25,
    rElX: cheer ? -0.2 : -0.95,
  };
}

function gamePose(t: number, seed: number): PoseData {
  const swing = Math.sin(t * 6 + seed);
  return {
    hipsY: 0.86,
    lHipX: -0.12,
    rHipX: -0.12,
    lKneeX: 0.2,
    rKneeX: 0.2,
    spineX: 0.18,
    headX: 0.05,
    lShX: -0.9,
    lShZ: 0.2,
    lElX: -0.9,
    rShX: -0.9 + swing * 0.4,
    rShZ: -0.3 + swing * 0.2,
    rElX: -0.7,
  };
}

function talkPose(t: number, seed: number): PoseData {
  const gesture = Math.sin(t * 2.2 + seed);
  return {
    hipsY: 0.9,
    headX: 0.04,
    headY: Math.sin(t * 0.6 + seed) * 0.15,
    lShX: 0.05,
    lElX: -0.2,
    rShX: -0.5 + gesture * 0.15,
    rShZ: -0.2,
    rElX: -1.2 + gesture * 0.2,
  };
}

function bookPose(t: number): PoseData {
  return {
    hipsY: 0.9,
    headX: 0.35,
    headY: Math.sin(t * 0.4) * 0.1,
    lShX: -0.6,
    lShZ: 0.15,
    lElX: -1.3,
    rShX: -0.6,
    rShZ: -0.15,
    rElX: -1.3,
  };
}

function sleepPose(t: number): PoseData {
  const breath = Math.sin(t * 1.2) * 0.03;
  return {
    ...sofaPose(t),
    spineX: -0.35 + breath,
    headX: 0.45,
    headZ: 0.35,
    lShX: -0.2,
    lElX: -0.6,
    rShX: -0.2,
    rElX: -0.6,
  };
}

function poseForSpot(spot: OfficeSpot, working: boolean, t: number, seed: number): PoseData {
  switch (spot.category) {
    case "desk":
      return working ? typePose(t, seed) : readPose(t, seed);
    case "meeting":
      return meetingPose(t, seed);
    case "sofa":
      return sofaPose(t);
    case "tv":
      return tvPose(t, seed);
    case "coffee":
    case "waterCooler":
      return coffeePose(t);
    case "balcony":
    case "window":
      return balconyPose(t);
    case "whiteboard":
    case "server":
      return whiteboardPose(t);
    case "game":
      return gamePose(t, seed);
    case "bookshelf":
      return bookPose(t);
    default:
      return talkPose(t, seed);
  }
}

export function CharacterModel({
  agent,
  onSelect,
  livePositionsRef,
  viewFloor,
  directive,
}: {
  agent: AgentState;
  directive?: AgentDirective;
  onSelect?: (agent: AgentState) => void;
  livePositionsRef?: React.MutableRefObject<Record<string, LiveAgentStatus>>;
  viewFloor: ViewFloor;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const role = agent.subagent_type;
  const ringColor = ROLE_RING_COLOR[role] ?? DEFAULT_RING_COLOR;
  const working = agent.status === "working";
  const lookConfig = ROLE_LOOKS[role] ?? ROLE_LOOKS.guest;

  const bones = useMemo(() => buildPerson(lookConfig), [lookConfig]);

  const currentSpotRef = useRef<OfficeSpot>(getDeskSpot(role));
  const pathQueueRef = useRef<NavWaypoint[]>([]);
  const currentDialogue = useRef<string>(agent.last_action || "Fokus kerja...");
  const nextChangeTime = useRef<number>(0); // set on mount
  const walkPhase = useRef<number>(0);
  const randomSeed = useRef<number>(0);
  const asleep = useRef(false);

  // Queue a walk to `spot`. Any leg already in progress is finished first so the
  // character always leaves from a known spot and stays on the corridor graph.
  const goTo = (spot: OfficeSpot) => {
    const from = currentSpotRef.current;
    if (from.id === spot.id) return;
    pathQueueRef.current = [...pathQueueRef.current, ...buildPath(from, spot)];
    currentSpotRef.current = spot;
    claimSpot(role, spot);
  };

  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const desk = getDeskSpot(role);
    groupRef.current.position.set(desk.x, floorY(desk.floor), desk.z);
    groupRef.current.rotation.y = desk.faceAngle;
    currentSpotRef.current = desk;
    pathQueueRef.current = [];
    claimSpot(role, desk);
    nextChangeTime.current = performance.now() + 6000 + Math.random() * 10000;
    randomSeed.current = Math.random() * 100;
  }, [role]);

  // Live backend activity: walk to where the work happens and hold there a while.
  useEffect(() => {
    if (!directive) return;
    currentDialogue.current = directive.text;
    const spot = directive.spotId === "break" ? pickBreakSpot(role) : getSpotById(role, directive.spotId);
    if (spot) goTo(spot);
    nextChangeTime.current = performance.now() + 20000;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directive?.key, role]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    const delta = Math.min(rawDelta, 0.08);
    const now = performance.now();
    const timeSec = now / 1000;

    // Long-idle agents nap on a sofa / beanbag until the next event wakes them.
    const sleepy = !working && Date.now() - Date.parse(agent.last_event_at) > SLEEP_AFTER_MS;
    if (sleepy && !asleep.current && pathQueueRef.current.length === 0) {
      asleep.current = true;
      currentDialogue.current = "💤 Zzz...";
      goTo(pickBreakSpot(role, ["sofa", "tv"]));
    } else if (!sleepy) {
      asleep.current = false;
    }

    if (!asleep.current && now > nextChangeTime.current && pathQueueRef.current.length === 0) {
      nextChangeTime.current = now + 12000 + Math.random() * 16000;
      const next = pickNextSpot(role, working, currentSpotRef.current);
      currentDialogue.current =
        next.category === "desk" && agent.last_action
          ? agent.last_action
          : getRandomDialogue(role, next.talkTo ?? next.category);
      goTo(next);
    }

    const targetSpot = currentSpotRef.current;
    const isWalking = pathQueueRef.current.length > 0;

    if (isWalking) {
      const wp = pathQueueRef.current[0];
      const dx = wp.x - group.position.x;
      const dy = wp.y - group.position.y;
      const dz = wp.z - group.position.z;
      walkPhase.current += delta * 9.5;

      if (wp.isStair) {
        const dist3D = Math.hypot(dx, dy, dz);
        const step = Math.min(dist3D, WALK_SPEED * 0.9 * delta);
        if (dist3D > 0.001) {
          group.position.x += (dx / dist3D) * step;
          group.position.y += (dy / dist3D) * step;
          group.position.z += (dz / dist3D) * step;
        }
        const climbingUp = dy >= 0;
        group.rotation.y = lerpAngle(group.rotation.y, climbingUp ? Math.PI : 0, delta * 10);
        applyPose(bones, walkPose(walkPhase.current, true, climbingUp), delta);
        if (dist3D < 0.12) pathQueueRef.current.shift();
      } else {
        const distXZ = Math.hypot(dx, dz);
        const step = Math.min(distXZ, WALK_SPEED * delta);
        if (distXZ > 0.001) {
          group.position.x += (dx / distXZ) * step;
          group.position.z += (dz / distXZ) * step;
        }
        group.position.y = lerpVal(group.position.y, wp.y, delta * 10);
        if (distXZ > 0.05) {
          group.rotation.y = lerpAngle(group.rotation.y, Math.atan2(dx, dz), delta * 10);
        }
        applyPose(bones, walkPose(walkPhase.current, false), delta);
        if (distXZ < 0.1) pathQueueRef.current.shift();
      }
      bones.mug.visible = false;
    } else {
      group.position.x = lerpVal(group.position.x, targetSpot.x, delta * 8);
      group.position.z = lerpVal(group.position.z, targetSpot.z, delta * 8);
      group.position.y = lerpVal(group.position.y, floorY(targetSpot.floor), delta * 8);
      group.rotation.y = lerpAngle(group.rotation.y, targetSpot.faceAngle, delta * 6);
      const napping = asleep.current && (targetSpot.category === "sofa" || targetSpot.category === "tv");
      applyPose(bones, napping ? sleepPose(timeSec) : poseForSpot(targetSpot, working, timeSec, randomSeed.current), delta);
      bones.mug.visible = targetSpot.category === "coffee" || targetSpot.category === "waterCooler";
    }

    if (!Number.isFinite(group.position.y) || Math.abs(group.position.y) > 20) {
      pathQueueRef.current = [];
      group.position.set(targetSpot.x, floorY(targetSpot.floor), targetSpot.z);
      group.rotation.y = targetSpot.faceAngle;
    }

    const upstairs = group.position.y > 1.8;
    const hidden = viewFloor === 1 && upstairs;
    group.visible = !hidden;
    // Whenever Lt.2 is shown its slab covers Lt.1, so Lt.1 labels would float over Lt.2.
    const labelHidden = viewFloor === 1 ? upstairs : !upstairs;

    if (ringRef.current) {
      const pulse = 1 + Math.sin(now / 240) * 0.08;
      const s = (hovered ? 1.25 : 1) * pulse;
      ringRef.current.scale.set(s, s, 1);
    }

    if (livePositionsRef?.current) {
      livePositionsRef.current[role] = {
        x: group.position.x,
        z: group.position.z,
        y: group.position.y,
        rotationY: group.rotation.y,
        isWalking,
        bubbleText: isWalking ? `🚶 Menuju ${targetSpot.label}` : currentDialogue.current,
        spotLabel: targetSpot.label,
        hidden: labelHidden,
      };
    }
  });

  // Hidden agents (upper floor while viewing Lt.1) must not swallow clicks.
  const isInteractive = () => groupRef.current?.visible !== false;

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        if (!isInteractive()) return;
        e.stopPropagation();
        onSelect?.(agent);
      }}
      onPointerOver={(e) => {
        if (!isInteractive()) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={bones.root} />
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.35, 0.5, 40]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} transparent opacity={hovered ? 0.95 : 0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}
