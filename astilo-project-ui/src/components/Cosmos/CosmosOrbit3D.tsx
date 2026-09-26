import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Vector {
  jd: number;
  x: number;
  y: number;
  z: number;
}

interface Body {
  command: string;
  label: string;
  color: string;
  size?: number;
}

interface Props {
  data: Record<string, Vector[]>;
  bodies: Body[];
  submittedBodies: string[];
  /** Fractional day index (e.g. 3.4 = 40% between step 3 and 4) — lets the
   * mesh glide between real Horizons samples instead of snapping to them. */
  progress: number;
  activeBody?: string | null;
  onBodyClick?: (command: string) => void;
}

const RECENT_TRAIL_POINTS = 16;

/** Plain imperative three.js, matching Library/BookOpening3D.tsx's
 * approach — @react-three/fiber's global JSX augmentation caused build
 * conflicts elsewhere in this project, so 3D scenes here stay outside
 * React's render tree, driven via a mount ref + their own animation loop.
 *
 * Axis convention: Horizons vectors are heliocentric-ecliptic (x, y in the
 * ecliptic plane, z perpendicular to it). Three.js is Y-up, so ecliptic
 * (x, y, z) maps to scene (x, z, y) — z becomes the vertical axis. */
// Inner solar system (out to just past Jupiter) gets a stable, evenly-spaced
// band regardless of what else is loaded; anything farther out (a comet, a
// spacecraft like Voyager 1 at ~160 AU) is compressed asymptotically toward
// TARGET_RADIUS instead of sharing one global scale with the inner planets
// — a single sqrt/log scale across the whole range crushes Mercury..Jupiter
// into a tiny cluster the moment one distant body is added.
const INNER_AU = 5.5; // just beyond Jupiter's real ~5.2 AU orbit
const INNER_RADIUS = 7; // scene units the inner band spans
const TARGET_RADIUS = 9; // scene units; asymptotic cap for far-flung bodies
const CAMERA_FOV = 55;
const CAMERA_DIST = 21; // keeps TARGET_RADIUS inside the frustum, see below

function vectorAt(series: Vector[], progress: number): Vector {
  if (series.length === 0) return { jd: 0, x: 0, y: 0, z: 0 };
  const i0 = Math.max(0, Math.min(series.length - 1, Math.floor(progress)));
  const i1 = Math.min(series.length - 1, i0 + 1);
  const t = progress - i0;
  const a = series[i0];
  const b = series[i1];
  return { jd: a.jd, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

/** Radially rescales a heliocentric vector: linear out to INNER_AU, then an
 * inverse falloff beyond it that approaches TARGET_RADIUS but never reaches
 * it, so the scene always fits regardless of how far out a loaded body is.
 * Direction is preserved; only distance is rescaled. */
function toScene(v: Vector): THREE.Vector3 {
  const rAu = Math.hypot(v.x, v.y, v.z);
  if (rAu < 1e-9) return new THREE.Vector3(0, 0, 0);
  const compressed =
    rAu <= INNER_AU
      ? (rAu / INNER_AU) * INNER_RADIUS
      : INNER_RADIUS + (TARGET_RADIUS - INNER_RADIUS) * (1 - INNER_AU / rAu);
  const f = compressed / rAu;
  return new THREE.Vector3(v.x * f, v.z * f, v.y * f);
}

function makeReferenceRings(): THREE.Group {
  const group = new THREE.Group();
  const radii = [0.25, 0.5, 0.75, 1].map((f) => f * INNER_RADIUS).concat(TARGET_RADIUS);
  radii.forEach((r) => {
    const segments = 128;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x8ca0ff, transparent: true, opacity: 0.1 });
    group.add(new THREE.LineLoop(geom, mat));
  });
  return group;
}

function makeStarfield(): THREE.Points {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.75 });
  return new THREE.Points(geom, mat);
}

function makeGlowSprite(): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,224,160,0.95)");
  grd.addColorStop(0.35, "rgba(255,190,90,0.45)");
  grd.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.4, 2.4, 1);
  return sprite;
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 6, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

const CosmosOrbit3D = ({ data, bodies, submittedBodies, progress, activeBody, onBodyClick }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<Record<string, THREE.Mesh>>({});
  const recentLinesRef = useRef<Record<string, THREE.Line>>({});
  const labelsRef = useRef<Record<string, THREE.Sprite>>({});
  const onBodyClickRef = useRef(onBodyClick);
  onBodyClickRef.current = onBodyClick;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const width = mount.clientWidth || 520;
    const height = width; // square, matches the 2D view's aspect

    // CAMERA_DIST must clear TARGET_RADIUS / sin(FOV/2) so the outer-edge
    // ring (and anything asymptotically approaching it) stays inside the
    // frustum: 9 / sin(27.5deg) ≈ 19.5, so 21 leaves a safety margin.
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.01, CAMERA_DIST * 8);
    const camDir = new THREE.Vector3(0.55, 0.42, 0.7).normalize();
    camera.position.copy(camDir.multiplyScalar(CAMERA_DIST));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(makeStarfield());
    scene.add(makeReferenceRings());

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    scene.add(sun);
    scene.add(makeGlowSprite());
    scene.add(new THREE.PointLight(0xfff4de, 3.6, 0, 0.2));
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    meshesRef.current = {};
    recentLinesRef.current = {};
    labelsRef.current = {};

    submittedBodies.forEach((command) => {
      const body = bodies.find((b) => b.command === command);
      const series = data[command] ?? [];
      if (!body || series.length === 0) return;

      const points = series.map((v) => toScene(v));
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(points);
      const orbitLine = new THREE.Line(orbitGeom, new THREE.LineBasicMaterial({ color: body.color, opacity: 0.35, transparent: true }));
      scene.add(orbitLine);

      const recentGeom = new THREE.BufferGeometry().setFromPoints([points[0], points[0]]);
      const recentLine = new THREE.Line(recentGeom, new THREE.LineBasicMaterial({ color: body.color, opacity: 0.9, transparent: true, linewidth: 2 }));
      scene.add(recentLine);
      recentLinesRef.current[command] = recentLine;

      // body.size is a display multiplier shared with the 2D SVG view (where
      // it scales pixel radii, roughly 0.7-2.6) — scaled down here to a
      // sensible world-space sphere radius, kept well under the gaps between
      // the compressed inner-planet positions so neighbors don't overlap.
      const radius = (body.size ?? 1) * 0.11;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 20, 20),
        new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.7, metalness: 0.05 })
      );
      mesh.userData.baseRadius = radius;
      mesh.userData.command = command;
      scene.add(mesh);
      meshesRef.current[command] = mesh;

      const label = makeLabelSprite(body.label, body.color);
      scene.add(label);
      labelsRef.current[command] = label;
    });

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || 520;
      camera.aspect = w / w;
      camera.updateProjectionMatrix();
      renderer.setSize(w, w);
    };
    window.addEventListener("resize", onResize);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Object.values(meshesRef.current));
      if (hits.length > 0 && onBodyClickRef.current) {
        onBodyClickRef.current(hits[0].object.userData.command as string);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      meshesRef.current = {};
      recentLinesRef.current = {};
      labelsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, bodies, submittedBodies]);

  // Move each body along its ephemeris, interpolating between the nearest
  // two real samples so playback glides instead of snapping per step.
  useEffect(() => {
    submittedBodies.forEach((command) => {
      const series = data[command] ?? [];
      const mesh = meshesRef.current[command];
      if (!mesh || series.length === 0) return;

      const here = vectorAt(series, progress);
      const scenePos = toScene(here);
      mesh.position.copy(scenePos);

      const isActive = command === activeBody;
      mesh.scale.setScalar(isActive ? 1.6 : 1);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.copy(isActive ? mat.color : new THREE.Color(0x000000));
      mat.emissiveIntensity = isActive ? 0.5 : 0;

      const label = labelsRef.current[command];
      if (label) label.position.set(scenePos.x, scenePos.y + 0.3, scenePos.z);

      const recentLine = recentLinesRef.current[command];
      if (recentLine) {
        const startIdx = Math.max(0, Math.floor(progress) - RECENT_TRAIL_POINTS);
        const endIdx = Math.floor(progress);
        const recentPoints = series.slice(startIdx, endIdx + 1).map((v) => toScene(v));
        recentPoints.push(scenePos);
        recentLine.geometry.dispose();
        recentLine.geometry = new THREE.BufferGeometry().setFromPoints(recentPoints);
      }
    });
  }, [progress, data, submittedBodies, activeBody]);

  return <div ref={mountRef} style={{ width: "100%", maxWidth: 520, aspectRatio: 1 }} />;
};

export default CosmosOrbit3D;
