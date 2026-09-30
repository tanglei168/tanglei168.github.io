import { publicPath } from "../public-path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AnatomyAssetManager, FIT_SIZE, type LoadedOrgan } from "./loaders";
import { bodyPlacements } from "./body-layout";
import { disposeObject } from "./dispose";
import type { OrganId } from "../anatomy-data";

type Callbacks = {
  onSelect: (id: OrganId | "bones") => void;
  onProgress: (loaded: number, total: number) => void;
  onError: (ids: string[]) => void;
};
export class BodyViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private controls: OrbitControls;
  private assets: AnatomyAssetManager;
  private models = new Map<string, LoadedOrgan>();
  private body = new THREE.Group();
  private skeleton = new THREE.Group();
  private skeletonMeshes: THREE.Mesh[] = [];
  private showSkeleton = true;
  private stage = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private selected = "heart";
  private filter: string[] | null = null;
  private frame = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private rotating = false;
  private isolated = false;
  private dirty = true;
  private down = { x: 0, y: 0 };
  private environment: THREE.WebGLRenderTarget;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(
    private container: HTMLElement,
    private callbacks: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "人体器官整体 3D 视图；拖动旋转，滚轮缩放，方向键旋转，Home 复位",
    );
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 1.1, 20.3);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.1, 0);
    this.controls.enableDamping = !this.reduced;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 25;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = Math.PI - 0.3;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.addEventListener("change", this.markDirty);
    this.scene.add(
      new THREE.AmbientLight(0xffffff, 0.42),
      new THREE.HemisphereLight(0xfff8ee, 0x33252d, 0.72),
    );
    for (const [color, intensity, x, y, z] of [
      [0xfff3e7, 3.5, 4.8, 6.5, 6.8],
      [0xe6ecff, 1.12, -4.5, 1.2, 5.2],
      [0xffb7a5, 1.6, -4, 3.5, -5.5],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(x, y, z);
      this.scene.add(light);
    }
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xe8d8c5);
    const envLight = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff8ed }),
    );
    envLight.position.set(0, 10, 0);
    envLight.rotation.x = Math.PI / 2;
    envScene.add(envLight);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(envScene, 0.5);
    this.scene.environment = this.environment.texture;
    pmrem.dispose();
    disposeObject(envScene);
    this.scene.add(this.body, this.skeleton, this.stage);
    void this.loadBody();
    void this.loadSkeleton();
    this.buildStage();
    // The organ explorer keeps 3 assets; a whole-body assembly needs all 8 together.
    this.assets = new AnatomyAssetManager(this.renderer, 12);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(container);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener("keydown", this.keyDown);
    document.addEventListener("visibilitychange", this.markDirty);
    this.animate();
    void this.load();
  }
  private markDirty = () => {
    this.dirty = true;
  };
  private resize = () => {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(32) / 2) *
            Math.max(1, 0.67 / this.camera.aspect),
        ),
    );
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  };
  private async loadBody() {
    try {
      const gltf = await new GLTFLoader().loadAsync(publicPath("/models/human-body.glb"));
      if (this.disposed) {
        disposeObject(gltf.scene);
        return;
      }
      gltf.scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const previous = Array.isArray(child.material)
          ? child.material
          : [child.material];
        previous.forEach((material) => material.dispose());
        child.material = new THREE.MeshPhysicalMaterial({
          color: 0xd8c6ad,
          roughness: 0.68,
          metalness: 0,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        child.renderOrder = 3;
      });
      this.body.add(gltf.scene);
      this.dirty = true;
    } catch {
      if (!this.disposed) this.callbacks.onError(["human-body"]);
    }
  }
  private buildStage() {
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.98, 0.21, 96),
      new THREE.MeshStandardMaterial({ color: 0xe5d1b8, roughness: 0.78 }),
    );
    plinth.position.y = -5.67;
    this.stage.add(plinth);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.64, 0.008, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0xc0a787 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -5.55;
    this.stage.add(ring);
  }
  private async loadSkeleton() {
    try {
      const gltf = await new GLTFLoader().loadAsync(publicPath("/models/skeleton.glb"));
      if (this.disposed) { disposeObject(gltf.scene); return; }
      gltf.scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const old = Array.isArray(child.material) ? child.material : [child.material];
        old.forEach((material) => material.dispose());
        child.material = new THREE.MeshStandardMaterial({
          color: 0xe0d3b8, roughness: .72, metalness: 0,
          transparent: true, opacity: .6, depthWrite: false,
        });
        child.geometry.computeBoundingBox();
        child.userData.organId = "bones";
        child.userData.skull = (child.geometry.boundingBox?.min.y ?? 0) > 4;
        child.renderOrder = 1;
        this.skeletonMeshes.push(child);
      });
      this.skeleton.add(gltf.scene);
      this.updateMaterials();
      this.dirty = true;
    } catch {
      if (!this.disposed) this.callbacks.onError(["skeleton"]);
    }
  }
  private async load() {
    const failures: string[] = [];
    let loaded = 0;
    // Limit network and mesh decoding concurrency to reduce first-frame stalls.
    const queue = [...bodyPlacements];
    const worker = async () => {
      while (queue.length && !this.disposed) {
        const spec = queue.shift()!;
        try {
          const organ = await this.assets.load(publicPath(`/models/${spec.id}.glb`));
          if (this.disposed) {
            this.assets.dispose();
            return;
          }
          organ.pivot.rotation.set(...(spec.rotation ?? [0, 0, 0]));
          if (spec.forward) {
            organ.pivot.quaternion.setFromUnitVectors(
              new THREE.Vector3(...spec.forward).normalize(),
              new THREE.Vector3(0, 0, 1),
            );
          }
          if (spec.center) {
            organ.pivot.children[0].position.sub(new THREE.Vector3(...spec.center));
          }
          organ.pivot.position.set(...spec.position);
          organ.pivot.scale.setScalar(spec.size / FIT_SIZE);
          organ.meshes.forEach((mesh) => {
            mesh.userData.organId = spec.id;
          });
          organ.mixer?.stopAllAction();
          this.models.set(spec.id, organ);
          this.scene.add(organ.pivot);
          // The eye library is a single eyeball. Its paired copy shares geometry/textures.
          if (spec.pairedPosition) {
            const pair = organ.pivot.children[0].clone(true);
            const displacement = new THREE.Vector3(...spec.pairedPosition)
              .sub(new THREE.Vector3(...spec.position))
              .applyQuaternion(organ.pivot.quaternion.clone().invert())
              .divideScalar(spec.size / FIT_SIZE);
            pair.position.add(displacement);
            organ.pivot.add(pair);
            pair.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.userData.organId = spec.id;
                organ.meshes.push(child);
              }
            });
          }
        } catch {
          failures.push(spec.id);
        } finally {
          if (!this.disposed) {
            this.callbacks.onProgress(++loaded, bodyPlacements.length);
            this.updateMaterials();
            this.dirty = true;
          }
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (!this.disposed) this.callbacks.onError(failures);
  }
  select(id: string, filter: string[] | null) {
    this.selected = id;
    this.filter = filter;
    this.updateMaterials();
    this.dirty = true;
  }
  private updateMaterials() {
    const bonesActive = this.selected === "bones";
    this.skeleton.visible = this.showSkeleton && (!this.isolated || bonesActive);
    for (const mesh of this.skeletonMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const match = !this.filter || this.filter.includes("bones");
      mat.opacity = bonesActive ? .9 : !match ? .12 : mesh.userData.skull ? .2 : .55;
      mat.emissive.set(bonesActive ? 0x735332 : 0);
      mat.emissiveIntensity = bonesActive ? .2 : 0;
    }
    this.models.forEach((organ, id) => {
      const match = !this.filter || this.filter.includes(id);
      const active = id === this.selected;
      organ.pivot.visible = !this.isolated || active;
      organ.meshes.forEach((mesh) => {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of materials) {
          const faded = !match && !active;
          mat.transparent = faded;
          mat.opacity = faded ? 0.1 : 1;
          mat.depthWrite = !faded;
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.set(active ? 0x7b3721 : 0x000000);
            mat.emissiveIntensity = active ? 0.3 : 0;
          }
          mat.needsUpdate = true;
        }
      });
    });
  }
  setEnvelope(show: boolean) {
    this.body.visible = show;
    this.dirty = true;
  }
  setSkeleton(show: boolean) {
    this.showSkeleton = show;
    this.updateMaterials();
    this.dirty = true;
  }
  setRotate(rotate: boolean) {
    this.rotating = rotate;
    this.controls.autoRotate = rotate;
    this.dirty = true;
  }
  setIsolate(isolate: boolean) {
    this.isolated = isolate;
    this.updateMaterials();
    this.dirty = true;
  }
  setSpread(spread: boolean) {
    for (const spec of bodyPlacements) {
      const organ = this.models.get(spec.id);
      if (!organ) continue;
      organ.pivot.position.set(...spec.position);
      if (spread) {
        organ.pivot.position.x +=
          (spec.position[0] < 0 ? -1 : 1) *
          (spec.id === "brain" ? 0 : spec.id === "lungs" ? -0.75 : 0.65);
        organ.pivot.position.z +=
          spec.id === "heart" ? 1.2 : spec.id === "pancreas" ? 1 : 0;
      }
    }
    this.dirty = true;
  }
  reset(view: "front" | "back" | "side" = "front") {
    const positions = {
      front: [0, 1.1, 20.3],
      back: [0, 1.1, -20.3],
      side: [20.3, 1.1, 0],
    } as const;
    const position = positions[view];
    this.camera.position.set(position[0], position[1], position[2]);
    this.controls.target.set(0, 0.1, 0);
    this.controls.update();
    this.dirty = true;
  }
  zoom(delta: number) {
    this.camera.position
      .sub(this.controls.target)
      .multiplyScalar(delta)
      .add(this.controls.target);
    this.controls.update();
    this.dirty = true;
  }
  private pointerDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
  };
  private pointerUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6)
      return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.models.values()]
      .filter((o) => o.pivot.visible)
      .flatMap((o) => o.meshes);
    const hit = this.raycaster.intersectObjects(meshes, false).find((h) => {
      const id = h.object.userData.organId;
      return !this.filter || this.filter.includes(id) || id === this.selected;
    });
    if (hit) this.callbacks.onSelect(hit.object.userData.organId as OrganId);
    else if (this.skeleton.visible && (!this.filter || this.filter.includes("bones")) &&
      this.raycaster.intersectObjects(this.skeletonMeshes, false).length) {
      this.callbacks.onSelect("bones");
    }
  };
  private keyDown = (e: KeyboardEvent) => {
    if (e.key === "Home") {
      e.preventDefault();
      this.reset();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      this.zoom(0.9);
    } else if (e.key === "-") {
      e.preventDefault();
      this.zoom(1.1);
    } else if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
      const offset = this.camera.position.clone().sub(this.controls.target);
      const sphere = new THREE.Spherical().setFromVector3(offset);
      sphere.theta +=
        e.key === "ArrowLeft" ? 0.1 : e.key === "ArrowRight" ? -0.1 : 0;
      sphere.phi = THREE.MathUtils.clamp(
        sphere.phi +
          (e.key === "ArrowUp" ? -0.1 : e.key === "ArrowDown" ? 0.1 : 0),
        0.3,
        Math.PI - 0.3,
      );
      this.camera.position.copy(
        new THREE.Vector3().setFromSpherical(sphere).add(this.controls.target),
      );
      this.controls.update();
      this.dirty = true;
    }
  };
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (document.hidden) return;
    this.controls.update();
    if (this.dirty || this.rotating) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.markDirty);
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.pointerDown);
    canvas.removeEventListener("pointerup", this.pointerUp);
    canvas.removeEventListener("keydown", this.keyDown);
    this.assets.dispose();
    disposeObject(this.body);
    disposeObject(this.skeleton);
    disposeObject(this.stage);
    this.environment.dispose();
    this.renderer.dispose();
    canvas.remove();
  }
}
