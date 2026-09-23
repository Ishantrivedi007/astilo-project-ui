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
}

interface Props {
  data: Record<string, Vector[]>;
  bodies: Body[];
  submittedBodies: string[];
  dayIndex: number;
}

/** Plain imperative three.js, matching Library/BookOpening3D.tsx's
 * approach — @react-three/fiber's global JSX augmentation caused build
 * conflicts elsewhere in this project, so 3D scenes here stay outside
 * React's render tree, driven via a mount ref + their own animation loop.
 *
 * Axis convention: Horizons vectors are heliocentric-ecliptic (x, y in the
 * ecliptic plane, z perpendicular to it). Three.js is Y-up, so ecliptic
 * (x, y, z) maps to scene (x, z, y) — z becomes the vertical axis. */
const AU_SCALE = 12; // scene units per AU, purely a display scale factor

const CosmosOrbit3D = ({ data, bodies, submittedBodies, dayIndex }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<Record<string, THREE.Mesh>>({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const width = mount.clientWidth || 520;
    const height = width; // square, matches the 2D view's aspect

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(4, 3, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    scene.add(sun);
    scene.add(new THREE.PointLight(0xfff4de, 2.5, 0, 0.3));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    submittedBodies.forEach((command) => {
      const body = bodies.find((b) => b.command === command);
      const series = data[command] ?? [];
      if (!body || series.length === 0) return;

      const points = series.map((v) => new THREE.Vector3(v.x * AU_SCALE, v.z * AU_SCALE, v.y * AU_SCALE));
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(points);
      const orbitLine = new THREE.Line(orbitGeom, new THREE.LineBasicMaterial({ color: body.color, opacity: 0.5, transparent: true }));
      scene.add(orbitLine);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({ color: body.color })
      );
      scene.add(mesh);
      meshesRef.current[command] = mesh;
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

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      meshesRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, bodies, submittedBodies]);

  // Move each body's mesh to the current dayIndex position without
  // rebuilding the whole scene — keeps play/pause/scrub smooth.
  useEffect(() => {
    submittedBodies.forEach((command) => {
      const series = data[command] ?? [];
      const mesh = meshesRef.current[command];
      if (!mesh || series.length === 0) return;
      const v = series[Math.min(dayIndex, series.length - 1)];
      mesh.position.set(v.x * AU_SCALE, v.z * AU_SCALE, v.y * AU_SCALE);
    });
  }, [dayIndex, data, submittedBodies]);

  return <div ref={mountRef} style={{ width: "100%", maxWidth: 520, aspectRatio: 1 }} />;
};

export default CosmosOrbit3D;
