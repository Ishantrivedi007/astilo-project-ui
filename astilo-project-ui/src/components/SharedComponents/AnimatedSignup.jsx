import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import "./Animated.css";

const AnimatedSignupPage = () => {
  const containerRef = useRef();

  useEffect(() => {
    // Three.js Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Abstract Animated Background
    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 128, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2194ce,
      roughness: 0.5,
      metalness: 0.5,
    });
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    // Camera Position
    camera.position.z = 5;

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Abstract Shape Rotation
      torusKnot.rotation.x += 0.01;
      torusKnot.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Clean-up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={containerRef}>
      {/* Signup Form */}
      <div className="signup-form">
        <h2>Sign Up</h2>
        <form>{/* Your form fields here */}</form>
      </div>
    </div>
  );
};

export default AnimatedSignupPage;
