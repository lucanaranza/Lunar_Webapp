/* =====================================================================
   L.A.N.D. – WebGL Moon (one renderer for every globe in the site)
   Texture: images/moon-4k.jpg = LROC WAC albedo (NASA SVS CGI Moon Kit) with LOLA relief baked in,
   4096×2048, equirectangular, lon 0 at the centre. The 2k copy loads first so the globe appears at once,
   then the 4k replaces it (mipmaps + anisotropic filtering: sharp when zoomed, no shimmer when far).

   const view = createMoonView(canvas);            // canvas sized by the page (width/height in device px)
   view.draw({ cx, cy, R, dpr, lat, lon, mode });  // centre and radius in CSS px, view centre in degrees
     mode 0 = flat albedo (area selection) · 1 = relief, soft light (history) · 2 = real Sun light (analysis 3D)
     mode 2 extras: sun:[x,y,z], earth:[x,y,z], earthViz:true, ov:{ tex data + projection } (heat map on the surface)
   ===================================================================== */
const MOON_TEX = { img: null, hi: false, waiters: new Set(), p: null };
function moonTexture(onUpgrade) {
  if (onUpgrade) MOON_TEX.waiters.add(onUpgrade);
  if (MOON_TEX.p) return MOON_TEX.p;
  const load = src => new Promise(res => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  MOON_TEX.p = load("images/moon-2k.jpg").then(im => {
    MOON_TEX.img = im;
    load("images/moon-4k.jpg").then(hi => {           // upgrade in the background
      if (!hi) return;
      MOON_TEX.img = hi; MOON_TEX.hi = true;
      for (const fn of MOON_TEX.waiters) { try { fn(hi); } catch (e) { console.warn(e); } }
    });
    return im;
  });
  return MOON_TEX.p;
}

const MOON_FS_BODY = `
uniform vec2 uC; uniform float uR; uniform mat3 uB; uniform int uMode;
uniform vec3 uSun; uniform vec3 uEarth; uniform int uEarthViz;
uniform int uOvOn; uniform vec3 uAc; uniform vec3 uAe; uniform vec3 uAn;
uniform float uOvScale; uniform float uOvS; uniform vec2 uOvC; uniform float uX; uniform float uCosView; uniform float uCosEdge;
void main(){
  vec2 p = (gl_FragCoord.xy - uC) / uR; float r2 = dot(p, p);
  if (r2 > 1.) discard;
  float nz = sqrt(1. - r2);
  vec3 w = uB * vec3(p, nz);
  float lat = asin(clamp(w.z, -1., 1.)), lon = atan(w.y, w.x);
  float u1 = fract(lon / 6.2831853 + .5), u2 = fract(lon / 6.2831853 + 1.) - .5;   // seam at ±180° without a line
  float u = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2;
  vec2 uv = vec2(u, .5 - lat / 3.14159265);
  float g = TEX(uT, uv).r;
  float edge = clamp((1. - sqrt(r2)) * uR * 1.2, 0., 1.);
  vec3 col;
  if (uMode == 0) {
    col = vec3(g * (.72 + .28 * pow(nz, .6)) * 1.04);
  } else if (uMode == 1) {
    vec3 L = normalize(vec3(-.45, .35, .82));
    float lam = max(0., dot(vec3(p, nz), L));
    float v = g * (.30 + .86 * lam) * (.78 + .22 * nz) * 1.08;
    col = vec3(v * 1.03, v * .985, v * .93 + .01);
  } else {
    float lam = max(0., dot(w, uSun)), shine = .05 + .07 * max(0., dot(w, uEarth));   // earthshine
    vec3 c = vec3(1., .98, .95) * g * (shine + 1.05 * lam);
    if (uEarthViz == 1) {
      float de = dot(w, uEarth), dm = degrees(asin(clamp(w.x, -1., 1.)));
      vec3 sky = vec3(56., 189., 248.) / 255.;
      if (de > 0.) c = mix(c, sky, .14);
      if (abs(dm) < 7.9 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 9.) < 2.) c = mix(c, sky, .45);
      if (abs(de) < 1.6 / uR) c = vec3(125., 211., 252.) / 255.;
    }
    if (uOvOn == 1) {
      float ca = dot(w, uAc);
      if (ca > uCosView) {
        vec3 q = w;
        if (uX > 1.) {                       // small areas are drawn enlarged: bring the point back to its real position
          float ang = acos(clamp(ca, -1., 1.));
          if (ang > 1e-6) { vec3 d = normalize(w - ca * uAc); float a2 = ang / uX; q = uAc * cos(a2) + d * sin(a2); } else q = uAc;
        }
        float k = 2. * 1737.4 / (1. + dot(q, uAc));
        vec2 m = vec2(uOvC.x + k * dot(q, uAe) * uOvScale, uOvC.y - k * dot(q, uAn) * uOvScale) / uOvS;
        if (m.x >= 0. && m.y >= 0. && m.x <= 1. && m.y <= 1.) {
          vec4 o = TEX(uOv, m);
          if (o.a > .5) { float kk = uX > 1. ? .95 : .35 + .65 * min(1., lam * 4. + .35); c = o.rgb * kk; }
        }
        if (ca < uCosEdge) c = vec3(127., 211., 255.) / 255.;
      }
    }
    col = c;
  }
  OUT = vec4(col, edge);
}`;

function createMoonView(canvas) {
  const V = { ok: false, gl: null, u: null, tex: null, ov: null, last: null, texSrc: null };
  let gl = null, v2 = true;
  try { gl = canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: false }); } catch (e) {}
  if (!gl) { v2 = false; try { gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false }); } catch (e) {} }
  if (!gl || (!v2 && !gl.getExtension("OES_standard_derivatives"))) return V;
  const vs = v2 ? `#version 300 es\nin vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }` : `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
  const fs = v2 ? `#version 300 es\nprecision highp float; uniform sampler2D uT; uniform sampler2D uOv; out vec4 o;\n#define TEX texture\n#define OUT o\n${MOON_FS_BODY}`
               : `#extension GL_OES_standard_derivatives : enable\nprecision highp float; uniform sampler2D uT; uniform sampler2D uOv;\n#define TEX texture2D\n#define OUT gl_FragColor\n${MOON_FS_BODY}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  try {
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    V.u = { C: U("uC"), R: U("uR"), B: U("uB"), mode: U("uMode"), sun: U("uSun"), earth: U("uEarth"), earthViz: U("uEarthViz"),
            ovOn: U("uOvOn"), ac: U("uAc"), ae: U("uAe"), an: U("uAn"), ovScale: U("uOvScale"), ovS: U("uOvS"), ovC: U("uOvC"),
            X: U("uX"), cosView: U("uCosView"), cosEdge: U("uCosEdge"), T: U("uT"), Ov: U("uOv") };
    gl.uniform1i(V.u.T, 0); gl.uniform1i(V.u.Ov, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    V.gl = gl; V.ok = true;
  } catch (e) { console.warn("WebGL not available", e); return V; }
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  const upload = img => {
    if (!img || (img.naturalWidth > maxTex)) return;
    if (!V.tex) V.tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, V.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, v2 ? gl.R8 || gl.LUMINANCE : gl.LUMINANCE, v2 ? gl.RED : gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const an = gl.getExtension("EXT_texture_filter_anisotropic");
    if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    V.texSrc = img;
    if (V.last) V.draw(V.last);
  };
  V.ready = moonTexture(upload).then(img => { if (!V.tex) upload(MOON_TEX.img || img); return V; });
  if (MOON_TEX.img) upload(MOON_TEX.img);
  // heat-map overlay (analysis 3D view): RGBA pixels of the 2D map
  V.setOverlay = imgData => {
    if (!V.ov) V.ov = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, V.ov);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
  };
  V.draw = o => {
    V.last = o;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!V.tex) return;
    const d = o.dpr || 1, p0 = o.lat * DEG, l0 = o.lon * DEG, sp = Math.sin(p0), cp = Math.cos(p0), sl = Math.sin(l0), cl = Math.cos(l0);
    gl.uniformMatrix3fv(V.u.B, false, [-sl, cl, 0, -sp * cl, -sp * sl, cp, cp * cl, cp * sl, sp]);   // columns: east, north, centre
    gl.uniform2f(V.u.C, o.cx * d, canvas.height - o.cy * d);
    gl.uniform1f(V.u.R, o.R * d);
    gl.uniform1i(V.u.mode, o.mode || 0);
    gl.uniform3fv(V.u.sun, o.sun || [1, 0, 0]); gl.uniform3fv(V.u.earth, o.earth || [1, 0, 0]);
    gl.uniform1i(V.u.earthViz, o.earthViz ? 1 : 0);
    const ov = o.ov;
    gl.uniform1i(V.u.ovOn, ov && V.ov ? 1 : 0);
    if (ov && V.ov) {
      gl.uniform3fv(V.u.ac, ov.c); gl.uniform3fv(V.u.ae, ov.e); gl.uniform3fv(V.u.an, ov.n);
      gl.uniform1f(V.u.ovScale, ov.scale); gl.uniform1f(V.u.ovS, ov.S); gl.uniform2f(V.u.ovC, ov.cx, ov.cy);
      gl.uniform1f(V.u.X, ov.X); gl.uniform1f(V.u.cosView, ov.cosView); gl.uniform1f(V.u.cosEdge, ov.cosEdge);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, V.ov); gl.activeTexture(gl.TEXTURE0);
    }
    gl.bindTexture(gl.TEXTURE_2D, V.tex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return V;
}
// east / north unit vectors at a point (for the overlay projection)
function localBasis(lat, lon) {
  const p = lat * DEG, l = lon * DEG;
  return { c: unit(lat, lon), e: [-Math.sin(l), Math.cos(l), 0], n: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)] };
}
