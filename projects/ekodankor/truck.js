// truck.js — Three.js side-view garbage truck driven by scroll progress.
// Tries to load model/scene.gltf; if missing, builds a stylized fallback truck.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const COLOR_BG = 0xf5f2ec;       // milky white page bg
const COLOR_GREEN = 0x1a3a2a;    // brand dark green
const COLOR_GREEN_LIGHT = 0x2a5a3a;
const COLOR_AMBER = 0xe8a020;    // brand amber
const COLOR_ROAD = 0x1a1a17;
const COLOR_METAL = 0x9a9a92;
const COLOR_TIRE = 0x141414;

const canvas = document.getElementById("truck-canvas");
const stage = document.getElementById("truck-stage");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = null;

// Camera: orthographic for consistent side view across viewports.
const aspect = stage.clientWidth / stage.clientHeight;
const viewSize = 6.2;
const camera = new THREE.OrthographicCamera(
  (-viewSize * aspect) / 2,
  (viewSize * aspect) / 2,
  viewSize / 2,
  -viewSize / 2,
  0.1,
  100
);
camera.position.set(0, 1.4, 12);
camera.lookAt(0, 1.0, 0);

// ----- Lights -----
const ambient = new THREE.AmbientLight(0xfff4e0, 0.55);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff1d8, 1.35);
keyLight.position.set(5, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -10;
keyLight.shadow.camera.right = 10;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xe8a020, 0.6);
rimLight.position.set(-6, 4, -4);
scene.add(rimLight);

const fill = new THREE.HemisphereLight(0xfff5e0, 0x40402a, 0.35);
scene.add(fill);

// ----- Road line -----
const roadGroup = new THREE.Group();
scene.add(roadGroup);

const roadGeo = new THREE.PlaneGeometry(60, 0.06);
const roadMat = new THREE.MeshBasicMaterial({ color: COLOR_GREEN });
const roadLine = new THREE.Mesh(roadGeo, roadMat);
roadLine.position.set(0, -0.001, 0);
roadLine.rotation.x = -Math.PI / 2;
roadGroup.add(roadLine);

// Dashed center markings on the road (subtle)
const dashGroup = new THREE.Group();
const dashGeo = new THREE.PlaneGeometry(0.5, 0.04);
const dashMat = new THREE.MeshBasicMaterial({
  color: COLOR_AMBER,
  transparent: true,
  opacity: 0.45,
});
for (let i = -30; i <= 30; i += 1.6) {
  const d = new THREE.Mesh(dashGeo, dashMat);
  d.position.set(i, 0.002, -0.18);
  d.rotation.x = -Math.PI / 2;
  dashGroup.add(d);
}
roadGroup.add(dashGroup);

// Soft shadow strip beneath truck (always-visible contact)
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.18,
});
const shadowMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(4.5, 0.55),
  shadowMat
);
shadowMesh.rotation.x = -Math.PI / 2;
shadowMesh.position.y = 0.005;
scene.add(shadowMesh);

// ----- Truck container -----
const truck = new THREE.Group();
scene.add(truck);

const wheels = []; // collected for rotation

// ----- Fallback truck builder -----
function buildFallbackTruck() {
  const t = new THREE.Group();

  const stdMat = (color, rough = 0.55, metal = 0.15) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
    });

  // --- Chassis ---
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.18, 1.1),
    stdMat(0x222222, 0.7, 0.3)
  );
  chassis.position.set(0, 0.55, 0);
  chassis.castShadow = true;
  t.add(chassis);

  // --- Cab ---
  const cabBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.15, 1.05),
    stdMat(COLOR_GREEN, 0.45, 0.25)
  );
  cabBody.position.set(-1.55, 1.22, 0);
  cabBody.castShadow = true;
  t.add(cabBody);

  // Cab roof bevel detail
  const cabTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.08, 1.0),
    stdMat(COLOR_GREEN_LIGHT, 0.5, 0.2)
  );
  cabTop.position.set(-1.55, 1.83, 0);
  t.add(cabTop);

  // Front nose / hood
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.65, 1.02),
    stdMat(COLOR_GREEN, 0.5, 0.25)
  );
  hood.position.set(-2.3, 0.95, 0);
  hood.castShadow = true;
  t.add(hood);

  // Bumper
  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.28, 1.08),
    stdMat(0x111111, 0.6, 0.4)
  );
  bumper.position.set(-2.65, 0.66, 0);
  t.add(bumper);

  // Headlight
  const headlight = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.18, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xfff2c8,
      emissive: 0xe8a020,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    })
  );
  headlight.position.set(-2.7, 0.86, 0.42);
  t.add(headlight);
  const headlight2 = headlight.clone();
  headlight2.position.z = -0.42;
  t.add(headlight2);

  // Windshield
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.55, 1.0),
    new THREE.MeshStandardMaterial({
      color: 0x88aabb,
      roughness: 0.15,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    })
  );
  windshield.position.set(-1.95, 1.45, 0);
  t.add(windshield);

  // Side window (cab)
  const sideWin = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.55, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x88aabb,
      roughness: 0.2,
      metalness: 0.6,
    })
  );
  sideWin.position.set(-1.55, 1.45, 0.531);
  t.add(sideWin);
  const sideWin2 = sideWin.clone();
  sideWin2.position.z = -0.531;
  t.add(sideWin2);

  // --- Container body (the trash compactor) ---
  const container = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 1.55, 1.18),
    stdMat(COLOR_GREEN, 0.55, 0.2)
  );
  container.position.set(0.55, 1.45, 0);
  container.castShadow = true;
  t.add(container);

  // Top edge accent
  const containerTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.72, 0.06, 1.2),
    stdMat(COLOR_GREEN_LIGHT, 0.5, 0.3)
  );
  containerTop.position.set(0.55, 2.25, 0);
  t.add(containerTop);

  // Amber side stripe (horizontal band, brand accent)
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.71, 0.13, 1.19),
    stdMat(COLOR_AMBER, 0.45, 0.2)
  );
  stripe.position.set(0.55, 1.78, 0);
  t.add(stripe);

  // Vertical ribs on container side (industrial detail)
  for (let i = -1; i <= 1; i++) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.45, 1.2),
      stdMat(COLOR_GREEN_LIGHT, 0.5, 0.2)
    );
    rib.position.set(0.55 + i * 0.85, 1.45, 0);
    t.add(rib);
  }

  // Rear loader hopper (slanted back)
  const hopper = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.25, 1.16),
    stdMat(COLOR_GREEN_LIGHT, 0.55, 0.25)
  );
  hopper.position.set(2.2, 1.3, 0);
  hopper.rotation.z = -0.18;
  t.add(hopper);

  // Rear lift arm
  const liftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.85, 0.08),
    stdMat(COLOR_METAL, 0.4, 0.7)
  );
  liftArm.position.set(2.5, 1.35, 0.45);
  liftArm.rotation.z = 0.3;
  t.add(liftArm);

  // Rear taillight
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.16, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xff5520,
      emissive: 0xff3010,
      emissiveIntensity: 0.5,
    })
  );
  tail.position.set(2.55, 0.92, 0.44);
  t.add(tail);
  const tail2 = tail.clone();
  tail2.position.z = -0.44;
  t.add(tail2);

  // --- Wheels ---
  const wheelRadius = 0.42;
  const wheelGeo = new THREE.CylinderGeometry(
    wheelRadius,
    wheelRadius,
    0.32,
    24
  );
  const wheelMat = stdMat(COLOR_TIRE, 0.85, 0.05);
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.34, 16);
  const hubMat = stdMat(COLOR_METAL, 0.4, 0.7);

  const wheelPositions = [
    [-1.85, 0.42, 0.55],
    [-1.85, 0.42, -0.55],
    [0.4, 0.42, 0.55],
    [0.4, 0.42, -0.55],
    [1.3, 0.42, 0.55],
    [1.3, 0.42, -0.55],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const group = new THREE.Group();
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;

    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;

    // hub spokes (3 cross bars) — these spin visibly so wheel rotation reads
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, wheelRadius * 1.6, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 })
      );
      spoke.rotation.z = (i * Math.PI) / 3;
      group.add(spoke);
    }

    group.add(wheel);
    group.add(hub);
    group.position.set(x, y, z);
    t.add(group);
    wheels.push(group);
  });

  // Mirrors
  const mirrorMat = stdMat(COLOR_GREEN_LIGHT, 0.4, 0.5);
  const mirror = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.32, 0.18),
    mirrorMat
  );
  mirror.position.set(-2.05, 1.55, 0.65);
  t.add(mirror);
  const mirror2 = mirror.clone();
  mirror2.position.z = -0.65;
  t.add(mirror2);

  // Door handle / panel split (subtle line on cab)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.04, 1.06),
    stdMat(COLOR_GREEN_LIGHT, 0.4, 0.2)
  );
  door.position.set(-1.55, 0.92, 0);
  t.add(door);

  return t;
}

// ----- Try to load GLTF model first -----
function attachWheelsFromModel(root) {
  // Only collect actual MESH nodes — Group nodes have off-center pivots
  // and cause orbiting when rotated directly.
  root.traverse((child) => {
    if (!child.isMesh) return;
    const n = (child.name || "").toLowerCase();
    if (
      n.includes("wheel") ||
      n.includes("tire") ||
      n.includes("tyre") ||
      n.includes("koło") ||
      n.includes("kolo")
    ) {
      // Shift geometry to local origin so rotation spins in-place
      child.geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      child.geometry.boundingBox.getCenter(center);
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.position.x += center.x;
      child.position.y += center.y;
      child.position.z += center.z;
      wheels.push(child);
    }
  });
  console.log("[truck] wheel meshes found:", wheels.length);
}

let truckLoaded = false;

const loader = new GLTFLoader();
loader.load(
  "model/garbage_truck.glb",
  (gltf) => {
    const model = gltf.scene;

    // Log node names so we can identify wheels in the console
    console.log("[truck] model nodes:");
    model.traverse((c) => { if (c.name) console.log(" ", c.name); });

    // Rotate to face sideways (profile view, driving left→right)
    // Most models face +Z or -Z; rotate 90° around Y to get side view
    model.rotation.y = Math.PI / 2;

    // Scale to fit ~5 units wide, then re-measure after rotation
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z);
    const scale = 5.0 / Math.max(longest, 0.001);
    model.scale.setScalar(scale);

    // Center horizontally, rest on road
    const box2 = new THREE.Box3().setFromObject(model);
    const center = box2.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box2.min.y;

    model.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = false;
      }
    });

    attachWheelsFromModel(model);
    truck.add(model);
    truckLoaded = true;
  },
  undefined,
  (err) => {
    console.warn("[truck] GLB load failed, using fallback:", err);
    const fallback = buildFallbackTruck();
    truck.add(fallback);
    truckLoaded = true;
  }
);

// ----- Sizing -----
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  const a = w / h;
  camera.left = (-viewSize * a) / 2;
  camera.right = (viewSize * a) / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

// ----- Scroll progress driver -----
let scrollProgress = 0;
let targetProgress = 0;

function computeProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}
targetProgress = computeProgress();
scrollProgress = targetProgress;

window.addEventListener(
  "scroll",
  () => {
    targetProgress = computeProgress();
  },
  { passive: true }
);

// ----- Animation loop -----
const clock = new THREE.Clock();
// Truck enters from left edge and exits right edge.
// Using a wide range so entry/exit feel natural.
const startX = -10;
const endX   =  10;

function animate() {
  const dt = clock.getDelta();
  const t  = clock.getElapsedTime();

  scrollProgress += (targetProgress - scrollProgress) * Math.min(1, dt * 7);

  if (truckLoaded) {
    // Truck completes full journey (left → right → off screen) in first 20% of scroll
    const fastProgress = Math.min(1, scrollProgress * 5);
    const x = startX + (endX - startX) * fastProgress;
    truck.position.x = x;

    // Subtle bob — driving over road bumps
    const bob = Math.sin(t * 4.5) * 0.025 + Math.sin(t * 7.3) * 0.012;
    truck.position.y = bob;

    // Tiny pitch oscillation
    truck.rotation.z = Math.sin(t * 3.1) * 0.004;

    // Shadow follows truck
    shadowMesh.position.x = x;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
