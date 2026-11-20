import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { PlayerProfile, ShellScreenState } from '../game/types';

interface ObservatoryCanvasProps {
  screenState: ShellScreenState;
  profile: PlayerProfile;
  zenInspect?: boolean;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function createDialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 2;
    [130, 180, 226].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const major = i % 6 === 0;
      const r1 = major ? 204 : 214;
      const r2 = 226;
      ctx.strokeStyle = major ? 'rgba(245, 158, 11, 0.45)' : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = major ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.85)');
    grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.35)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ObservatoryCanvas({ screenState, profile, zenInspect = false }: ObservatoryCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{
    screenState: ShellScreenState;
    levels: { logica: number; memoria: number; atencion: number };
    zenInspect: boolean;
  }>({
    screenState,
    levels: {
      logica: profile.domains.logica.level,
      memoria: profile.domains.memoria.level,
      atencion: profile.domains.atencion.level,
    },
    zenInspect,
  });

  stateRef.current = {
    screenState,
    levels: {
      logica: profile.domains.logica.level,
      memoria: profile.domains.memoria.level,
      atencion: profile.domains.atencion.level,
    },
    zenInspect,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b101b);
    scene.fog = new THREE.FogExp2(0x0b101b, 0.048);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      80,
    );
    camera.position.set(-1.3, 2.35, 6.9);
    camera.lookAt(-1.2, 1.35, 0);

    // Warm key light vs Cool hemisphere fill
    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffdfb8, 2.1);
    keyLight.position.set(5.5, 8.0, 5.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -4.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-5, 3.5, -4);
    scene.add(rimLight);

    // Floor horizon disc + engraved observatory dial
    const floorGeo = new THREE.CircleGeometry(28, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.88,
      metalness: 0.12,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const dialTex = createDialTexture();
    dialTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const dialGeo = new THREE.CircleGeometry(3.4, 48);
    const dialMat = new THREE.MeshStandardMaterial({
      map: dialTex,
      transparent: true,
      roughness: 0.55,
      metalness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    dialMesh.rotation.x = -Math.PI / 2;
    dialMesh.position.y = 0.02;
    scene.add(dialMesh);

    // Contact shadow plane directly under astrolabe
    const shadowTex = createRadialShadowTexture();
    const contactGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const contactMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadow = new THREE.Mesh(contactGeo, contactMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.03;
    scene.add(contactShadow);

    // Composite 10+ part Astrolabio Sináptico (THREE.Group, bottom-center pivoted at y=0)
    const astrolabe = new THREE.Group();
    scene.add(astrolabe);

    // Part 1: Beveled octagonal slate plinth
    const octShape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = 1.15;
      if (i === 0) octShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else octShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    octShape.closePath();
    const plinthGeo = new THREE.ExtrudeGeometry(octShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    plinthGeo.rotateX(-Math.PI / 2);
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.2,
    });
    const plinth = new THREE.Mesh(plinthGeo, slateMat);
    plinth.position.y = 0.04;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    astrolabe.add(plinth);

    // Part 2: Lathe-turned brushed brass pedestal column
    const lathePoints = [
      new THREE.Vector2(0.55, 0.2),
      new THREE.Vector2(0.42, 0.28),
      new THREE.Vector2(0.24, 0.42),
      new THREE.Vector2(0.2, 0.72),
      new THREE.Vector2(0.36, 0.85),
      new THREE.Vector2(0.42, 0.92),
    ];
    const columnGeo = new THREE.LatheGeometry(lathePoints, 28);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a359,
      roughness: 0.24,
      metalness: 0.9,
    });
    const column = new THREE.Mesh(columnGeo, brassMat);
    column.castShadow = true;
    astrolabe.add(column);

    // Part 3: Inner dark ceramic collar ring
    const collarGeo = new THREE.TorusGeometry(0.45, 0.045, 12, 32);
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.35,
    });
    const collar = new THREE.Mesh(collarGeo, ceramicMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.94;
    astrolabe.add(collar);

    // Core pivot center at y = 1.95
    const coreHub = new THREE.Group();
    coreHub.position.y = 1.95;
    astrolabe.add(coreHub);

    // Part 4: Outer gimbal ring
    const outerRingGeo = new THREE.TorusGeometry(1.18, 0.04, 14, 48);
    const outerRing = new THREE.Mesh(outerRingGeo, brassMat);
    outerRing.castShadow = true;
    coreHub.add(outerRing);

    // Part 5: Inner gimbal ring
    const innerRingGeo = new THREE.TorusGeometry(0.92, 0.032, 12, 42);
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.32,
      metalness: 0.85,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, darkSteelMat);
    innerRing.rotation.x = Math.PI / 3;
    innerRing.castShadow = true;
    coreHub.add(innerRing);

    // Part 6: Central faceted neural prism core
    const crystalGeo = new THREE.OctahedronGeometry(0.44, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const crystalCore = new THREE.Mesh(crystalGeo, crystalMat);
    crystalCore.castShadow = true;
    coreHub.add(crystalCore);

    // Part 7: Outer geometric wireframe cage
    const cageGeo = new THREE.IcosahedronGeometry(0.64, 0);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      wireframe: true,
      roughness: 0.3,
      metalness: 0.8,
    });
    const cage = new THREE.Mesh(cageGeo, cageMat);
    coreHub.add(cage);

    // Parts 8, 9, 10: Three domain prisms (Lógica, Memoria, Atención)
    const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
    const makeNodeGroup = (hex: number, emissiveHex: number) => {
      const grp = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({
        color: hex,
        emissive: emissiveHex,
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.15,
        clearcoat: 0.9,
      });
      const crystal = new THREE.Mesh(shardGeo, mat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 24), brassMat);
      ring.rotation.x = Math.PI / 2;
      grp.add(crystal, ring);
      return grp;
    };

    const logicNode = makeNodeGroup(0xf59e0b, 0xb45309);
    const memoryNode = makeNodeGroup(0x38bdf8, 0x0284c7);
    const attentionNode = makeNodeGroup(0x10b981, 0x059669);
    coreHub.add(logicNode, memoryNode, attentionNode);

    // Part 11: InstancedMesh of 36 orbiting synaptic micro-shards
    const shardCount = 36;
    const microGeo = new THREE.TetrahedronGeometry(0.045, 0);
    const microMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.7,
    });
    const instancedShards = new THREE.InstancedMesh(microGeo, microMat, shardCount);
    const palette = [0xf59e0b, 0x38bdf8, 0x10b981, 0xe2e8f0];
    const shardParams = Array.from({ length: shardCount }, (_, i) => ({
      radius: 1.45 + (i % 5) * 0.22,
      speed: 0.22 + (i % 7) * 0.05,
      phase: (i / shardCount) * Math.PI * 2,
      yOffset: ((i % 9) - 4) * 0.18,
      scale: 0.7 + (i % 4) * 0.22,
    }));

    shardParams.forEach((p, i) => {
      _color.setHex(palette[i % palette.length]);
      instancedShards.setColorAt(i, _color);
      _dummy.position.set(Math.cos(p.phase) * p.radius, p.yOffset, Math.sin(p.phase) * p.radius);
      _dummy.scale.setScalar(p.scale);
      _dummy.updateMatrix();
      instancedShards.setMatrixAt(i, _dummy.matrix);
    });
    instancedShards.instanceMatrix.needsUpdate = true;
    if (instancedShards.instanceColor) instancedShards.instanceColor.needsUpdate = true;
    instancedShards.computeBoundingSphere();
    coreHub.add(instancedShards);

    // Pointer parallax state
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      const ny = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
      pointer.x = nx;
      pointer.y = ny;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const camLookTarget = new THREE.Vector3(-1.35, 1.5, 0);
    const desiredCamPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const { screenState: mode, levels, zenInspect: inspect } = stateRef.current;

      // Pause heavy 3D loop when actively playing a 2D challenge so gameplay has 100% CPU
      const shouldAnimate = mode === 'title' || (mode === 'hub' && inspect);

      if (shouldAnimate) {
        elapsed += dt;
        const dampFactor = 1 - Math.exp(-5.0 * dt);

        if (inspect) {
          desiredCamPos.set(pointer.x * 1.4, 2.2 - pointer.y * 0.6, 5.4);
          desiredLook.set(0, 1.6, 0);
        } else {
          // Title screen: anchor astrolabe cleanly on the right 55% while leaving left 40% calm negative space
          desiredCamPos.set(-1.35 + pointer.x * 0.45, 2.2 - pointer.y * 0.25, 6.2);
          desiredLook.set(-1.35, 1.5, 0);
        }

        camera.position.lerp(desiredCamPos, dampFactor);
        camLookTarget.lerp(desiredLook, dampFactor);
        camera.lookAt(camLookTarget);

        outerRing.rotation.y = elapsed * 0.35;
        outerRing.rotation.x = Math.sin(elapsed * 0.4) * 0.25;
        innerRing.rotation.z = -elapsed * 0.55;
        innerRing.rotation.y = elapsed * 0.25;
        crystalCore.rotation.y = elapsed * 0.7;
        crystalCore.position.y = Math.sin(elapsed * 1.6) * 0.07;
        cage.rotation.x = -elapsed * 0.28;
        cage.rotation.y = elapsed * 0.32;

        // Position 3 domain nodes smoothly around the core
        const placeNode = (node: THREE.Group, baseAngle: number, radius: number, level: number, bobPhase: number) => {
          const a = baseAngle + elapsed * 0.55;
          node.position.set(Math.cos(a) * radius, Math.sin(elapsed * 1.4 + bobPhase) * 0.22, Math.sin(a) * radius);
          const s = 0.85 + Math.min(10, level) * 0.055;
          node.scale.setScalar(s);
          node.rotation.y = -a;
        };

        placeNode(logicNode, 0, 1.48, levels.logica, 0);
        placeNode(memoryNode, (Math.PI * 2) / 3, 1.48, levels.memoria, 2.1);
        placeNode(attentionNode, (Math.PI * 4) / 3, 1.48, levels.atencion, 4.2);

        for (let i = 0; i < shardCount; i++) {
          const p = shardParams[i];
          const a = p.phase + elapsed * p.speed;
          _dummy.position.set(Math.cos(a) * p.radius, p.yOffset + Math.sin(elapsed + p.phase) * 0.08, Math.sin(a) * p.radius);
          _dummy.rotation.set(elapsed * 0.6 + i, elapsed * 0.4, 0);
          _dummy.scale.setScalar(p.scale);
          _dummy.updateMatrix();
          instancedShards.setMatrixAt(i, _dummy.matrix);
        }
        instancedShards.instanceMatrix.needsUpdate = true;

        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      } else {
        // Idle softly at low cadence without starving 2D games
        renderer.render(scene, camera);
        frameId = window.setTimeout(tick, 450);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      dialTex.dispose();
      shadowTex.dispose();
      envTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      dialGeo.dispose();
      dialMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      plinthGeo.dispose();
      slateMat.dispose();
      columnGeo.dispose();
      brassMat.dispose();
      collarGeo.dispose();
      ceramicMat.dispose();
      outerRingGeo.dispose();
      innerRingGeo.dispose();
      darkSteelMat.dispose();
      crystalGeo.dispose();
      crystalMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      shardGeo.dispose();
      microGeo.dispose();
      microMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const dimBackdrop = screenState === 'playing' || screenState === 'paused';

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-300"
      style={{ opacity: dimBackdrop ? 0.18 : screenState === 'hub' && !zenInspect ? 0.34 : 1 }}
      aria-hidden="true"
    >
      <div ref={mountRef} className="w-full h-full" data-testid="observatory-canvas" />
    </div>
  );
}
