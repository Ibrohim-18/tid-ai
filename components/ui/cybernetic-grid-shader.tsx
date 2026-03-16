import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CyberneticGridShaderProps {
  className?: string;
}

const CyberneticGridShader: React.FC<CyberneticGridShaderProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1, 1) },
        iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;
        uniform vec2 iMouse;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
          vec2 mouse = (iMouse - 0.5 * iResolution.xy) / iResolution.y;

          float t = iTime * 0.24;
          float mouseDist = length(uv - mouse);
          float warp = sin(mouseDist * 20.0 - t * 4.0) * 0.1;
          warp *= smoothstep(0.45, 0.0, mouseDist);
          uv += warp;

          vec2 gridUv = abs(fract(uv * 10.0) - 0.5);
          float line = pow(1.0 - min(gridUv.x, gridUv.y), 42.0);

          vec3 baseColor = vec3(0.1, 0.5, 1.0) * line * (0.55 + sin(t * 2.0) * 0.18);
          float energy = sin(uv.x * 20.0 + t * 5.0) * sin(uv.y * 20.0 + t * 3.0);
          energy = smoothstep(0.8, 1.0, energy);
          vec3 color = baseColor + vec3(1.0, 0.2, 0.8) * energy * line;

          float glow = smoothstep(0.14, 0.0, mouseDist);
          color += vec3(1.0) * glow * 0.35;
          color += random(uv + t * 0.1) * 0.03;

          float alpha = clamp(line * 0.22 + energy * 0.16 + glow * 0.24 + 0.025, 0.0, 0.42);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const updateSize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      material.uniforms.iResolution.value.set(width, height);
      if (material.uniforms.iMouse.value.lengthSq() === 0) {
        material.uniforms.iMouse.value.set(width / 2, height / 2);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      material.uniforms.iMouse.value.set(event.clientX - rect.left, rect.bottom - event.clientY);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', updateSize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    updateSize();

    renderer.setAnimationLoop(() => {
      material.uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.setAnimationLoop(null);
      material.dispose();
      geometry.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={`pointer-events-none absolute inset-0 overflow-hidden cybernetic-grid-shader ${className}`} aria-hidden="true" />;
};

export default CyberneticGridShader;