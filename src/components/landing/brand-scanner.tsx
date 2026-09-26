"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Fundo animado em WebGL (faixas de "varredura" com ondulação), adaptado para
 * a identidade da campanha. Melhorias sobre o original:
 * - cores da marca por padrão (azul Embasa → ciano → amarelo-lima);
 * - respeita prefers-reduced-motion (desenha um quadro estático);
 * - sem WebGL 2, não desenha nada (o gradiente da página continua de fundo);
 * - o mouse funciona mesmo com conteúdo por cima (escuta a janela);
 * - pausa fora da tela e com a aba oculta.
 */

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uSweepSpeed;
uniform float uSweepWidth;
uniform float uSweepFalloff;
uniform float uScale;
uniform float uFrequency;
uniform float uRipple;
uniform float uBandDensity;
uniform float uLineSharpness;
uniform float uGlow;
uniform float uColorSpread;
uniform float uBrightness;
uniform float uContrast;
uniform float uSoftness;
uniform float uVignette;
uniform float uOpacity;
uniform float uScanline;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uDirection;
uniform vec2 uMouse;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

const float TAU = 6.2831853;

float signalField(vec2 p, float t) {
  float w = sin(p.x * 1.3 + t * 0.7);
  w += sin(p.y * 1.7 - t * 0.52) * 0.8;
  w += sin((p.x + p.y) * 0.9 + t * 0.91) * 0.6;
  w += sin((p.x - p.y) * 1.53 - t * 0.63) * 0.42;
  return w * 0.35;
}

vec3 palette(float f) {
  f = clamp(f, 0.0, 1.0);
  f = pow(f, uContrast);
  vec3 c = mix(uColor1, uColor2, smoothstep(0.08, 0.6, f));
  return mix(c, uColor3, smoothstep(0.68, 1.0, f));
}

float scanBand(float x, float aa, float sharp) {
  float v = mix(0.5, 0.5 + 0.5 * cos(x * TAU), aa);
  return pow(v, sharp);
}

void main() {
  float aspect = iResolution.x / iResolution.y;
  vec2 uv0 = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
  vec2 p = uv0 / max(uScale, 0.001);
  float t = iTime * uSpeed;

  vec2 mUv = vec2((uMouse.x * 2.0 - 1.0) * aspect, uMouse.y * 2.0 - 1.0);
  vec2 md = uv0 - mUv;
  float r = max(uMouseRadius, 0.001);
  float mouseBoost = exp(-dot(md, md) / (r * r)) * uMouseStrength * uMouseActive;

  float axis;
  if (uDirection < 0.5) axis = p.y;
  else if (uDirection < 1.5) axis = p.x;
  else axis = (p.x + p.y) * 0.70710678;

  float sig = signalField(p * uFrequency, t);
  float coord = axis + sig * uRipple;

  float phase = coord / max(uSweepWidth, 0.05) - t * uSweepSpeed;
  float sweep = pow(0.5 + 0.5 * cos(phase * TAU), max(uSweepFalloff, 0.1));

  float lc = coord * uBandDensity;
  float aa = 1.0 / (1.0 + uSoftness * fwidth(lc) * 3.0);
  aa = clamp(aa * (1.0 + mouseBoost * 0.6), 0.0, 1.0);

  float bodyBase = clamp(0.5 + 0.5 * sig, 0.0, 1.0);
  float body = bodyBase * bodyBase * uGlow * sweep;

  float sharp = max(uLineSharpness, 0.1);
  float split = uColorSpread * 0.16;
  float fr = clamp(scanBand(lc + split, aa, sharp) * sweep + body, 0.0, 1.0);
  float fg = clamp(scanBand(lc, aa, sharp) * sweep + body, 0.0, 1.0);
  float fb = clamp(scanBand(lc - split, aa, sharp) * sweep + body, 0.0, 1.0);

  vec3 col = vec3(palette(fr).r, palette(fg).g, palette(fb).b);

  float inten = (fr + fg + fb) * 0.3333333 * uBrightness;
  inten *= 1.0 + mouseBoost * 0.9;

  if (uScanline > 0.5) {
    inten *= 1.0 - 0.18 * (0.5 + 0.5 * cos(gl_FragCoord.y * 1.7));
  }
  if (uGrain > 0.5) {
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    inten += (g - 0.5) * uGrainIntensity;
  }

  inten *= clamp(1.0 - uVignette * smoothstep(0.55, 1.65, length(uv0)), 0.0, 1.0);
  inten = clamp(inten, 0.0, 1.0);

  float a = clamp(inten * uOpacity, 0.0, 1.0);
  fragColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}
`;

export interface BrandScannerProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  sweepSpeed?: number;
  sweepWidth?: number;
  sweepFalloff?: number;
  scale?: number;
  frequency?: number;
  ripple?: number;
  bandDensity?: number;
  lineSharpness?: number;
  glow?: number;
  scanDirection?: "vertical" | "horizontal" | "diagonal";
  colorSpread?: number;
  brightness?: number;
  contrast?: number;
  softness?: number;
  vignette?: number;
  scanline?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
  className?: string;
}

export function BrandScanner({
  color1 = "#0757b0",
  color2 = "#1ab3c9",
  color3 = "#dbdb37",
  speed = 0.35,
  sweepSpeed = 0.18,
  sweepWidth = 1.8,
  sweepFalloff = 5,
  scale = 1.6,
  frequency = 1.8,
  ripple = 0.26,
  bandDensity = 10,
  lineSharpness = 5,
  glow = 0.3,
  scanDirection = "diagonal",
  colorSpread = 0.55,
  brightness = 0.95,
  contrast = 1.1,
  softness = 1.4,
  vignette = 0.55,
  scanline = true,
  grain = true,
  grainIntensity = 0.04,
  opacity = 0.9,
  mouseInteraction = true,
  mouseRadius = 0.55,
  mouseStrength = 0.6,
  className,
}: BrandScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Parâmetros lidos pelo loop sem recriar o contexto WebGL.
  const params = useRef<Required<Omit<BrandScannerProps, "className">> | null>(null);
  // Declarado antes do efeito principal: roda primeiro e a cada mudança de props.
  useEffect(() => {
    params.current = {
      color1, color2, color3, speed, sweepSpeed, sweepWidth, sweepFalloff, scale, frequency, ripple,
      bandDensity, lineSharpness, glow, scanDirection, colorSpread, brightness, contrast, softness,
      vignette, scanline, grain, grainIntensity, opacity, mouseInteraction, mouseRadius, mouseStrength,
    };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      return; // sem WebGL: fica o gradiente de fundo da página
    }
    const gl = renderer.gl;
    if (!(gl instanceof WebGL2RenderingContext)) {
      return;
    }
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const f3 = (hex: string) => new Float32Array(hexToRgb(hex));
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0 },
        uSweepSpeed: { value: 0 },
        uSweepWidth: { value: 0 },
        uSweepFalloff: { value: 0 },
        uScale: { value: 0 },
        uFrequency: { value: 0 },
        uRipple: { value: 0 },
        uBandDensity: { value: 0 },
        uLineSharpness: { value: 0 },
        uGlow: { value: 0 },
        uColorSpread: { value: 0 },
        uBrightness: { value: 0 },
        uContrast: { value: 0 },
        uSoftness: { value: 0 },
        uVignette: { value: 0 },
        uOpacity: { value: 0 },
        uScanline: { value: 0 },
        uGrain: { value: 0 },
        uGrainIntensity: { value: 0 },
        uDirection: { value: 0 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseRadius: { value: 0 },
        uMouseStrength: { value: 0 },
        uMouseActive: { value: 0 },
        uColor1: { value: f3("#ffffff") },
        uColor2: { value: f3("#ffffff") },
        uColor3: { value: f3("#ffffff") },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const u = program.uniforms;

    const syncParams = () => {
      const p = params.current;
      if (!p) {
        return;
      }
      u.uSpeed.value = p.speed;
      u.uSweepSpeed.value = p.sweepSpeed;
      u.uSweepWidth.value = p.sweepWidth;
      u.uSweepFalloff.value = p.sweepFalloff;
      u.uScale.value = p.scale;
      u.uFrequency.value = p.frequency;
      u.uRipple.value = p.ripple;
      u.uBandDensity.value = p.bandDensity;
      u.uLineSharpness.value = p.lineSharpness;
      u.uGlow.value = p.glow;
      u.uColorSpread.value = p.colorSpread;
      u.uBrightness.value = p.brightness;
      u.uContrast.value = p.contrast;
      u.uSoftness.value = p.softness;
      u.uVignette.value = p.vignette;
      u.uOpacity.value = p.opacity;
      u.uScanline.value = p.scanline ? 1 : 0;
      u.uGrain.value = p.grain ? 1 : 0;
      u.uGrainIntensity.value = p.grainIntensity;
      u.uDirection.value = p.scanDirection === "horizontal" ? 1 : p.scanDirection === "diagonal" ? 2 : 0;
      u.uMouseRadius.value = p.mouseRadius;
      u.uMouseStrength.value = p.mouseStrength;
      (u.uColor1.value as Float32Array).set(hexToRgb(p.color1));
      (u.uColor2.value as Float32Array).set(hexToRgb(p.color2));
      (u.uColor3.value as Float32Array).set(hexToRgb(p.color3));
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const t0 = performance.now();
    // Quadro estático usado com movimento reduzido (um instante "bonito" da animação).
    const STILL_TIME = 7.5;

    const render = (time: number) => {
      syncParams();
      u.iTime.value = time;
      renderer.render({ scene: mesh });
    };

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = u.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      render(reduceMotion.matches ? STILL_TIME : (performance.now() - t0) / 1000);
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    // Mouse na janela inteira: o conteúdo fica por cima do canvas.
    const current = [0.5, 0.5];
    let target = [0.5, 0.5];
    let active = 0;
    let targetActive = 0;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      target = [(e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height];
      targetActive = inside && params.current?.mouseInteraction !== false ? 1 : 0;
    };
    const onLeave = () => {
      targetActive = 0;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const loop = (now: number) => {
      current[0] += 0.05 * (target[0] - current[0]);
      current[1] += 0.05 * (target[1] - current[1]);
      (u.uMouse.value as Float32Array).set(current);
      active += 0.05 * (targetActive - active);
      u.uMouseActive.value = active;
      render((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!reduceMotion.matches && visible && pageVisible && raf === 0) {
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        start();
      } else {
        stop();
      }
    });
    io.observe(container);
    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        start();
      } else {
        stop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onMotionChange = () => {
      if (reduceMotion.matches) {
        stop();
        render(STILL_TIME);
      } else {
        start();
      }
    };
    reduceMotion.addEventListener("change", onMotionChange);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionChange);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} ref={containerRef} />;
}
