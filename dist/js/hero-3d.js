/**
 * Original procedural BOLETA sculpture. Geometry, light and animation are real
 * WebGL; no image is animated to impersonate 3D. Three is loaded on demand from
 * the site's own vendor directory, only after motion/data preferences pass.
 */
const instances = new WeakMap();
const TAU = Math.PI * 2;

export async function initHero(container) {
  if (!container) throw new TypeError("A hero stage element is required.");
  if (instances.has(container)) return instances.get(container);
  const canvas = container.querySelector("[data-hero-canvas]");
  const poster = container.querySelector("[data-hero-poster]");
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  const status = (value, reason = "") => {
    container.dataset.heroStatus = value;
    if (reason) container.dataset.heroFallback = reason;
    else delete container.dataset.heroFallback;
  };
  const fallback = (reason) => {
    status("fallback", reason);
    if (poster) poster.hidden = false;
    container.dispatchEvent(
      new CustomEvent("boleta:hero-fallback", { detail: { reason } }),
    );
  };
  const inert = (reason) => {
    fallback(reason);
    const controller = {
      destroy() {
        instances.delete(container);
        status("destroyed");
      },
      pause() {},
      resume() {},
      get stats() {
        return { fallback: reason };
      },
    };
    instances.set(container, controller);
    return controller;
  };
  if (!canvas) return inert("missing-canvas");
  if (media.matches) return inert("reduced-motion");
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ""))
    return inert("save-data");
  status("loading");

  let THREE;
  try {
    THREE = await import("./vendor/three.module.min.js");
  } catch {
    return inert("module-unavailable");
  }

  let renderer,
    scene,
    camera,
    sculpture,
    envTarget,
    glowTexture,
    chrome,
    coreMaterial,
    core,
    glow;
  let observer,
    resizeObserver,
    animation = 0,
    destroyed = false,
    contextLost = false,
    inView = true;
  let externalPause = false,
    elapsed = 0,
    lastFrame = 0,
    width = 1,
    height = 1,
    worldPixel = 0.01;
  let pointerX = 0,
    pointerY = 0,
    dampX = 0,
    dampY = 0,
    scrollOffset = 0;
  const disposables = new Set();
  const own = (resource) => {
    disposables.add(resource);
    return resource;
  };
  const pointerEnabled =
    !mobile && matchMedia("(hover: hover) and (pointer: fine)").matches;
  const targetInterval = mobile ? 1000 / 30 : 1000 / 60;
  const pixelLimit = mobile ? 1.35 : 1.6;
  const baseRotation = { x: -0.08, y: 0.2, z: -0.13 };
  const cameraFov = mobile ? 38 : 36;

  // Variable, elliptical cross sections create organic ribbons rather than
  // uniform torus primitives. Open ends taper into pointed chrome tendrils.
  function swept(
    curve,
    steps,
    sides,
    radius,
    flatten = 1,
    twist = 0,
    closed = false,
  ) {
    const frames = curve.computeFrenetFrames(steps, closed);
    const positions = [],
      normals = [],
      uv = [],
      indices = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        point = curve.getPointAt(t),
        r = radius(t);
      const normal = frames.normals[i],
        binormal = frames.binormals[i];
      for (let j = 0; j <= sides; j++) {
        const a = (j / sides) * TAU + t * twist;
        const cx = Math.cos(a),
          sy = Math.sin(a);
        const offset = normal
          .clone()
          .multiplyScalar(cx * r)
          .addScaledVector(binormal, sy * r * flatten);
        const position = point.clone().add(offset);
        const outward = normal
          .clone()
          .multiplyScalar(cx * flatten)
          .addScaledVector(binormal, sy)
          .normalize();
        positions.push(position.x, position.y, position.z);
        normals.push(outward.x, outward.y, outward.z);
        uv.push(t, j / sides);
        if (i < steps && j < sides) {
          const a0 = i * (sides + 1) + j,
            b0 = a0 + sides + 1;
          indices.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    // Recompute surface normals to preserve the taper and twisted highlights.
    g.computeVertexNormals();
    return g;
  }
  function mergeGeometry(parts) {
    const positions = [],
      normals = [],
      uvs = [],
      indices = [];
    let offset = 0;
    for (const g of parts) {
      positions.push(...g.attributes.position.array);
      normals.push(...g.attributes.normal.array);
      uvs.push(...g.attributes.uv.array);
      for (const i of g.index.array) indices.push(i + offset);
      offset += g.attributes.position.count;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);
    merged.computeBoundingSphere();
    return own(merged);
  }
  function curve(points, closed = false) {
    return new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      closed,
      "centripetal",
      0.5,
    );
  }
  function buildSculpture() {
    const parts = [],
      sides = mobile ? 8 : 10,
      steps = mobile ? 88 : 128;
    // Three interlocked, uneven, wide liquid ribbons establish the silhouette.
    const ribbons = [
      [
        [-2.3, 1.05, -0.1],
        [-1.6, 1.3, 0.28],
        [-0.65, 0.85, 0.8],
        [0.55, 0.1, 0.52],
        [1.5, -0.6, 0],
        [1.65, -1.4, -0.3],
        [0.6, -1.8, 0.3],
        [-0.6, -0.8, 0.95],
        [-0.9, 0.45, 0.48],
        [-0.15, 1.35, -0.3],
        [1.25, 1.58, -0.2],
        [2.35, 1.48, -0.65],
      ],
      [
        [-1.75, -1.6, -0.45],
        [-1.2, -0.75, 0.05],
        [-0.65, 0.1, 0.8],
        [0.5, 0.8, 0.74],
        [1.65, 0.75, 0.05],
        [1.9, -0.1, -0.55],
        [0.7, -0.9, -0.2],
        [-0.15, -1.25, 0.5],
        [-1.05, -1.35, 0.48],
        [-1.8, -1.65, -0.3],
      ],
      [
        [-2, 0.25, -0.65],
        [-0.8, 1.25, -0.2],
        [0.15, 0.8, 0.3],
        [0.75, -0.1, -0.2],
        [0.45, -1.0, -0.45],
        [0.8, -1.8, -0.1],
        [1.5, -2.1, 0.15],
        [1.35, -1.1, 0.55],
        [0.4, -0.5, 0.85],
        [-0.65, -0.1, 0.8],
        [-1.6, 0.1, 0.2],
      ],
    ];
    ribbons.forEach((points, n) =>
      parts.push(
        swept(
          curve(points),
          steps,
          sides,
          (t) =>
            (0.04 + 0.32 * Math.pow(Math.sin(Math.PI * t), 0.8)) *
            (1 + 0.3 * Math.sin(t * TAU * 2 + n)),
          0.37 + n * 0.075,
          Math.PI * (n + 1),
        ),
      ),
    );
    // Asymmetrical, pinched loops: irregular orbit-like structures, never a
    // sphere with a single regular Saturn ring.
    for (let n = 0; n < 3; n++) {
      const points = [],
        rotation = new THREE.Euler(
          0.4 + n * 0.55,
          0.1 + n * 0.65,
          -0.45 + n * 0.9,
        );
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const v = new THREE.Vector3(
          (1.5 + 0.35 * Math.sin(3 * a + n)) * Math.cos(a),
          (0.67 + 0.13 * Math.cos(2 * a)) * Math.sin(a),
          0.25 * Math.cos(2 * a + n),
        );
        v.applyEuler(rotation).add(new THREE.Vector3(0.12 * n, -0.1, 0.08 * n));
        points.push([v.x, v.y, v.z]);
      }
      parts.push(
        swept(
          curve(points, true),
          steps,
          sides,
          (t) =>
            0.065 + 0.12 * Math.pow(0.5 + 0.5 * Math.sin(t * TAU * 3 + n), 2),
          0.5,
          TAU,
          true,
        ),
      );
    }
    // Twisting branches end in sharp, organic points of different lengths.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.2,
        radius = 1.65 + 0.6 * Math.sin(i * 2.7);
      const z = 0.22 * Math.sin(i * 1.9);
      const points = [
        [0.42 * Math.cos(a), 0.38 * Math.sin(a), z],
        [0.85 * Math.cos(a + 0.32), 0.9 * Math.sin(a + 0.32), z + 0.38],
        [1.22 * Math.cos(a - 0.12), 1.24 * Math.sin(a - 0.12), z + 0.1],
        [radius * Math.cos(a + 0.15), radius * Math.sin(a + 0.15), z - 0.3],
        [
          (radius + 0.55) * Math.cos(a + 0.3),
          (radius + 0.45) * Math.sin(a + 0.3),
          z - 0.1,
        ],
      ];
      parts.push(
        swept(
          curve(points),
          mobile ? 36 : 52,
          sides,
          (t) =>
            0.004 +
            0.15 * Math.pow(1 - t, 1.35) * (1 + 0.5 * Math.sin(t * Math.PI)),
          0.65,
          Math.PI * 1.5,
        ),
      );
    }
    const geometry = mergeGeometry(parts);
    chrome = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xf0edf5,
        metalness: 1,
        roughness: 0.115,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.6,
      }),
    );
    const mesh = new THREE.Mesh(geometry, chrome);
    mesh.name = "boleta-liquid-chrome";
    sculpture = new THREE.Group();
    sculpture.add(mesh);
    coreMaterial = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xb46df1,
        metalness: 0.12,
        roughness: 0.08,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: 0x8b3fbf,
        emissiveIntensity: 0.48,
        envMapIntensity: 1.6,
      }),
    );
    core = new THREE.Mesh(
      own(new THREE.SphereGeometry(0.43, mobile ? 28 : 40, mobile ? 20 : 28)),
      coreMaterial,
    );
    core.position.set(0.1, 0.18, 0.95);
    sculpture.add(core);
    // A white-hot inner volume and a violet reflective shell, rather than
    // a uniformly emissive plastic-looking purple sphere. No global bloom.
    const innerCore = new THREE.Mesh(
      own(new THREE.SphereGeometry(0.31, mobile ? 24 : 32, mobile ? 16 : 24)),
      own(new THREE.MeshBasicMaterial({ color: 0xfff2ff, toneMapped: false })),
    );
    core.add(innerCore);
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = textureCanvas.height = 128;
    const ctx = textureCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,245,255,0.95)");
    gradient.addColorStop(0.2, "rgba(204,140,255,0.58)");
    gradient.addColorStop(0.55, "rgba(139,63,191,0.17)");
    gradient.addColorStop(1, "rgba(139,63,191,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    glowTexture = own(new THREE.CanvasTexture(textureCanvas));
    const glowMaterial = own(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow = new THREE.Sprite(glowMaterial);
    glow.position.copy(core.position);
    glow.scale.set(2.2, 2.2, 1);
    sculpture.add(glow);
    sculpture.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z);
    scene.add(sculpture);
    container.dataset.heroTriangles = String(geometry.index.count / 3);
  }
  function createEnvironment() {
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x08050d);
    const sources = [
      { p: [-4, 3, 2], s: [2.5, 6, 1], c: 0xf2eff4 },
      { p: [4, 1, 1], s: [1, 5, 2], c: 0xeae5f0 },
      { p: [0, 5, -2], s: [6, 0.7, 3], c: 0xe7f0ff },
      { p: [1, -3, 3], s: [4, 0.6, 1], c: 0x948c9c },
      { p: [0, 0, -5], s: [3, 4, 0.3], c: 0xa3adc6 },
    ];
    for (const source of sources) {
      const g = new THREE.BoxGeometry(...source.s),
        m = new THREE.MeshBasicMaterial({ color: source.c });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(...source.p);
      mesh.lookAt(0, 0, 0);
      studio.add(mesh);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    envTarget = pmrem.fromScene(studio, 0.035, 0.1, 100);
    scene.environment = envTarget.texture;
    pmrem.dispose();
    studio.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
  function resize() {
    if (destroyed || !renderer) return;
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelLimit));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const fitHeight = 3.15,
      fitWidth = 3.2 / camera.aspect;
    camera.position.z =
      (Math.max(fitHeight, fitWidth) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) *
      0.88;
    camera.position.y = 0.05;
    camera.lookAt(0, -0.02, 0);
    worldPixel =
      (2 *
        camera.position.z *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
      height;
    if (!animation && !contextLost) renderOnce();
  }
  function renderOnce() {
    if (destroyed || contextLost || !renderer) return;
    try {
      renderer.render(scene, camera);
    } catch {
      contextLost = true;
      fallback("render-failed");
    }
  }
  function canRun() {
    return (
      !destroyed &&
      !contextLost &&
      inView &&
      !document.hidden &&
      !externalPause &&
      !media.matches
    );
  }
  function frame(now) {
    animation = 0;
    if (!canRun()) return;
    animation = requestAnimationFrame(frame);
    if (lastFrame && now - lastFrame < targetInterval - 0.5) return;
    const dt = lastFrame
      ? Math.min((now - lastFrame) / 1000, 0.1)
      : targetInterval / 1000;
    lastFrame = now;
    elapsed += dt;
    const damping = 1 - Math.exp(-dt * 5);
    dampX += (pointerX - dampX) * damping;
    dampY += (pointerY - dampY) * damping;
    sculpture.rotation.y =
      baseRotation.y +
      (elapsed * TAU) / 45 +
      dampX * THREE.MathUtils.degToRad(6);
    sculpture.rotation.x = baseRotation.x + dampY * THREE.MathUtils.degToRad(6);
    sculpture.position.y =
      (Math.sin(elapsed * 0.85) * 7 + scrollOffset * 4) * worldPixel;
    const pulse = 0.5 + 0.5 * Math.sin((elapsed * TAU) / 4);
    coreMaterial.emissiveIntensity = 0.28 + pulse * 0.3;
    core.scale.setScalar(1 + pulse * 0.025);
    glow.material.opacity = 0.55 + pulse * 0.25;
    chrome.envMapRotation.y = elapsed * 0.035;
    renderOnce();
  }
  function pause(reason = "paused") {
    if (animation) cancelAnimationFrame(animation);
    animation = 0;
    lastFrame = 0;
    if (!destroyed && !contextLost) status("paused", reason);
  }
  function resume() {
    if (!canRun()) return;
    status("ready");
    if (!animation) {
      lastFrame = 0;
      animation = requestAnimationFrame(frame);
    }
  }
  function visibility() {
    if (document.hidden) pause("document-hidden");
    else resume();
  }
  function pointer(event) {
    const rect = container.getBoundingClientRect();
    pointerX = Math.max(
      -1,
      Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
    );
    pointerY = Math.max(
      -1,
      Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
  }
  function resetPointer() {
    pointerX = pointerY = 0;
  }
  function scroll() {
    if (!pointerEnabled) return;
    const rect = container.getBoundingClientRect();
    scrollOffset = Math.max(
      -1,
      Math.min(1, (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight),
    );
  }
  function motionChange() {
    if (media.matches) {
      pause("reduced-motion");
      fallback("reduced-motion");
    } else resume();
  }
  function lost(event) {
    event.preventDefault();
    contextLost = true;
    pause();
    fallback("context-lost");
  }
  function restored() {
    contextLost = false;
    resize();
    resume();
  }
  function destroy() {
    if (destroyed) return;
    pause();
    destroyed = true;
    observer?.disconnect();
    resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", scroll);
    container.removeEventListener("pointermove", pointer);
    container.removeEventListener("pointerleave", resetPointer);
    media.removeEventListener?.("change", motionChange);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    for (const object of disposables) object.dispose?.();
    envTarget?.dispose();
    renderer?.renderLists?.dispose();
    renderer?.dispose();
    scene?.clear();
    instances.delete(container);
    status("destroyed");
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !mobile,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    renderer.setClearColor(0x08050d, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 80);
    scene.add(new THREE.AmbientLight(0x89838f, 0.4));
    const key = new THREE.DirectionalLight(0xf0e9ff, 3.4);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd4e1ff, 2.2);
    fill.position.set(4, 1, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xa96dde, 1.35);
    rim.position.set(0, -1, -4);
    scene.add(rim);
    createEnvironment();
    buildSculpture();
    resize();
    renderOnce();
    if (contextLost) {
      destroy();
      return inert("render-failed");
    }
    status("ready");
    canvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("resize", resize, { passive: true });
    media.addEventListener?.("change", motionChange);
    if (pointerEnabled) {
      container.addEventListener("pointermove", pointer, { passive: true });
      container.addEventListener("pointerleave", resetPointer);
      window.addEventListener("scroll", scroll, { passive: true });
    }
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting;
          if (inView) resume();
          else pause("offscreen");
        },
        { rootMargin: "80px" },
      );
      observer.observe(container);
    }
    const controller = {
      destroy,
      pause() {
        externalPause = true;
        pause("external");
      },
      resume() {
        externalPause = false;
        resume();
      },
      get stats() {
        return {
          three: THREE.REVISION,
          quality: mobile ? "mobile" : "desktop",
          dpr: renderer.getPixelRatio(),
          triangles: renderer.info.render.triangles,
          drawCalls: renderer.info.render.calls,
          geometries: renderer.info.memory.geometries,
          elapsed,
        };
      },
    };
    instances.set(container, controller);
    resume();
    container.dispatchEvent(
      new CustomEvent("boleta:hero-ready", { detail: controller.stats }),
    );
    return controller;
  } catch {
    destroy();
    return inert("webgl-unavailable");
  }
}

