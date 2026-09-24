'use client';
// La Guardia de Elune — revelado del logo · React puro, sin dependencias externas.
// Un único reloj (requestAnimationFrame) calcula cada fotograma: nada se desincroniza,
// se pausa fuera de pantalla / pestaña oculta y continúa donde se quedó.
import { useEffect, useRef, useState } from 'react';

const CUE = { luna: 0, cielo: 2.5, titulo: 5, aro: 9, gema: 11.5, final: 14 };
export const TOTAL = 17;
const FILES = { moon: 'luna.png', ring: 'aro.png', guardia: 'la-guardia-de.png', elune: 'elune.png', filL: 'filigrana-izq.png', filR: 'filigrana-der.png', gem: 'gema.png' };

const S = 1040 / 2048, px = v => v * S;
const c01 = v => Math.min(1, Math.max(0, v));
const E = {
  outCubic: t => 1 - Math.pow(1 - t, 3), inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inQuart: t => t * t * t * t, outQuart: t => 1 - Math.pow(1 - t, 4),
};
const tw = (a, b, s, e, ease = E.outCubic) => T => a + (b - a) * ease(c01((T - s) / (e - s)));
const draw = (a, b, s, e) => tw(a, b, s, e, E.inOutQuad);
const springP = (t, k = 300, c = 15) => {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * w0), wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
};
const spring = (a, b, s, k, c) => T => a + (b - a) * springP(T - s, k, c);
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const P = 'absolute';

function Img({ src, x, y, w, h, style }) {
  return <img src={src} alt="" draggable={false} style={{ position: P, left: px(x), top: px(y), width: px(w), height: px(h), maxWidth: 'none', ...style }} />;
}
function Flare({ x, y, size, o, color = '200,225,255' }) {
  const line = r => ({ position: P, left: -size / 2, top: -1, width: size, height: 2, transform: `rotate(${r}deg)`,
    background: `linear-gradient(90deg, transparent, rgba(${color},0.95) 50%, transparent)` });
  return <div style={{ position: P, left: x, top: y, width: 0, height: 0, opacity: o }}><div style={line(0)} /><div style={line(90)} /></div>;
}

// 1 · Luna — pop 0 → 1.1 → 1, resplandor constante y paralaje
function Moon({ T, A, src }) {
  const s0 = CUE.luna + 0.25, dt = T - s0;
  const sc = dt < 0 ? 0 : dt < 0.32 ? 1.1 * E.outCubic(dt / 0.32) : 1.1 - 0.1 * E.inOutQuad(c01((dt - 0.32) / 0.3));
  const on = tw(0, 1, s0 + 0.2, s0 + 1.2)(T);
  const b = 0.5 + 0.5 * Math.sin((A - s0) * 2.4);
  const par = draw(0, 1, CUE.cielo, TOTAL)(T);
  const G = 493;
  return (
    <div style={{ position: P, inset: 0, transformOrigin: `${px(1025)}px ${px(705)}px`,
      transform: `translateY(${-4 * Math.sin(A * 1.7) * on}px) scale(${1 + 0.03 * par})` }}>
      <div style={{ position: P, left: px(1025 - G), top: px(705 - G), width: px(G * 2), height: px(G * 2), borderRadius: '50%',
        opacity: (0.7 + 0.3 * b) * on, transform: `scale(${sc * (1 + 0.035 * b)})`,
        background: 'radial-gradient(circle closest-side, rgba(255,255,255,0.9) 62%, rgba(200,245,255,0.55) 68%, rgba(110,210,255,0.28) 80%, rgba(80,170,255,0) 100%)' }} />
      <Img src={src} x={685} y={365} w={680} h={680} style={{ borderRadius: '50%', transform: `scale(${sc})`, filter: 'contrast(1.08) brightness(1.03)' }} />
    </div>
  );
}

// 2 · Cielo — revelado radial + estrellas asíncronas con destellos
const STARS = [
  [620, 620, 7], [1400, 420, 8], [1450, 900, 9], [690, 360, 4], [980, 240, 4], [1320, 300, 4], [1540, 740, 5],
  [560, 800, 4], [760, 1020, 4], [1300, 1010, 5], [1160, 250, 3], [860, 280, 3], [1600, 600, 3], [520, 500, 3],
];
function Night({ T, A }) {
  const r = tw(0, 130, CUE.cielo, CUE.cielo + 1.9)(T);
  const reveal = `radial-gradient(circle closest-side, #000 ${r - 35}%, transparent ${r}%)`;
  const fade = 'linear-gradient(180deg, #000 56%, transparent 80%)';
  return (
    <>
      <div style={{ position: P, left: px(384), top: px(120), width: px(1280), height: px(1280), WebkitMaskImage: fade, maskImage: fade }}>
        <div style={{ position: P, inset: 0, WebkitMaskImage: reveal, maskImage: reveal,
          background: 'radial-gradient(circle closest-side, #2a62b8 0%, #1f4f9e 40%, rgba(20,60,140,0.95) 60%, rgba(14,42,105,0.7) 74%, rgba(10,30,80,0.3) 88%, rgba(6,20,54,0) 100%)' }} />
      </div>
      {STARS.map(([x, y, rr], i) => {
        const dist = Math.hypot(x - 1024, y - 700) / 640;
        const on = tw(0, 1, CUE.cielo + 0.3 + dist * 1.4, CUE.cielo + 0.9 + dist * 1.4)(T);
        if (on <= 0) return null;
        const tww = 0.5 + 0.5 * Math.sin(A * (1.3 + rnd(i) * 2.6) + rnd(i + 40) * 6.28);
        return (
          <div key={i}>
            <div style={{ position: P, left: px(x - rr), top: px(y - rr), width: px(rr * 2), height: px(rr * 2), borderRadius: '50%',
              background: '#f2f7ff', opacity: on * (0.45 + 0.55 * tww), boxShadow: `0 0 ${px(rr * 4)}px ${px(rr * 1.2)}px rgba(130,180,255,0.8)` }} />
            {rr >= 4 && <Flare x={px(x)} y={px(y)} size={px(rr * 16) * (0.6 + 0.4 * tww)} o={Math.pow(tww, 6) * on} />}
          </div>
        );
      })}
    </>
  );
}

// 3 · Título — LA GUARDIA DE se desliza; ELUNE cae seco, sacudida, resplandor y polvo plateado
const T_ELUNE = CUE.titulo + 1.5, T_LAND = T_ELUNE + 0.28;
const CX = px(1025), CY = px(1435);
const DUST = ['229,231,235', '243,244,246', '223,246,255'];
function TitleGlow({ T }) {
  const dt = T - T_LAND;
  if (dt < 0 || dt > 2) return null;
  return <div style={{ position: P, left: CX - 720, top: CY - 300, width: 1440, height: 600, opacity: Math.exp(-dt * 2.4),
    transform: `scale(${0.6 + 0.6 * (1 - Math.exp(-dt * 6))})`,
    background: 'radial-gradient(ellipse closest-side, rgba(255,255,255,0.95) 0%, rgba(255,232,170,0.75) 22%, rgba(240,180,80,0.35) 50%, rgba(200,140,50,0) 100%)' }} />;
}
function Dust({ T }) {
  const dt = T - T_LAND;
  if (dt < 0 || dt > 2.2) return null;
  return Array.from({ length: 56 }, (_, i) => {
    const p = dt / (1 + rnd(i + 3) * 0.9);
    if (p >= 1) return null;
    const x0 = CX + (rnd(i) - 0.5) * 620, y0 = CY + (rnd(i + 9) - 0.5) * 120;
    const vx = (x0 - CX) * 1.6 + (rnd(i + 5) - 0.5) * 300, vy = -(180 + rnd(i + 7) * 520);
    const x = x0 + vx * dt * 0.8, y = y0 + vy * dt * 0.8 + 160 * dt * dt, s = (3 + rnd(i + 11) * 5) * 3, c = DUST[i % 3];
    return <div key={i} style={{ position: P, left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%',
      opacity: Math.pow(1 - p, 1.4) * 0.9, transform: `scale(${1 - 0.6 * p})`,
      background: `radial-gradient(circle closest-side, rgba(${c},1) 0%, rgba(${c},0.55) 35%, rgba(${c},0) 100%)` }} />;
  });
}
function Title({ T, src }) {
  const fall = c01((T - T_ELUNE) / (T_LAND - T_ELUNE)), dl = T - T_LAND;
  return (
    <>
      <Img src={src.guardia} x={360} y={1105} w={1305} h={145}
        style={{ opacity: tw(0, 1, CUE.titulo, CUE.titulo + 0.9)(T), transform: `translateX(${tw(-26, 0, CUE.titulo, CUE.titulo + 1.1)(T)}px)` }} />
      <Img src={src.elune} x={340} y={1265} w={1370} h={340}
        style={{ opacity: tw(0, 1, T_ELUNE, T_ELUNE + 0.18)(T), transformOrigin: '50% 60%',
          transform: `scale(${T < T_LAND ? 2 - E.inQuart(fall) : 1})`,
          filter: T < T_LAND ? `blur(${5 * (1 - fall)}px)` : dl < 1.5 ? `brightness(${1 + 0.8 * Math.exp(-dl * 4)})` : 'none' }} />
    </>
  );
}

// 4 · Aro — máscara cónica forjando el oro con destello en las puntas
function Ring({ T, src }) {
  const p = draw(0, 1, CUE.aro + 0.2, CUE.aro + 2.0)(T);
  if (p <= 0) return null;
  const a = p * 132, live = p < 1;
  const cone = `conic-gradient(from 0deg at 50% 50%, #000 0deg ${a}deg, transparent ${a}deg ${360 - a}deg, #000 ${360 - a}deg)`;
  const hot = `conic-gradient(from 0deg at 50% 50%, transparent 0deg ${Math.max(0, a - 26)}deg, #000 ${a}deg, transparent ${a}deg ${360 - a}deg, #000 ${360 - a}deg, transparent ${Math.min(360, 386 - a)}deg)`;
  const box = { position: P, left: px(400), top: px(156), width: px(1248), height: px(1248) };
  const rad = a * Math.PI / 180, flick = 0.85 + 0.15 * Math.sin(T * 40);
  return (
    <>
      <div style={{ ...box, WebkitMaskImage: cone, maskImage: cone, filter: `brightness(${tw(1.7, 1, CUE.aro + 0.4, CUE.aro + 2.6)(T)})` }}>
        <Img src={src} x={0} y={0} w={1248} h={939} />
      </div>
      {live && (
        <div style={{ ...box, WebkitMaskImage: hot, maskImage: hot, filter: 'brightness(2.6) saturate(0.7)' }}>
          <Img src={src} x={0} y={0} w={1248} h={939} />
        </div>
      )}
      {live && [1, -1].map(sg => {
        const x = px(1024 + sg * 575 * Math.sin(rad)), y = px(780 - 575 * Math.cos(rad));
        return (
          <div key={sg}>
            <div style={{ position: P, left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: '50%', background: '#fffbe8', opacity: flick,
              boxShadow: '0 0 20px 10px rgba(255,220,140,0.95), 0 0 70px 30px rgba(255,180,70,0.45)' }} />
            <Flare x={x} y={y} size={150 * flick} o={1} color="255,236,190" />
          </div>
        );
      })}
    </>
  );
}

// 5 · Gema — encaje con rebote, onda púrpura; filigrana forjada sin rebote
function Gem({ T, src }) {
  const s0 = CUE.gema + 0.2;
  const g = spring(0, 1, s0)(T), rot = spring(-35, 0, s0)(T), fl = T - (s0 + 0.12);
  const arm = tw(0, 1, s0 + 0.25, s0 + 0.7, E.outQuart)(T);
  const sweep = tw(0, 1, s0 + 0.1, s0 + 0.8)(T);
  const cx = px(1024), cy = px(1745);
  return (
    <>
      {arm > 0 && <>
        <Img src={src.filL} x={440} y={1600} w={584} h={345} style={{ transformOrigin: '100% 45%', transform: `scaleX(${arm})`, opacity: c01(arm * 3) }} />
        <Img src={src.filR} x={1024} y={1600} w={584} h={345} style={{ transformOrigin: '0% 45%', transform: `scaleX(${arm})`, opacity: c01(arm * 3) }} />
      </>}
      {g > 0 && <Img src={src.gem} x={924} y={1645} w={200} h={200} style={{ borderRadius: '50%', transform: `scale(${g}) rotate(${rot}deg)`,
        boxShadow: fl > 0 && fl < 3 ? `0 0 ${60 * Math.exp(-fl * 2)}px ${24 * Math.exp(-fl * 2)}px rgba(180,100,255,${0.9 * Math.exp(-fl * 2)})` : 'none' }} />}
      {sweep > 0 && sweep < 1 && <>
        <div style={{ position: P, left: cx - 1000, top: cy - 1000, width: 2000, height: 2000, borderRadius: '50%', opacity: 1 - sweep,
          transform: `scale(${sweep * 1.8})`, background: 'radial-gradient(circle closest-side, rgba(150,70,255,0) 55%, rgba(185,110,255,0.55) 85%, rgba(150,70,255,0) 100%)' }} />
        <div style={{ position: P, left: cx - 900, top: cy - 900, width: 1800, height: 1800, borderRadius: '50%', opacity: Math.pow(1 - sweep, 2),
          background: 'radial-gradient(circle closest-side, rgba(200,140,255,0.45), rgba(150,70,255,0) 70%)' }} />
      </>}
    </>
  );
}

// 6 · Final — shine diagonal sólo sobre las piezas metálicas
function Shine({ T, src }) {
  const s = CUE.final + 0.3, d = 0.9;
  if (T <= s || T >= s + d) return null;
  const x = draw(-15, 115, s, s + d)(T);
  const m = `linear-gradient(105deg, transparent ${x - 9}%, #000 ${x - 2}%, #000 ${x + 2}%, transparent ${x + 9}%)`;
  return (
    <div style={{ position: P, inset: 0, filter: 'brightness(2.4) saturate(0.6)', WebkitMaskImage: m, maskImage: m }}>
      <Img src={src.ring} x={400} y={156} w={1248} h={939} />
      <Img src={src.guardia} x={360} y={1105} w={1305} h={145} />
      <Img src={src.elune} x={340} y={1265} w={1370} h={340} />
      <Img src={src.filL} x={440} y={1600} w={584} h={345} />
      <Img src={src.filR} x={1024} y={1600} w={584} h={345} />
    </div>
  );
}

/**
 * Props:
 *  size        lado en px (diseñado a 1040)
 *  background  'transparent' por defecto
 *  assetsPath  carpeta pública con los PNG (por defecto '/elune')
 *  startOnView empieza al entrar en pantalla (true) · si false, al montar
 *  time        opcional: fija el tiempo en segundos (modo controlado / scrubbing)
 *  onComplete  callback al terminar (17 s)
 */
export default function EluneLogoReveal({ size = 1040, background = 'transparent', assetsPath = '/elune', startOnView = true, time, onComplete }) {
  const root = useRef(null), acc = useRef(0), done = useRef(false), cb = useRef(onComplete);
  cb.current = onComplete;
  const src = {};
  for (const k in FILES) src[k] = `${assetsPath}/${FILES[k]}`;
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(!startOnView);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all(Object.values(src).map(s => { const i = new Image(); i.src = s; return (i.decode ? i.decode() : Promise.resolve()).catch(() => {}); }))
      .then(() => alive && setReady(true));
    return () => { alive = false; };
  }, [assetsPath]);

  useEffect(() => {
    if (!startOnView || !root.current || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(root.current);
    return () => io.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (time != null || !ready || !visible) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      acc.current = Math.max(acc.current, TOTAL); setClock(acc.current); return;
    }
    let raf, last = null;
    const step = now => {
      if (last != null) acc.current += Math.min(0.05, (now - last) / 1000);
      last = now;
      setClock(acc.current);
      if (acc.current >= TOTAL && !done.current) { done.current = true; cb.current && cb.current(); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready, visible, time]);

  const A = time != null ? time : clock;
  const T = Math.min(A, TOTAL);
  const settle = draw(0, 1, CUE.cielo, CUE.titulo)(T);
  const zoom = 1.32 - 0.32 * settle + tw(0, 0.03, CUE.titulo, TOTAL)(T);
  const sd = T - T_LAND, amp = sd >= 0 && sd < 0.2 ? 10 * (1 - sd / 0.2) : 0;

  return (
    <div ref={root} role="img" aria-label="La Guardia de Elune" style={{ position: 'relative', width: size, height: size, background, pointerEvents: 'none' }}>
      {(ready || time != null) && (
        <div style={{ position: P, left: 0, top: 0, width: 1040, height: 1040, transformOrigin: '0 0', transform: `scale(${size / 1040})` }}>
          <div style={{ position: P, inset: 0, transform: `translate(${amp * Math.sin(sd * 170)}px, ${amp * 0.7 * Math.cos(sd * 230)}px)` }}>
            <div style={{ position: P, inset: 0, transformOrigin: `${px(1024)}px ${px(705)}px`, transform: `translateY(${150 * (1 - settle)}px) scale(${zoom})`, willChange: 'transform' }}>
              <Night T={T} A={A} />
              <Moon T={T} A={A} src={src.moon} />
              <Ring T={T} src={src.ring} />
              <TitleGlow T={T} />
              <Title T={T} src={src} />
              <Dust T={T} />
              <Gem T={T} src={src} />
              <Shine T={T} src={src} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
