import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class Scene3D {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.80;

    this.canvas = this.renderer.domElement;
    this.canvas.id = 'lab-canvas-3d';
    this.canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;display:none;';
    container.appendChild(this.canvas);

    // Environment map — makes metallic/glass materials reflect the scene properly.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090b10);
    this.scene.environment = envTexture;
    this.scene.fog = new THREE.FogExp2(0x090b10, 0.0025);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
    this.camera.position.set(0, 120, 230);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 50, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = Math.PI * 0.04;
    this.controls.maxPolarAngle = Math.PI * 0.82;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 500;
    this.controls.update();

    this._addLights();
    this.resize(container);
  }

  _addLights() {
    // Low ambient so glass gets contrast rather than washing out.
    this.scene.add(new THREE.AmbientLight(0x6070a0, 0.9));

    // Main key light — warm overhead, cast soft shadows.
    const key = new THREE.DirectionalLight(0xfff4e0, 2.8);
    key.position.set(60, 180, 100);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 600;
    key.shadow.camera.left = -130;
    key.shadow.camera.right = 130;
    key.shadow.camera.top = 220;
    key.shadow.camera.bottom = -110;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    // Cool fill from opposite side — gives glass edges definition.
    const fill = new THREE.DirectionalLight(0x90a8cc, 0.9);
    fill.position.set(-80, 60, -60);
    this.scene.add(fill);

    // Warm overhead point — subtle bench lamp effect.
    const amber = new THREE.PointLight(0xf59e0b, 25, 150, 1.5);
    amber.position.set(10, 110, 50);
    this.scene.add(amber);

    // Dim under-light for a little blue rim on the table edge.
    const under = new THREE.PointLight(0x2040a0, 8, 100, 2);
    under.position.set(0, -30, 0);
    this.scene.add(under);
  }

  resize(container) {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  show() { this.canvas.style.display = 'block'; }
  hide() { this.canvas.style.display = 'none'; }
}
