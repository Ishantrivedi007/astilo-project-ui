import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  title: string;
  coverUrl: string | null;
  onDone: () => void;
}

/** A real Three.js scene (not a CSS fake), driven imperatively rather than
 * via @react-three/fiber's JSX layer — that package's global JSX type
 * augmentation collided badly with this project's other component types
 * under a full project build, so this stays plain three.js: a closed book
 * whose cover rotates open on its spine, easing to fully open, then hands
 * off to the actual reader. Kept short and skippable since it's a
 * flourish, not the reading experience itself. */
const BookOpening3D = ({ title, coverUrl, onDone }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(2.6, 0.5, 3.2);
    camera.lookAt(0.6, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    // Back cover (fixed) + pages block
    const backCover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a2313 }));
    backCover.position.set(0.75, 0, -0.05);
    scene.add(backCover);

    const pagesBlock = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.12), new THREE.MeshStandardMaterial({ color: 0xf3e8d3 }));
    pagesBlock.position.set(0.78, 0, 0);
    scene.add(pagesBlock);

    // Front cover, hinged at the spine (x=0)
    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3419 });
    const frontCover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.06), coverMaterial);
    frontCover.position.set(0.75, 0, 0);
    const hinge = new THREE.Group();
    hinge.position.set(0, 0, 0.06);
    hinge.add(frontCover);
    scene.add(hinge);

    if (coverUrl) {
      new THREE.TextureLoader().load(
        coverUrl,
        (tex) => {
          coverMaterial.map = tex;
          coverMaterial.needsUpdate = true;
        },
        undefined,
        () => {
          /* keep the plain cover color on failure/CORS block */
        }
      );
    }

    let angle = 0;
    let raf = 0;
    let last = performance.now();

    const animate = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      if (!doneRef.current) {
        angle = Math.min(angle + delta * 1.4, Math.PI * 0.82);
        hinge.rotation.y = -angle;
        if (angle >= Math.PI * 0.82) {
          doneRef.current = true;
          setTimeout(onDone, 350);
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
  }, [coverUrl]);

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
