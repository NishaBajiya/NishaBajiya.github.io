/* Home page only: slowly rotating 3D peptide helix + aptamer hairpin that
   drifts continuously from the top-right of the profile photo, down around
   its right edge (away from the text), to the bottom and back up.
   Positions are in photo-widths from the photo centre (approved by Nisha, v75). */
(function () {
    var START = { x:  0.50, y: -0.50 };
    var END   = { x:  0.01, y:  0.52 };
    var SIZE  = 1.30;          // canvas size in photo-widths
    var TRIP  = 16000;         // ms for one trip START -> END (32 s full cycle)
    var SPIN  = 0.00018;       // rotation speed, radians per ms
    var VIS   = 0.79;          // measured: widest visible molecule / half the canvas

    var host = document.querySelector('.hero-molecule');
    var photo = document.querySelector('.hero-photo');
    if (!host || !photo || !window.THREE) return;
    if (window.matchMedia('(max-width: 720px)').matches) return;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { host.remove(); return; }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(0, 0, 46);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfc8, 0.75));
    var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(12, 18, 22); scene.add(key);
    var rim = new THREE.DirectionalLight(0xf3d9e3, 0.7); rim.position.set(-18, -6, -12); scene.add(rim);

    function mat(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0.05 }); }
    var M = {
        C: mat(0x8d8783), N: mat(0x5470a8), O: mat(0xc0453f), bond: mat(0xc9c2bc),
        P: mat(0xd99a4e), bb: mat(0xb8a79c), b1: mat(0x970747), b2: mat(0xe8b4c8)
    };
    var sph = new THREE.SphereGeometry(1, 28, 20);
    var UP = new THREE.Vector3(0, 1, 0);

    function ball(g, p, r, m) { var s = new THREE.Mesh(sph, m); s.position.copy(p); s.scale.setScalar(r); g.add(s); }
    function stick(g, a, b, r, m) {
        var d = b.clone().sub(a), L = d.length();
        var c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 14), m);
        c.position.copy(a).add(b).multiplyScalar(0.5);
        c.quaternion.setFromUnitVectors(UP, d.normalize());
        g.add(c);
    }
    function V(r, t, y) { return new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)); }

    // peptide alpha-helix, ball-and-stick with a translucent ribbon
    function peptide() {
        var g = new THREE.Group(), n = 16, ca = [], prevC = null;
        for (var i = 0; i < n; i++) {
            var t = i * 100 * Math.PI / 180, y = i * 1.5 - n * 0.75;
            var N = V(1.55, t - 0.5, y - 0.75), A = V(2.3, t, y), Cc = V(1.65, t + 0.5, y + 0.6);
            var O = Cc.clone().add(new THREE.Vector3(Math.cos(t + 0.5) * 0.5, 1.15, Math.sin(t + 0.5) * 0.5));
            var B = V(3.75, t + 0.15, y - 0.25);
            ball(g, N, 0.42, M.N); ball(g, A, 0.46, M.C); ball(g, Cc, 0.44, M.C); ball(g, O, 0.42, M.O); ball(g, B, 0.44, M.C);
            stick(g, N, A, 0.14, M.bond); stick(g, A, Cc, 0.14, M.bond); stick(g, Cc, O, 0.14, M.bond); stick(g, A, B, 0.14, M.bond);
            if (prevC) stick(g, prevC, N, 0.14, M.bond);
            prevC = Cc; ca.push(A);
        }
        g.add(new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ca), 160, 0.55, 14, false),
            new THREE.MeshStandardMaterial({ color: 0x970747, roughness: 0.4, transparent: true, opacity: 0.28, depthWrite: false })
        ));
        g.scale.setScalar(0.95);
        return g;
    }

    // aptamer hairpin: backbone tube, phosphates, base pairs
    function aptamer() {
        var g = new THREE.Group(), bp = 7, r = 4.2, rise = 1.9, s1 = [], s2 = [];
        for (var i = 0; i < bp; i++) {
            var t = i * 36 * Math.PI / 180, y = i * rise - bp * rise / 2;
            s1.push(V(r, t, y)); s2.push(V(r, t + 2.6, y));
        }
        var top = s1[bp - 1].clone().lerp(s2[bp - 1], 0.5).add(new THREE.Vector3(0, 3.4, 0));
        var path = s1.concat([
            s1[bp - 1].clone().add(new THREE.Vector3(0, 1.6, 0)), top,
            s2[bp - 1].clone().add(new THREE.Vector3(0, 1.6, 0))
        ], s2.slice().reverse());
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 200, 0.42, 14, false), M.bb));
        path.forEach(function (p) { ball(g, p, 0.62, M.P); });
        for (var j = 0; j < bp; j++) {
            var a = s1[j], b = s2[j], m = a.clone().lerp(b, 0.5);
            stick(g, a, m, 0.32, j % 2 ? M.b1 : M.b2);
            stick(g, m, b, 0.32, j % 2 ? M.b2 : M.b1);
        }
        return g;
    }

    var root = new THREE.Group(), pep = peptide(), apt = aptamer();
    pep.position.set(-5, 0, 0);
    apt.position.set(6, -1, -2); apt.scale.setScalar(0.8);
    root.add(pep, apt); root.rotation.z = -0.35;   // tilt mirrored for the right side
    scene.add(root);

    // path: interpolate angle and radius around the photo centre
    var a0 = Math.atan2(START.y, START.x), a1 = Math.atan2(END.y, END.x);
    var da = a1 - a0; if (Math.abs(da) > Math.PI) da -= Math.sign(da) * 2 * Math.PI;
    var r0 = Math.hypot(START.x, START.y), r1 = Math.hypot(END.x, END.y);
    function along(t) { var a = a0 + da * t, r = r0 + (r1 - r0) * t; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // furthest the path reaches to the right, in photo-widths
    var maxX = 0;
    for (var s = 0; s <= 100; s++) maxX = Math.max(maxX, along(s / 100).x);

    // On narrower windows the right margin is smaller: shrink the molecule
    // (not below 80%) and pull the path in so nothing is cut at the screen edge.
    var pd = 0, px = 0, kx = 1;
    function resize() {
        pd = photo.offsetWidth;                 // photo diameter in px
        var rect = photo.getBoundingClientRect();
        var room = window.innerWidth - (rect.left + rect.width / 2) - 8;
        var scale = 1;
        kx = Math.min(1, (room - VIS * pd * SIZE / 2) / (pd * maxX));
        if (kx < 0.7) {
            scale = 0.8;
            kx = Math.min(1, (room - VIS * pd * SIZE * scale / 2) / (pd * maxX));
        }
        kx = Math.max(0.35, kx);
        px = Math.round(pd * SIZE * scale);
        renderer.setSize(px, px);
        host.style.width = host.style.height = px + 'px';
    }
    function place(o) {
        host.style.left = (pd / 2 + o.x * kx * pd - px / 2) + 'px';
        host.style.top  = (pd / 2 + o.y * pd - px / 2) + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { rootMargin: '200px' }).observe(host);
    }

    if (reduce) { place(END); renderer.render(scene, camera); host.classList.add('ready'); return; }

    // phase only advances while the molecule is on screen, so it never jumps
    var phase = 0, spin = 0, last = performance.now();
    function frame(now) {
        var dt = Math.min(100, now - last); last = now;
        if (visible) {
            phase = (phase + dt / (2 * TRIP)) % 1;
            spin += dt * SPIN;
            place(along(ease(phase < 0.5 ? phase * 2 : 2 - phase * 2)));
            root.rotation.y = spin;
            renderer.render(scene, camera);
        }
        requestAnimationFrame(frame);
    }
    host.classList.add('ready');
    requestAnimationFrame(frame);
})();
