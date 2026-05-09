import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

(function () {
  const canvas = document.getElementById('kebab');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.4, 5.6);
  camera.lookAt(0, 0, 0);

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0xffe6c8, 0.45));

  const key = new THREE.DirectionalLight(0xfff0d4, 2.2);
  key.position.set(4, 4, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x6a3818, 0.65);
  fill.position.set(-4, 1.5, -1);
  scene.add(fill);

  const rim = new THREE.PointLight(0xff4a18, 1.4, 14, 1.6);
  rim.position.set(0, -2.4, -1.2);
  scene.add(rim);

  const back = new THREE.DirectionalLight(0x507088, 0.35);
  back.position.set(-1, 2, -4);
  scene.add(back);

  // ── Group that receives all rotation ──
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // ── Load GLTF ──
  const loader = new GLTFLoader();
  loader.load(
    'model/scene.gltf',
    (gltf) => {
      const model = gltf.scene;

      // Auto-center and scale to fit the scene (~3 units tall)
      const box    = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale  = 3.2 / maxDim;

      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      // Collect materials for setSpice tinting
      const mats = [];
      model.traverse((child) => {
        if (!child.isMesh) return;
        const arr = Array.isArray(child.material) ? child.material : [child.material];
        arr.forEach((m) => { m.needsUpdate = true; mats.push(m); });
      });
      window.__kebab._materials = mats;

      modelGroup.add(model);
    },
    undefined,
    (err) => console.error('[kebab] GLTF load error:', err)
  );

  // ── Resize ──
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 720 ? 6.6 : 5.6;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Scroll-driven rotation (1 full turn per ~1000 px) ──
  let scrollRotTarget = 0;
  let scrollRot       = 0;
  let autoRot         = 0;

  function onScroll() {
    scrollRotTarget = window.scrollY * 0.0063;
    const hud = document.getElementById('rot-readout');
    if (hud) {
      const deg = ((scrollRotTarget * 180 / Math.PI) % 360 + 360) % 360;
      hud.textContent = String(Math.round(deg)).padStart(3, '0') + '°';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── API for Tweaks panel ──
  window.__kebab = {
    setSpice(s) {
      (window.__kebab._materials || []).forEach((m) => {
        if      (s === 'charred') m.color.setRGB(0.52, 0.28, 0.14);
        else if (s === 'spicy')   m.color.setRGB(0.95, 0.26, 0.10);
        else                      m.color.setRGB(1,    1,    1   );
        m.needsUpdate = true;
      });
    },
    setSpinSpeed(v) { window.__kebab._spin = v; },
    _spin:      0.003,
    _materials: [],
  };

  // ── Render loop ──
  function tick() {
    scrollRot += (scrollRotTarget - scrollRot) * 0.085;
    autoRot   += window.__kebab._spin;
    const totalRot = autoRot + scrollRot;

    modelGroup.rotation.y = totalRot;
    modelGroup.position.y = Math.sin(performance.now() * 0.001 * 0.55) * 0.04;

    // Flame flicker
    rim.intensity = 1.25 + Math.sin(performance.now() * 0.007) * 0.12
                         + Math.sin(performance.now() * 0.013) * 0.08;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
})();
