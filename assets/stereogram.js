// Hero stereogram for DepthWeaver.
// Generates a real SIRDS (single-image random-dot stereogram) of a sphere
// using the Thimbleby–Inglis–Witten linking algorithm. Cross your eyes
// (or click "Reveal") to see the hidden depth pop forward.

(() => {
  const root = document.querySelector('.stereogram');
  if (!root) return;

  const canvas    = root.querySelector('canvas');
  const revealBtn = root.querySelector('.stereogram__reveal');
  if (!canvas) return;

  // Off-screen depth canvas (revealed on toggle).
  const depthCanvas = document.createElement('canvas');

  let revealed = false;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    // Cap density for performance; the stereogram is decorative.
    const targetW = Math.min(900, Math.round(rect.width * (window.devicePixelRatio > 1 ? 1 : 1)));
    const targetH = Math.round(targetW * (rect.height / rect.width));
    canvas.width        = targetW;
    canvas.height       = targetH;
    depthCanvas.width   = targetW;
    depthCanvas.height  = targetH;
    render();
  }

  function makeDepthMap(w, h) {
    // A central sphere (Magic Eye canon) plus a smaller satellite for personality.
    const map = new Float32Array(w * h);
    const cx = w * 0.52, cy = h * 0.52;
    const r  = Math.min(w, h) * 0.34;
    const sx = w * 0.18, sy = h * 0.28, sr = Math.min(w, h) * 0.11;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let z = 0;
        const dx = x - cx, dy = y - cy;
        const d  = Math.hypot(dx, dy);
        if (d < r) {
          const k = d / r;
          z = Math.sqrt(1 - k * k);          // hemisphere
        }
        const dx2 = x - sx, dy2 = y - sy;
        const d2  = Math.hypot(dx2, dy2);
        if (d2 < sr) {
          const k2 = d2 / sr;
          const z2 = Math.sqrt(1 - k2 * k2) * 0.55;
          if (z2 > z) z = z2;
        }
        map[y * w + x] = z;
      }
    }
    return map;
  }

  // Tiny tile of branded random dots — bone on ink with sparse vermillion.
  function paletteColors() {
    return [
      [11, 14, 20, 255],     // ink
      [11, 14, 20, 255],     // ink (weight)
      [234, 229, 214, 255],  // bone
      [234, 229, 214, 255],  // bone
      [142, 136, 120, 255],  // bone-muted
      [255, 77, 46, 255]     // vermillion sparkle
    ];
  }

  function renderStereogram() {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const depth = makeDepthMap(w, h);
    const palette = paletteColors();

    // Eye separation in pixels — keep it small relative to width so the
    // hidden image fits comfortably on most screens.
    const E  = Math.max(48, Math.round(w * 0.16));
    const mu = 1 / 3;

    // Per-row processing.
    const link = new Int32Array(w);
    const px   = new Uint8Array(w * 4);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) link[x] = x;

      for (let x = 0; x < w; x++) {
        const z   = depth[y * w + x];
        const sep = Math.round((1 - mu * z) * E / (2 - mu * z));
        const left  = x - (sep >> 1);
        const right = left + sep;
        if (left >= 0 && right < w) {
          // Walk to the canonical representative (union–find without rank).
          let l = left, r = right;
          while (link[l] !== l) l = link[l];
          while (link[r] !== r) r = link[r];
          if (l !== r) link[r] = l;
        }
      }

      for (let x = 0; x < w; x++) {
        let t = x;
        while (link[t] !== t) t = link[t];
        if (t === x) {
          const c = palette[(Math.random() * palette.length) | 0];
          px[x * 4]     = c[0];
          px[x * 4 + 1] = c[1];
          px[x * 4 + 2] = c[2];
          px[x * 4 + 3] = c[3];
        } else {
          px[x * 4]     = px[t * 4];
          px[x * 4 + 1] = px[t * 4 + 1];
          px[x * 4 + 2] = px[t * 4 + 2];
          px[x * 4 + 3] = px[t * 4 + 3];
        }
      }

      const rowOffset = y * w * 4;
      data.set(px, rowOffset);
    }

    ctx.putImageData(img, 0, 0);
  }

  function renderDepth() {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const depth = makeDepthMap(w, h);
    for (let i = 0; i < depth.length; i++) {
      const z = depth[i];
      // bone-on-ink ramp with vermillion outline at the rim
      const rim = z > 0 && z < 0.05 ? 1 : 0;
      const v = rim ? 0 : Math.round(11 + z * (234 - 11));
      data[i * 4]     = rim ? 255 : v;
      data[i * 4 + 1] = rim ? 77  : v;
      data[i * 4 + 2] = rim ? 46  : v;
      data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function render() {
    if (revealed) renderDepth();
    else renderStereogram();
  }

  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      revealed = !revealed;
      revealBtn.setAttribute('aria-pressed', String(revealed));
      revealBtn.textContent = revealed ? 'Hide' : 'Reveal';
      render();
    });
  }

  fit();

  // Re-fit on viewport changes — debounced.
  let resizeId;
  window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(fit, 200);
  });
})();
