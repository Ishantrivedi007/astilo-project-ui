import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  title: string;
  coverUrl: string | null;
  onDone: () => void;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Builds a canvas texture with the book's title, used when no real cover
 * image is available so the closed book isn't just a flat color. */
const titleTexture = (title: string): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#5a3419");
  grad.addColorStop(1, "#3d2210");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(214, 178, 110, 0.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  ctx.fillStyle = "#e8d6b4";
  ctx.font = "bold 42px Georgia, serif";
  ctx.textAlign = "center";
  const words = title.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > canvas.width - 100 && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = canvas.height / 2 - ((lines.length - 1) * 54) / 2;
  lines.slice(0, 6).forEach((l, i) => ctx.fillText(l, canvas.width / 2, startY + i * 54));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** A real Three.js scene (not a CSS fake), driven imperatively rather than
 * via @react-three/fiber's JSX layer — that package's global JSX type
 * augmentation collided badly with this project's other component types
 * under a full project build, so this stays plain three.js: a closed book
 * on a soft-shadowed surface whose cover eases open on its spine, then
 * hands off to the actual reader. Kept short and skippable. */
const BookOpening3D = ({ title, coverUrl, onDone }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0x0b0704, 6, 14);

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(2.3, 1.5, 3.6);
    camera.lookAt(0.65, -0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x1a0f08, 0.55));
    const keyLight = new THREE.DirectionalLight(0xfff4de, 2.1);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffe3b0, 0.6);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Table surface, soft-shadow catcher under the book.
    const table = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x1c1108, roughness: 0.9 })
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -1.12;
    table.receiveShadow = true;
    scene.add(table);

    const bookGroup = new THREE.Group();
    bookGroup.position.y = -0.05;
    scene.add(bookGroup);

    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xead9b8, roughness: 0.7 });

    // Back cover (fixed).
    const backCover = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.1, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x2f1c0d, roughness: 0.55, metalness: 0.05 })
    );
    backCover.position.set(0.76, 0, -0.07);
    backCover.castShadow = true;
    backCover.receiveShadow = true;
    bookGroup.add(backCover);

    // Page block — several thin layered slabs for a real page-edge look.
    const pageCount = 6;
    for (let i = 0; i < pageCount; i++) {
      const t = i / (pageCount - 1);
      const page = new THREE.Mesh(new THREE.BoxGeometry(1.4 - t * 0.02, 2.0 - t * 0.02, 0.16 / pageCount), edgeMaterial);
      page.position.set(0.78, 0, -0.045 + (i / pageCount) * 0.16);
      page.castShadow = true;
      page.receiveShadow = true;
      bookGroup.add(page);
    }

    // Front cover, hinged at the spine (x=0).
    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3419, roughness: 0.45, metalness: 0.08 });
    const frontCover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.05), coverMaterial);
    frontCover.position.set(0.75, 0, 0);
    frontCover.castShadow = true;
    frontCover.receiveShadow = true;

    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 2.14, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x4a2812, roughness: 0.5 })
    );
    spine.position.set(0, 0, 0.04);

    const hinge = new THREE.Group();
    hinge.position.set(0, 0, 0.07);
    hinge.add(frontCover);
    bookGroup.add(hinge);
    bookGroup.add(spine);

    coverMaterial.map = titleTexture(title);
    coverMaterial.needsUpdate = true;

    if (coverUrl) {
      new THREE.TextureLoader().load(
        coverUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          coverMaterial.map = tex;
          coverMaterial.color.set(0xffffff);
          coverMaterial.needsUpdate = true;
        },
        undefined,
        () => {
          /* keep the generated title texture on failure/CORS block */
        }
      );
    }

    let elapsed = 0;
    let raf = 0;
    let last = performance.now();
    const DURATION = 1.9;
    const startDelay = 0.35;

    const animate = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      bookGroup.rotation.y = Math.sin(performance.now() / 4000) * 0.05;

      if (!doneRef.current) {
        elapsed += delta;
        const t = Math.max(0, Math.min(1, (elapsed - startDelay) / DURATION));
        const eased = easeOutCubic(t);
        hinge.rotation.y = -eased * Math.PI * 0.86;
        if (t >= 1) {
          doneRef.current = true;
          setTimeout(onDone, 300);
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverUrl, title]);

  return (
    <div className="lib-book-3d-wrap" onClick={onDone} title="Click to skip" style={{ position: "relative", cursor: "pointer" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <p style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", color: "rgba(232,214,180,0.6)", fontSize: "0.8rem" }}>
        Opening &ldquo;{title}&rdquo;… (click to skip)
      </p>
    </div>
  );
};

export default BookOpening3D;
