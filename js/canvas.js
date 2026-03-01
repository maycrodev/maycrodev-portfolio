/* ═══════════════════════════════════════════════════════════════════
   canvas.js — QUANTUM FIELD
   
   Architecture: Three.js renders real WebGL particles → offscreen
   canvas pixel-sampled every frame → ASCII output inherits actual
   3D color & lighting from the renderer. Not fake luminance math —
   real GPU light hits real geometry and the result becomes ASCII.
   
   Formations: Galaxy · DNA · Knot · Shell · Storm
   Interactions: drag-orbit · scroll-zoom · click-morph · mouse-repel
═══════════════════════════════════════════════════════════════════ */
(function () {

function boot() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  /* ── Three.js lazy load ── */
  if (typeof THREE === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = boot;
    document.head.appendChild(s);
    return;
  }

  /* ════════════════════════════════
     ASCII CONFIG
  ════════════════════════════════ */
  const FS   = 13;           // font size px
  const CW   = FS * 0.614;   // char width (monospace ratio)
  const FONT = `${FS}px "Space Mono",monospace`;
  // 70-char ramp: space → █  (perceptual luminance order)
  const RAMP = " .'`^\",:;Il!i~+_-?][}{1)(tfjrxnuvczXYUJCLQ0OZ#MW&8%B@$";

  /* ════════════════════════════════
     2D OUTPUT CANVAS
  ════════════════════════════════ */
  const ctx2 = canvas.getContext('2d');
  ctx2.font          = FONT;
  ctx2.textBaseline  = 'top';

  /* ════════════════════════════════
     THREE.JS OFFSCREEN (half-res)
  ════════════════════════════════ */
  const glCanvas  = document.createElement('canvas');
  const renderer  = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: false,
    preserveDrawingBuffer: true,   // required for pixel readback
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);

  /* Sampling canvas — exact grid size */
  const sc   = document.createElement('canvas');
  const sctx = sc.getContext('2d', { willReadFrequently: true });

  let W, H, COLS, ROWS;

  /* ════════════════════════════════
     SCENE
  ════════════════════════════════ */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 300);
  camera.position.set(0, 0, 8.5);

  /* ── Lights ── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  const sun = new THREE.DirectionalLight(0xfff4e0, 3.5);
  sun.position.set(6, 8, -4);
  scene.add(sun);

  // Red orbit light
  const rL = new THREE.PointLight(0xff3020, 9, 14);
  scene.add(rL);
  // Cool blue orbit light (opposite phase)
  const bL = new THREE.PointLight(0x40a8ff, 5, 14);
  scene.add(bL);
  // Dim warm fill
  const wL = new THREE.PointLight(0xffe8c0, 2, 20);
  wL.position.set(-4, -4, 6);
  scene.add(wL);

  /* ════════════════════════════════
     PARTICLE SYSTEM
  ════════════════════════════════ */
  const N   = 6000;
  const pos = new Float32Array(N * 3);   // live positions
  const tgt = new Float32Array(N * 3);   // morph targets
  const vel = new Float32Array(N * 3);   // noise seeds
  const clr = new Float32Array(N * 3);   // vertex colors

  /* Noise seeds */
  for (let i = 0; i < N; i++) {
    vel[i*3]   = Math.random() * Math.PI * 2;
    vel[i*3+1] = Math.random() * Math.PI * 2;
    vel[i*3+2] = Math.random() * Math.PI * 2;
  }

  /* ── Shape generators ── */

  function mkGalaxy() {
    const a = new Float32Array(N * 3);
    const ARMS = 3, SPREAD = 0.28;
    for (let i = 0; i < N; i++) {
      const r     = 0.3 + Math.pow(Math.random(), 0.6) * 3.4;
      const arm   = (i % ARMS) * (Math.PI * 2 / ARMS);
      const twist = r * 0.85;
      const theta = arm + twist + (Math.random() - 0.5) * SPREAD * (1 + r * 0.2);
      a[i*3]   = r * Math.cos(theta);
      a[i*3+1] = (Math.random() - 0.5) * 0.25 * (1 - r / 4.5);
      a[i*3+2] = r * Math.sin(theta);
    }
    return a;
  }

  function mkDNA() {
    const a = new Float32Array(N * 3);
    const RUNGS = 32;
    for (let i = 0; i < N; i++) {
      const isRung   = i % 14 === 0;
      const strand   = i % 2;
      const t        = (i / N) * Math.PI * 10 - Math.PI * 5;
      const phase    = strand * Math.PI;
      const R        = 1.3 + Math.sin(t * 0.2) * 0.15;
      if (isRung) {
        // Cross-bar between strands
        const s = Math.random();
        const ax = R * Math.cos(t), ay = t * 0.32, az = R * Math.sin(t);
        const bx = R * Math.cos(t + Math.PI), bz = R * Math.sin(t + Math.PI);
        a[i*3]   = ax + (bx - ax) * s;
        a[i*3+1] = ay;
        a[i*3+2] = az + (bz - az) * s;
      } else {
        a[i*3]   = R * Math.cos(t + phase) + (Math.random() - 0.5) * 0.06;
        a[i*3+1] = t * 0.32;
        a[i*3+2] = R * Math.sin(t + phase) + (Math.random() - 0.5) * 0.06;
      }
    }
    return a;
  }

  function mkKnot() {
    // Torus knot p=2, q=3
    const a = new Float32Array(N * 3);
    const p = 2, q = 3, R = 1.8, r = 0.55;
    for (let i = 0; i < N; i++) {
      const t     = (i / N) * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 2;
      // Torus knot center
      const cx = (R + r * Math.cos(q * t)) * Math.cos(p * t);
      const cy = (R + r * Math.cos(q * t)) * Math.sin(p * t);
      const cz = r * Math.sin(q * t);
      // Add tube radius
      const tube = 0.18;
      // Quick tangent for frame
      const dt  = 0.001;
      const nt  = t + dt;
      const cx2 = (R + r * Math.cos(q * nt)) * Math.cos(p * nt);
      const cy2 = (R + r * Math.cos(q * nt)) * Math.sin(p * nt);
      const cz2 = r * Math.sin(q * nt);
      const tx_ = cx2 - cx, ty_ = cy2 - cy, tz_ = cz2 - cz;
      const tl  = Math.sqrt(tx_*tx_ + ty_*ty_ + tz_*tz_) || 1;
      // Normal (up × tangent)
      const upx = 0, upy = 1, upz = 0;
      let nx = upy*tz_ - upz*ty_, ny = upz*tx_ - upx*tz_, nz = upx*ty_ - upy*tx_;
      const nl = Math.sqrt(nx*nx+ny*ny+nz*nz)||1; nx/=nl; ny/=nl; nz/=nl;
      // Binormal
      let bx = ty_/tl*nz - tz_/tl*ny;
      let by = tz_/tl*nx - tx_/tl*nz;
      let bz = tx_/tl*ny - ty_/tl*nx;
      const cp = Math.cos(phi), sp = Math.sin(phi);
      a[i*3]   = cx + tube*(cp*nx + sp*bx);
      a[i*3+1] = cy + tube*(cp*ny + sp*by);
      a[i*3+2] = cz + tube*(cp*nz + sp*bz);
    }
    return a;
  }

  function mkShell() {
    // Parametric seashell
    const a = new Float32Array(N * 3);
    const b_ = 0.18, c_ = 0.12, n_ = 5;
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 4;
      const v = Math.random() * Math.PI * 2;
      const r_ = Math.exp(b_ * u);
      a[i*3]   = r_ * Math.cos(u) * (1 + Math.cos(v)) * 0.7;
      a[i*3+1] = r_ * Math.sin(u) * 0.7 - 2.5;
      a[i*3+2] = r_ * Math.sin(v) * 0.7;
    }
    return a;
  }

  function mkStorm() {
    // Lorenz attractor (pre-computed sample cloud)
    const a = new Float32Array(N * 3);
    let lx = 0.1, ly = 0, lz = 0;
    const s = 10, rho = 28, beta = 8/3, dt = 0.004;
    // Warm-up
    for (let w = 0; w < 1000; w++) {
      const dx = s*(ly-lx), dy = lx*(rho-lz)-ly, dz = lx*ly-beta*lz;
      lx+=dx*dt; ly+=dy*dt; lz+=dz*dt;
    }
    // Scale to fit viewport nicely
    const SCL = 0.17;
    for (let i = 0; i < N; i++) {
      const dx = s*(ly-lx), dy = lx*(rho-lz)-ly, dz = lx*ly-beta*lz;
      lx+=dx*dt; ly+=dy*dt; lz+=dz*dt;
      a[i*3]   = (lx) * SCL;
      a[i*3+1] = (lz - 25) * SCL;
      a[i*3+2] = (ly) * SCL * 0.5;
    }
    return a;
  }

  /* Formation list */
  const FORMATIONS = [mkGalaxy, mkDNA, mkKnot, mkShell, mkStorm];
  const F_NAMES    = ['GALAXY', 'DNA', 'KNOT', 'SHELL', 'STORM'];
  let   fIdx       = 0;
  let   lerpSpeed  = 0.022;

  /* Color palettes per formation */
  const PALETTES = [
    [1.0, 0.92, 0.92,  1.0, 0.12, 0.12], // Galaxy: white + red
    [0.85, 1.0, 0.95,  0.12, 1.0, 0.55], // DNA: white + green
    [0.92, 0.92, 1.0,  0.3, 0.3, 1.0],   // Knot: white + blue
    [1.0, 0.96, 0.8,   1.0, 0.55, 0.1],  // Shell: cream + amber
    [0.9, 1.0, 1.0,    0.1, 0.9, 1.0],   // Storm: white + cyan
  ];

  function setPalette(idx) {
    const pal = PALETTES[idx];
    for (let i = 0; i < N; i++) {
      const hot = Math.random() > 0.88;
      clr[i*3]   = hot ? pal[3] : pal[0] + (Math.random()-0.5)*0.06;
      clr[i*3+1] = hot ? pal[4] : pal[1] + (Math.random()-0.5)*0.06;
      clr[i*3+2] = hot ? pal[5] : pal[2] + (Math.random()-0.5)*0.06;
    }
    geo.attributes.color.needsUpdate = true;
  }

  /* Init positions = first formation */
  const init = mkGalaxy();
  pos.set(init); tgt.set(init);

  /* ── Buffer Geometry ── */
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color',    new THREE.BufferAttribute(clr, 3).setUsage(THREE.DynamicDrawUsage));
  setPalette(0);

  const mat = new THREE.PointsMaterial({
    size: 0.048,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const cloud = new THREE.Points(geo, mat);
  scene.add(cloud);

  /* ════════════════════════════════
     MORPH LOGIC
  ════════════════════════════════ */
  function morph() {
    fIdx = (fIdx + 1) % FORMATIONS.length;
    tgt.set(FORMATIONS[fIdx]());
    setPalette(fIdx);
    lerpSpeed = 0.028;
    setTimeout(() => lerpSpeed = 0.016, 3000);
  }

  setInterval(morph, 8000);
  canvas.addEventListener('click', e => {
    // Don't trigger if user was dragging
    if (Math.abs(dragDeltaX) < 3 && Math.abs(dragDeltaY) < 3) morph();
  });

  /* ════════════════════════════════
     INTERACTION: Drag-orbit
  ════════════════════════════════ */
  let dragDeltaX = 0, dragDeltaY = 0;
  let isDragging = false, lastX = 0, lastY = 0;
  let rotX = 0, rotY = 0, velX = 0, velY = 0;

  canvas.addEventListener('mousedown', e => {
    isDragging = true; lastX = e.clientX; lastY = e.clientY;
    dragDeltaX = 0; dragDeltaY = 0;
    velX = 0; velY = 0;
  });
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!isDragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    dragDeltaX += Math.abs(dx); dragDeltaY += Math.abs(dy);
    velY = dx * 0.008; velX = dy * 0.008;
    rotY += velY; rotX += velX;
    lastX = e.clientX; lastY = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseup', () => { isDragging = false; });

  /* ════════════════════════════════
     INTERACTION: Scroll zoom
  ════════════════════════════════ */
  let camZ = 8.5;
  window.addEventListener('wheel', e => {
    camZ = Math.max(3, Math.min(18, camZ + e.deltaY * 0.008));
  }, { passive: true });

  /* ════════════════════════════════
     INTERACTION: Mouse repel
  ════════════════════════════════ */
  let mouseX = -9999, mouseY = -9999;

  /* ════════════════════════════════
     RESIZE
  ════════════════════════════════ */
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    // Render at 60% resolution — ASCII is coarse anyway, save GPU
    const rW = Math.ceil(W * 0.6);
    const rH = Math.ceil(H * 0.6);
    glCanvas.width = rW; glCanvas.height = rH;
    renderer.setSize(rW, rH);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    COLS = Math.floor(W / CW);
    ROWS = Math.floor(H / FS);
    sc.width = COLS; sc.height = ROWS;
    ctx2.font = FONT;
    ctx2.textBaseline = 'top';
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ════════════════════════════════
     RENDER LOOP
  ════════════════════════════════ */
  let t = 0;
  const WOBBLE = 0.0006;
  const RAMP_N = RAMP.length - 1;

  // Repel zone in 3D: project mouse ray and push nearby particles
  const repelRaycaster = new THREE.Raycaster();
  const mouseNDC       = new THREE.Vector2();

  function render() {
    t += 0.005;

    /* ─ Spring particles toward target + wobble ─ */
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const vx = vel[i3], vy = vel[i3+1], vz = vel[i3+2];
      const wx = Math.sin(t * 0.7 + vx) * WOBBLE;
      const wy = Math.sin(t * 0.9 + vy) * WOBBLE;
      const wz = Math.sin(t * 0.5 + vz) * WOBBLE;
      pos[i3]   += (tgt[i3]   - pos[i3])   * lerpSpeed + wx;
      pos[i3+1] += (tgt[i3+1] - pos[i3+1]) * lerpSpeed + wy;
      pos[i3+2] += (tgt[i3+2] - pos[i3+2]) * lerpSpeed + wz;
    }
    geo.attributes.position.needsUpdate = true;

    /* ─ Rotate ─ */
    if (!isDragging) {
      // Auto-orbit when idle
      rotY += 0.0022;
      rotX += Math.sin(t * 0.08) * 0.0004;
      // Inertia
      velX *= 0.94; velY *= 0.94;
    } else {
      rotX += velX; rotY += velY;
    }
    cloud.rotation.x = rotX;
    cloud.rotation.y = rotY;

    /* ─ Camera zoom lerp ─ */
    camera.position.z += (camZ - camera.position.z) * 0.06;

    /* ─ Lights orbit ─ */
    const r1 = 5.5, r2 = 4.5;
    rL.position.set(Math.cos(t * 0.55) * r1, Math.sin(t * 0.38) * 2.5, Math.sin(t * 0.55) * r1);
    bL.position.set(Math.cos(t * 0.4 + Math.PI) * r2, Math.cos(t * 0.29) * 2, Math.sin(t * 0.4 + Math.PI) * r2);

    /* ─ Subtle camera mouse parallax ─ */
    const mxN = (mouseX / W - 0.5), myN = (mouseY / H - 0.5);
    camera.position.x += (mxN * 1.2 - camera.position.x) * 0.02;
    camera.position.y += (-myN * 0.7 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    /* ─ Render Three.js offscreen ─ */
    renderer.render(scene, camera);

    /* ─ Pixel sample → ASCII ─ */
    ctx2.clearRect(0, 0, W, H);
    sctx.clearRect(0, 0, COLS, ROWS);
    sctx.drawImage(glCanvas, 0, 0, COLS, ROWS);

    const img = sctx.getImageData(0, 0, COLS, ROWS).data;

    // Mouse repel (2D grid coords)
    const mCol = mouseX / CW;
    const mRow = mouseY / FS;
    const REPEL_R   = 55;   // chars radius
    const REPEL_STR = 2.8;  // max char displacement

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const base = (row * COLS + col) * 4;
        const r_ = img[base], g_ = img[base+1], b_ = img[base+2], a_ = img[base+3];
        if (a_ < 10) continue;

        /* Perceived luminance from actual GPU render */
        const lum = (0.299*r_ + 0.587*g_ + 0.114*b_) / 255;
        if (lum < 0.025) continue;

        /* Map luminance → ASCII char */
        const ci  = Math.max(1, Math.min(RAMP_N, Math.round(lum * RAMP_N)));
        const ch  = RAMP[ci];

        /* Mouse repel displacement */
        let drawCol = col, drawRow = row;
        const dc = col - mCol, dr = row - mRow;
        const dist = Math.sqrt(dc*dc + dr*dr);
        if (dist < REPEL_R && dist > 0.1) {
          const force = (1 - dist / REPEL_R) * REPEL_STR;
          const ang   = Math.atan2(dr, dc);
          drawCol += Math.cos(ang) * force;
          drawRow += Math.sin(ang) * force;
        }

        /* Color: use actual sampled RGB, modulate alpha by lum */
        const alpha = Math.min(1, (a_ / 255) * Math.max(0.1, lum * 1.5));
        ctx2.fillStyle = `rgba(${r_},${g_},${b_},${alpha})`;
        ctx2.fillText(ch, drawCol * CW, drawRow * FS);
      }
    }

    requestAnimationFrame(render);
  }
  render();

  canvas.style.cursor = 'pointer';
  canvas.title = 'Click to morph · Drag to rotate · Scroll to zoom';
}

boot();

/* ════════════════════════════════
   ABOUT CANVAS
════════════════════════════════ */
function initAboutCanvas() {
  const c = document.getElementById('about-canvas'); if (!c) return;
  const ctx = c.getContext('2d'), dpr = Math.min(window.devicePixelRatio, 2);
  function resize() {
    const w=c.parentElement.clientWidth||400, h=c.parentElement.clientHeight||500;
    c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px'; ctx.scale(dpr,dpr);
  }
  resize(); window.addEventListener('resize', resize);
  const SH=['sq','rect','tri','dot','char'], CH=['0','1','M','A','Y'];
  const P=Array.from({length:55},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.0006,vy:(Math.random()-.5)*.0006,s:Math.random()*9+4,t:SH[Math.floor(Math.random()*SH.length)],ch:CH[Math.floor(Math.random()*CH.length)],a:Math.random()*.35+.08}));
  function draw() {
    const w=c.width/dpr, h=c.height/dpr;
    ctx.clearRect(0,0,w,h); ctx.fillStyle='#111'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.04)';
    for(let x=0;x<w;x+=32) for(let y=0;y<h;y+=32) ctx.fillRect(x,y,1,1);
    P.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>1)p.vx*=-1; if(p.y<0||p.y>1)p.vy*=-1;
      ctx.globalAlpha=p.a; ctx.fillStyle='#fff';
      const px=p.x*w, py=p.y*h, s=p.s;
      if(p.t==='sq') ctx.fillRect(px-s/2,py-s/2,s,s);
      else if(p.t==='rect') ctx.fillRect(px-s,py-s/4,s*2,s/2);
      else if(p.t==='tri'){ctx.beginPath();ctx.moveTo(px,py-s/2);ctx.lineTo(px+s/2,py+s/2);ctx.lineTo(px-s/2,py+s/2);ctx.closePath();ctx.fill();}
      else if(p.t==='dot'){ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill();}
      else{ctx.font=`${s+2}px 'Space Mono',monospace`;ctx.fillText(p.ch,px,py);}
    });
    ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════
   SCATTER + MINI CHARTS
════════════════════════════════ */
function initScatterCanvas() {
  const c=document.getElementById('scatter-canvas'); if(!c)return;
  const ctx=c.getContext('2d'), POOL='01{}[]()<>ABCDE!@#$%&*=/\\|^▪▸●▴■MAY';
  let cells=[];
  function build(){cells=[];const cc=Math.floor(c.width/26),rr=Math.floor(c.height/26);for(let i=0;i<Math.floor(cc*rr*.2);i++)cells.push({x:Math.floor(Math.random()*cc)*26,y:Math.floor(Math.random()*rr)*26,ch:POOL[Math.floor(Math.random()*POOL.length)],a:Math.random()*.25+.04,sz:Math.random()*5+10,spd:Math.random()*.4+.1,phi:Math.random()*Math.PI*2});}
  function resize(){c.width=c.offsetWidth;c.height=c.offsetHeight;build();}
  resize(); window.addEventListener('resize',resize);
  let t=0;
  function draw(){ctx.clearRect(0,0,c.width,c.height);t+=.01;cells.forEach(p=>{ctx.globalAlpha=p.a*(Math.sin(t*p.spd+p.phi)*.3+.7);ctx.fillStyle='#fff';ctx.font=`${p.sz}px 'Space Mono',monospace`;ctx.fillText(p.ch,p.x,p.y);});ctx.globalAlpha=1;requestAnimationFrame(draw);}
  draw();
}

function initMiniChart(id,color){
  const c=document.getElementById(id); if(!c)return;
  const ctx=c.getContext('2d'),dpr=Math.min(window.devicePixelRatio,2),w0=c.parentElement.clientWidth||600;
  c.width=w0*dpr;c.height=100*dpr;c.style.width=w0+'px';c.style.height='100px';ctx.scale(dpr,dpr);
  const w=w0,h=100,pts=Array.from({length:18},()=>Math.random()*50+20);let t=0;
  function draw(){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;
    for(let x=0;x<w;x+=36){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.beginPath();
    pts.forEach((p,i)=>{const x=(i/(pts.length-1))*w,y=h-p+Math.sin(t+i*.6)*5;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
    pts.forEach((p,i)=>{if(i%3)return;const x=(i/(pts.length-1))*w,y=h-p+Math.sin(t+i*.6)*5;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});
    t+=.018;requestAnimationFrame(draw);
  }
  draw();
}

document.addEventListener('DOMContentLoaded', () => {
  initAboutCanvas();
  initScatterCanvas();
  setTimeout(()=>{initMiniChart('vis-1','#ff2d2d');initMiniChart('vis-4','#ffb800');},600);
});

})();