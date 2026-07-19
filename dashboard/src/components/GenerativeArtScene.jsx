import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = `
  uniform float time;
  uniform vec3 lightPosition;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLightDir;

  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    float n = snoise(position * 1.5 + time * 0.3);
    float displacement = n * 0.12;
    vec3 newPos = position + normal * displacement;

    vec3 worldPos = (modelMatrix * vec4(newPos, 1.0)).xyz;
    vLightDir = lightPosition - worldPos;
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 color;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLightDir;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(vLightDir);

    float diff = max(dot(normal, lightDir), 0.0);

    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 2.5);

    vec3 finalColor = mix(color * 0.7, vec3(1.0, 0.85, 0.93), rim * 0.6) * (0.7 + diff * 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export default function GenerativeArtScene() {
  const containerRef = useRef(null);
  const stateRef = useRef({ mouse: { x: 0, y: 0 } });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f, 1);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1.3, 64);

    const uniforms = {
      time: { value: 0 },
      color: { value: new THREE.Color(0xff2d78) },
      lightPosition: { value: new THREE.Vector3(5, 5, 5) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const state = stateRef.current;

    function onMouseMove(e) {
      state.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      state.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    let animationId;

    function animate() {
      const mx = state.mouse.x * 4;
      const my = state.mouse.y * 4;
      uniforms.lightPosition.value.set(mx, my, 5);

      mesh.rotation.y += 0.0005;
      mesh.rotation.x += 0.0002;
      uniforms.time.value += 0.01;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    />
  );
}
