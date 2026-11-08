"""Drawing primitives, characters (Ollie, Pip, the reef shark) and the reef world."""
import math, os
import numpy as np
import skia

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080
FLOOR = 870

# ---------------------------------------------------------------- utilities

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out_back(x, s=1.7):
    x = clamp(x) - 1
    return x * x * ((s + 1) * x + s) + 1


def lerp(a, b, k):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, k) for x, y in zip(a, b))
    return a + (b - a) * k


def ramp(t, a, b):
    """0 before a, 1 after b, smooth in between."""
    if b <= a:
        return 1.0 if t >= a else 0.0
    return smooth((t - a) / (b - a))


def seq(t, initial, changes, dur=0.5):
    """Value that starts at `initial` and transitions to each (time, value) in `changes`."""
    v = initial
    for (tc, val) in changes:
        if t < tc:
            break
        k = smooth((t - tc) / dur) if dur > 0 else 1.0
        v = lerp(v, val, k)
    return v


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def col(c, a=1.0):
    r, g, b = c[:3]
    return skia.Color(int(clamp(r, 0, 255)), int(clamp(g, 0, 255)), int(clamp(b, 0, 255)), int(clamp(a) * 255))


def shade(c, k):
    """k<0 darken, k>0 lighten."""
    if k < 0:
        return tuple(x * (1 + k) for x in c)
    return tuple(x + (255 - x) * k for x in c)


def hsv(h, s, v):
    i = int(h * 6) % 6
    f = h * 6 - int(h * 6)
    p, q, tt = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    r, g, b = [(v, tt, p), (q, v, p), (p, v, tt), (p, q, v), (tt, p, v), (v, p, q)][i]
    return (r * 255, g * 255, b * 255)


def P(c, a=1.0, stroke=0, cap=True, blur=0, blend=None):
    p = skia.Paint(AntiAlias=True, Color=col(c, a))
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        if cap:
            p.setStrokeCap(skia.Paint.kRound_Cap)
            p.setStrokeJoin(skia.Paint.kRound_Join)
    if blur:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    if blend is not None:
        p.setBlendMode(blend)
    return p


SRCATOP = skia.BlendMode.kSrcATop


def layer(c, alpha=1.0):
    c.saveLayer(None, skia.Paint(Alphaf=float(clamp(alpha))))


def poly(pts, close=True):
    path = skia.Path()
    path.moveTo(*pts[0])
    for p in pts[1:]:
        path.lineTo(*p)
    if close:
        path.close()
    return path


def smooth_path(pts, close=False):
    """Catmull-Rom through points -> cubic path."""
    path = skia.Path()
    n = len(pts)
    path.moveTo(*pts[0])
    rng_ = range(n) if close else range(n - 1)
    for i in rng_:
        p0 = pts[(i - 1) % n] if (close or i > 0) else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (close or i + 2 < n) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        path.cubicTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    if close:
        path.close()
    return path


# ---------------------------------------------------------------- text
_FONTS = {}


def font(name, size):
    key = (name, size)
    if key not in _FONTS:
        tf = skia.Typeface.MakeFromFile(os.path.join(HERE, "assets", "fonts", name + ".ttf"))
        f = skia.Font(tf, size)
        f.setEdging(skia.Font.Edging.kAntiAlias)
        _FONTS[key] = f
    return _FONTS[key]


def text(c, s, x, y, size, color=(255, 255, 255), a=1.0, name="Fredoka-Bold", align="center",
         outline=None, ow=0, shadow=True):
    if a <= 0.001:
        return 0
    f = font(name, int(size))
    w = f.measureText(s)
    if align == "center":
        x -= w / 2
    elif align == "right":
        x -= w
    if shadow:
        c.drawString(s, x + size * 0.04, y + size * 0.06, f, P((0, 30, 60), 0.35 * a, blur=size * 0.04))
    if outline is not None and ow > 0:
        c.drawString(s, x, y, f, P(outline, a, stroke=ow))
    c.drawString(s, x, y, f, P(color, a))
    return w


def text_width(s, size, name="Fredoka-Bold"):
    return font(name, int(size)).measureText(s)


def pill(c, x, y, w, h, color, a=1.0, r=None, outline=None):
    rr = skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x, y, w, h), r or h / 2, r or h / 2)
    c.drawRRect(rr.makeOffset(4, 6) if hasattr(rr, "makeOffset") else rr, P((0, 30, 60), 0.25 * a, blur=8))
    c.drawRRect(rr, P(color, a))
    if outline:
        c.drawRRect(rr, P(outline, a, stroke=4))


def label(c, s, x, y, size=44, bg=(255, 255, 255), fg=(30, 60, 90), a=1.0, scale=1.0):
    if a <= 0.001 or scale <= 0.001:
        return
    c.save()
    c.translate(x, y)
    c.scale(scale, scale)
    w = text_width(s, size) + size * 0.9
    h = size * 1.45
    pill(c, -w / 2, -h / 2, w, h, bg, a)
    text(c, s, 0, size * 0.36, size, fg, a, shadow=False)
    c.restore()


# ---------------------------------------------------------------- Ollie the octopus

OLLIE_ORANGE = hexc("#FF8A2B")
SUCKER = hexc("#FFD9C2")

EXPR = {
    #            brow_y brow_tilt lid  smile  mouth0 brow_h
    "neutral":  (-46, 0.0, 0.00, 0.35, 0.0, 1.0),
    "happy":    (-50, -0.05, 0.00, 0.9, 0.0, 1.0),
    "excited":  (-58, -0.1, 0.00, 1.0, 0.45, 1.0),
    "surprised": (-64, -0.12, 0.00, 0.0, 0.55, 1.0),
    "worried":  (-52, 0.35, 0.05, -0.4, 0.0, 1.0),
    "scared":   (-60, 0.45, 0.00, -0.6, 0.3, 1.0),
    "grumpy":   (-40, -0.45, 0.30, -0.7, 0.0, 1.0),
    "focus":    (-40, -0.2, 1.00, 0.1, 0.0, 1.0),
    "calm":     (-48, 0.05, 0.45, 0.5, 0.0, 1.0),
    "sly":      (-44, -0.15, 0.35, 0.8, 0.0, 1.0),
    "hidden":   (-44, 0.1, 0.55, 0.0, 0.0, 0.0),
}


def expr_params(e):
    if isinstance(e, str):
        return EXPR[e]
    return e


class Octo:
    """State bag for one frame of Ollie."""

    def __init__(self, **kw):
        self.color = OLLIE_ORANGE
        self.wipe_color = None
        self.wipe = 0.0
        self.patterns = []  # (kind, amount, extra)
        self.bumps = 0.0
        self.spikes = 0.0
        self.flat = 0.0
        self.alpha = 1.0
        self.face_alpha = 1.0
        self.expr = EXPR["happy"]
        self.mouth = 0.0
        self.look = (0.0, 0.0)
        self.blink = 0.0
        self.trail = 0.0
        self.wave = 0.0
        self.arms_up = 0.0
        self.glow = 0.0
        self.blush = 0.0
        self.squash = 0.0
        self.tilt = 0.0
        self.sucker_alpha = 1.0
        self.wiggle = 1.0
        self.hands_eyes = 0.0
        self.__dict__.update(kw)


_rs = np.random.default_rng(11)
SPOTS = [(_rs.uniform(-120, 120), _rs.uniform(-200, 300), _rs.uniform(10, 22)) for _ in range(46)]
SPECK = [(_rs.uniform(-330, 330), _rs.uniform(-215, 330), _rs.uniform(2.5, 9), _rs.integers(0, 4)) for _ in range(900)]
BUMPS = []
for gy in range(-210, 330, 24):
    for gx in range(-330, 340, 24):
        BUMPS.append((gx + (12 if (gy // 24) % 2 else 0) + _rs.uniform(-4, 4), gy + _rs.uniform(-4, 4), _rs.uniform(0.7, 1.2)))


def mantle_path(breath):
    sy = 1 + 0.025 * breath
    p = skia.Path()
    pts = [(0, -205), (75, -205, 125, -150, 122, -80), (120, -20, 108, 22, 96, 52),
           (60, 78, -60, 78, -96, 52), (-108, 22, -120, -20, -122, -80), (-125, -150, -75, -205, 0, -205)]
    f = lambda y: 52 + (y - 52) * sy
    p.moveTo(0, f(-205))
    for q in pts[1:]:
        p.cubicTo(q[0], f(q[1]), q[2], f(q[3]), q[4], f(q[5]))
    p.close()
    return p


def arm_geom(i, t, o):
    """Return centerline points and widths of arm i (0..7, left to right)."""
    n = 18
    k = i / 7.0
    base_x = -88 + 176 * k
    base_y = 46
    a_norm = 152 - 124 * k
    a_flat = 182 - 184 * k
    ang = math.radians(lerp(a_norm, a_flat, o.flat))
    front = i in (1, 3, 4, 6)
    L = (210 if front else 235) * (1 + 0.25 * o.flat)
    side = 1 if k < 0.5 else -1
    curl = math.radians(70) * side * (1 - 0.6 * o.flat)
    # trailing when swimming
    ang += math.radians(-o.trail * 50) * (1 - abs(k - 0.5))
    # arms up
    if o.arms_up > 0 and i in (0, 7, 1, 6):
        up = math.radians(115 if i in (0, 7) else 80) * o.arms_up * (1 if side > 0 else -1)
        ang += up
    if o.wave > 0 and i == 7:
        ang -= math.radians(120) * o.wave + math.radians(18) * math.sin(t * 9) * o.wave
    pts, ws = [], []
    x, y = base_x, base_y
    step = L / n
    ph = t * 2.4 * o.wiggle + i * 0.9
    for j in range(n + 1):
        s = j / n
        th = ang + curl * s * s + math.sin(ph - s * 4.5) * 0.32 * s * o.wiggle * (1 - 0.7 * o.flat)
        pts.append((x, y))
        ws.append(40 * (1 - s) ** 0.85 + 4)
        x += math.cos(th) * step
        y += math.sin(th) * step
    return pts, ws, front


def arm_path(pts, ws):
    left, right = [], []
    for j in range(len(pts)):
        a = pts[max(0, j - 1)]
        b = pts[min(len(pts) - 1, j + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        w = ws[j] / 2
        left.append((pts[j][0] + nx * w, pts[j][1] + ny * w))
        right.append((pts[j][0] - nx * w, pts[j][1] - ny * w))
    outline = left + [(pts[-1][0] + (pts[-1][0] - pts[-2][0]) * 0.3, pts[-1][1] + (pts[-1][1] - pts[-2][1]) * 0.3)] + right[::-1]
    return smooth_path(outline, close=True), right


def octo_patterns(c, o, t):
    """Paint wipe, patterns and texture with SrcATop into the current layer."""
    if o.wipe_color is not None and o.wipe > 0:
        yb = -230 + o.wipe * 600
        pts = [(-400, -260)]
        for xx in range(-400, 401, 40):
            pts.append((xx, yb + 18 * math.sin(xx * 0.03 + t * 6)))
        pts.append((400, -260))
        c.drawPath(poly(pts), P(o.wipe_color, 1, blend=SRCATOP))
    for kind, amt, ex in o.patterns:
        if amt <= 0.01:
            continue
        if kind == "stripes":
            cc = ex or shade(o.color, -0.45)
            c.save()
            c.rotate(-25)
            for k in range(-12, 13):
                c.drawRect(skia.Rect.MakeXYWH(-500, k * 54, 1000, 22), P(cc, amt, blend=SRCATOP))
            c.restore()
        elif kind == "spots":
            cc = ex or (255, 255, 255)
            for (x, y, r) in SPOTS:
                c.drawCircle(x, y, r, P(cc, amt, blend=SRCATOP))
            for k in range(8):
                pts, ws, _ = arm_geom(k, t, o)
                for j in (4, 9, 13):
                    c.drawCircle(pts[j][0], pts[j][1], ws[j] * 0.28, P(cc, amt, blend=SRCATOP))
        elif kind == "speckle":
            pal = ex
            c.drawRect(skia.Rect.MakeXYWH(-400, -260, 800, 650), P(pal[0], amt, blend=SRCATOP))
            for (x, y, r, ci) in SPECK:
                c.drawCircle(x, y, r, P(pal[1 + ci % (len(pal) - 1)], amt * 0.9, blend=SRCATOP))
        elif kind == "clouds":
            cc = ex or (90, 20, 10)
            for k in range(-3, 4):
                y = ((t * 160 + k * 150) % 900) - 300
                pts = [(-400 + i * 40, y + 30 * math.sin(i * 0.7 + t * 2)) for i in range(21)]
                path = smooth_path(pts)
                c.drawPath(path, P(cc, amt * 0.75, stroke=55, blur=10, blend=SRCATOP))
        elif kind == "rainbow":
            for k in range(-6, 14):
                y = k * 50 - (t * 120) % 50
                c.drawRect(skia.Rect.MakeXYWH(-400, y - 250, 800, 51),
                           P(hsv(((k - int(t * 120 // 50)) * 0.11) % 1, 0.75, 1), amt, blend=SRCATOP))
        elif kind == "tint":
            c.drawRect(skia.Rect.MakeXYWH(-400, -260, 800, 650), P(ex, amt, blend=SRCATOP))
        elif kind == "shimmer":
            g = skia.GradientShader.MakeLinear(
                [skia.Point(-300 + 200 * math.sin(t * 2), -250), skia.Point(300, 300)],
                [col((90, 200, 255), amt * 0.8), col((120, 255, 200), amt * 0.2), col((90, 120, 255), amt * 0.8)])
            pp = skia.Paint(AntiAlias=True, Shader=g)
            pp.setBlendMode(SRCATOP)
            c.drawRect(skia.Rect.MakeXYWH(-400, -260, 800, 650), pp)
    if o.bumps > 0.02:
        b = o.bumps
        hi = P((255, 255, 255), 0.33 * b, blend=SRCATOP)
        lo = P((0, 0, 0), 0.25 * b, blend=SRCATOP)
        for (x, y, s) in BUMPS:
            r = (2.5 + 5.5 * b) * s
            c.drawCircle(x + 1.5, y + 2, r, lo)
            c.drawCircle(x - 1, y - 1.5, r * 0.75, hi)


def draw_octopus(c, x, y, s, t, o):
    breath = math.sin(t * 2.0)
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.rotate(o.tilt)
    # glow
    if o.glow > 0:
        c.drawCircle(0, -40, 300, P(shade(o.color, 0.2), 0.45 * o.glow, blur=70))
    # shadow on floor
    c.drawOval(skia.Rect.MakeXYWH(-230, 250, 460, 70), P((0, 40, 70), 0.18 * o.alpha, blur=18))
    flat_sx = 1 + 0.35 * o.flat - 0.06 * o.squash
    flat_sy = 1 - 0.5 * o.flat + 0.08 * o.squash
    arms = [arm_geom(i, t, o) for i in range(8)]

    def body_group(which):
        layer(c, o.alpha)
        drew = []
        if which == "back":
            for i, (pts, ws, front) in enumerate(arms):
                if not front:
                    pa, _ = arm_path(pts, ws)
                    c.drawPath(pa, P(o.color))
        else:
            for i, (pts, ws, front) in enumerate(arms):
                if front:
                    pa, edge = arm_path(pts, ws)
                    c.drawPath(pa, P(o.color))
                    drew.append((pts, ws, edge))
            c.save()
            c.translate(0, 60)
            c.scale(flat_sx, flat_sy)
            c.translate(0, -60)
            mp = mantle_path(breath)
            c.drawPath(mp, P(o.color))
            c.drawOval(skia.Rect.MakeXYWH(-108, 20, 216, 70), P(o.color))
            # spikes along the mantle outline
            if o.spikes > 0.02:
                meas = skia.PathMeasure(mp, True)
                L = meas.getLength()
                n = 26
                for k in range(n):
                    d = L * (k + 0.5) / n
                    pos, tan = meas.getPosTan(d)
                    nx, ny = tan.y(), -tan.x()
                    if pos.y() > 30:
                        continue
                    h = 20 * o.spikes * (0.8 + 0.4 * math.sin(k * 2.1))
                    tri = poly([(pos.x() - tan.x() * 8, pos.y() - tan.y() * 8),
                                (pos.x() + nx * h, pos.y() + ny * h),
                                (pos.x() + tan.x() * 8, pos.y() + tan.y() * 8)])
                    c.drawPath(tri, P(o.color))
            c.restore()
        octo_patterns(c, o, t)
        if which == "back":
            for (pts, ws, front) in arms:
                if not front:
                    pa, _ = arm_path(pts, ws)
                    c.drawPath(pa, P((40, 0, 30), 0.22, blend=SRCATOP))
        else:
            # mantle shading
            c.save()
            c.translate(0, 60)
            c.scale(flat_sx, flat_sy)
            c.translate(0, -60)
            g = skia.GradientShader.MakeRadial(skia.Point(-45, -140), 150,
                                               [col((255, 255, 255), 0.35), col((255, 255, 255), 0.0)])
            pp = skia.Paint(AntiAlias=True, Shader=g)
            pp.setBlendMode(SRCATOP)
            c.drawCircle(-45, -140, 150, pp)
            g2 = skia.GradientShader.MakeLinear([skia.Point(30, 0), skia.Point(130, 40)],
                                                [col((60, 0, 40), 0.0), col((60, 0, 40), 0.25)])
            pp2 = skia.Paint(AntiAlias=True, Shader=g2)
            pp2.setBlendMode(SRCATOP)
            c.drawRect(skia.Rect.MakeXYWH(-200, -260, 400, 380), pp2)
            c.restore()
            # suckers
            sa = o.sucker_alpha * (1 - 0.85 * max([a for k, a, _ in o.patterns if k == "speckle"] + [0]))
            if sa > 0.02:
                for (pts, ws, edge) in drew:
                    for j in range(3, len(edge) - 2, 2):
                        r = ws[j] * 0.17
                        c.drawCircle(edge[j][0], edge[j][1], r, P(SUCKER, 0.95 * sa, blend=SRCATOP))
                        c.drawCircle(edge[j][0], edge[j][1], r * 0.45, P(shade(SUCKER, -0.25), 0.9 * sa, blend=SRCATOP))
        c.restore()

    body_group("back")
    body_group("front")

    # ---------------- face (constant features)
    def mp_(px, py):
        return (px * flat_sx, 60 + (py - 60) * flat_sy)

    fa = o.face_alpha
    if fa > 0.01:
        by, btilt, lid, smile, m0, bh = o.expr
        lid = max(lid, o.blink)
        for side in (-1, 1):
            ex, ey = mp_(side * 46, -2)
            c.drawCircle(ex, ey, 31, P((255, 255, 255), fa))
            c.drawCircle(ex, ey, 31, P((60, 20, 10), 0.25 * fa, stroke=3))
            lx, ly = o.look
            px, py = ex + lx * 10, ey + ly * 9 + 2
            c.drawCircle(px, py, 15.5, P((25, 22, 40), fa))
            c.drawCircle(px - 5, py - 6, 5.2, P((255, 255, 255), fa))
            c.drawCircle(px + 5, py + 5, 2.3, P((255, 255, 255), 0.8 * fa))
            if lid > 0.01:
                # eyelid in body color, sliding down from the top of the eye
                c.save()
                clip = skia.Path()
                clip.addCircle(ex, ey, 32.5)
                c.clipPath(clip, skia.ClipOp.kIntersect, True)
                lid_col = o.color
                if any(k == "speckle" and a > 0.5 for k, a, _ in o.patterns):
                    lid_col = [ex_ for k, a, ex_ in o.patterns if k == "speckle"][0][0]
                c.drawRect(skia.Rect.MakeLTRB(ex - 40, ey - 40, ex + 40, ey - 33 + 66 * lid), P(lid_col, fa))
                c.drawLine(ex - 34, ey - 33 + 66 * lid, ex + 34, ey - 33 + 66 * lid, P(shade(lid_col, -0.45), fa, stroke=4))
                c.restore()
            # brow
            if bh > 0.01:
                bx0, by0 = ex - side * 22, ey + (by + 2) - btilt * 14
                bx1, by1 = ex + side * 22, ey + (by + 2) + btilt * 14
                c.drawLine(bx0, by0, bx1, by1, P(shade(o.color, -0.5), fa * bh, stroke=8))
        # cheeks
        if o.blush > 0.01:
            for side in (-1, 1):
                cx, cy = mp_(side * 84, 30)
                c.drawOval(skia.Rect.MakeXYWH(cx - 18, cy - 9, 36, 18), P((255, 90, 120), 0.55 * o.blush * fa, blur=4))
        # mouth
        mx, my = mp_(0, 44)
        op = clamp(m0 + o.mouth * 0.9)
        if op > 0.12:
            h = 6 + 26 * op
            w = 22 + 8 * op
            path = skia.Path()
            path.addOval(skia.Rect.MakeXYWH(mx - w / 2, my - h * 0.35, w, h))
            c.drawPath(path, P((90, 20, 30), fa))
            c.save()
            c.clipPath(path, skia.ClipOp.kIntersect, True)
            c.drawCircle(mx, my + h * 0.55, w * 0.38, P((255, 110, 120), fa))
            c.restore()
        else:
            path = skia.Path()
            path.moveTo(mx - 16, my)
            path.quadTo(mx, my + 16 * smile, mx + 16, my)
            c.drawPath(path, P((90, 20, 30), fa, stroke=5))
        # tentacle covering eyes (counting)
    c.restore()


# ---------------------------------------------------------------- Pip the fish

PIP_YELLOW = hexc("#FFD93B")
PIP_FIN = hexc("#FF9F1C")


def draw_fish(c, x, y, s, t, facing=1, mouth=0.0, expr="normal", speed=1.0, gold=0.0, alpha=1.0,
              look=(0, 0), blink=0.0, tilt=0.0):
    if alpha <= 0.01:
        return
    c.save()
    c.translate(x, y)
    c.rotate(tilt)
    c.scale(s * facing, s)
    layer(c, alpha)
    wag = math.sin(t * (8 + 8 * speed)) * (0.25 + 0.2 * speed)
    body_c = lerp(PIP_YELLOW, hexc("#F5B800"), gold)
    fin_c = lerp(PIP_FIN, hexc("#E89A00"), gold)
    # tail
    c.save()
    c.translate(-48, 0)
    c.rotate(math.degrees(wag))
    tail = smooth_path([(4, 0), (-40, -38), (-30, 0), (-40, 38)], close=True)
    c.drawPath(tail, P(fin_c))
    c.restore()
    # dorsal fin
    c.drawPath(smooth_path([(-30, -26), (-5, -58 + 4 * math.sin(t * 5)), (25, -30)], close=True), P(fin_c))
    # body
    body = smooth_path([(64, 4), (40, -34), (-10, -40), (-52, -14), (-56, 6), (-20, 36), (30, 36)], close=True)
    c.drawPath(body, P(body_c))
    c.save()
    c.clipPath(body, skia.ClipOp.kIntersect, True)
    c.drawOval(skia.Rect.MakeXYWH(-50, 8, 120, 50), P(shade(body_c, 0.45), 0.8))
    c.drawPath(smooth_path([(-8, -40), (2, 0), (-8, 40)]), P(shade(body_c, 0.5), 0.6, stroke=10))
    if gold > 0:
        g = skia.GradientShader.MakeLinear([skia.Point(-60 + 120 * math.sin(t * 3), -40), skia.Point(60, 40)],
                                           [col((255, 250, 200), 0.0), col((255, 255, 230), 0.8 * gold), col((255, 250, 200), 0.0)])
        c.drawRect(skia.Rect.MakeXYWH(-80, -60, 160, 120), skia.Paint(AntiAlias=True, Shader=g))
    c.restore()
    # pectoral fin
    c.save()
    c.translate(8, 14)
    c.rotate(20 + 25 * math.sin(t * 7))
    c.drawPath(smooth_path([(0, 0), (-26, 10), (-18, 22)], close=True), P(fin_c))
    c.restore()
    # eye
    ex, ey = 32, -10
    c.drawCircle(ex, ey, 14, P((255, 255, 255)))
    if expr == "happy":
        path = skia.Path()
        path.moveTo(ex - 9, ey + 3)
        path.quadTo(ex, ey - 9, ex + 9, ey + 3)
        c.drawPath(path, P((25, 22, 40), 1, stroke=4.5))
    elif expr == "closed":
        c.drawLine(ex - 9, ey, ex + 9, ey, P((25, 22, 40), 1, stroke=4.5))
    else:
        r = 6.5 if expr != "scared" else 4.5
        c.drawCircle(ex + 3 + look[0] * 4, ey + look[1] * 4, r + 1, P((25, 22, 40)))
        c.drawCircle(ex + 1 + look[0] * 4, ey - 3 + look[1] * 4, 2.4, P((255, 255, 255)))
        if blink > 0.01:
            c.drawRect(skia.Rect.MakeXYWH(ex - 15, ey - 15, 30, 30 * blink), P(body_c))
    if expr in ("scared", "surprised"):
        c.drawLine(ex - 10, ey - 22, ex + 10, ey - 26, P(shade(body_c, -0.5), 1, stroke=4))
    # mouth
    if mouth > 0.08:
        c.drawOval(skia.Rect.MakeXYWH(52, 6, 10, 4 + 12 * mouth), P((120, 40, 20)))
    else:
        path = skia.Path()
        path.moveTo(50, 12)
        path.quadTo(56, 16, 62, 10)
        c.drawPath(path, P((120, 40, 20), 1, stroke=3))
    c.restore()
    c.restore()
    if gold > 0.05:
        for k in range(6):
            ph = t * 1.7 + k * 1.05
            sx = x + 70 * s * math.cos(ph * 1.3 + k)
            sy = y + 50 * s * math.sin(ph + k * 2)
            star(c, sx, sy, 10 * s * (0.6 + 0.4 * math.sin(t * 6 + k)), (255, 245, 180), gold)


def star(c, x, y, r, color, a=1.0):
    pts = []
    for k in range(8):
        rr = r if k % 2 == 0 else r * 0.35
        ang = k * math.pi / 4
        pts.append((x + rr * math.cos(ang), y + rr * math.sin(ang)))
    c.drawPath(poly(pts), P(color, a))


# ---------------------------------------------------------------- the reef shark

SHARK_TOP = hexc("#71849A")
SHARK_BELLY = hexc("#DCE3EA")


def draw_shark(c, x, y, s, t, facing=1, mouth=0.0, alpha=1.0, look_down=0.0, silhouette=None):
    if alpha <= 0.01:
        return
    c.save()
    c.translate(x, y)
    c.scale(s * facing, s)
    layer(c, alpha)
    wag = math.sin(t * 3.2) * 0.18
    top = SHARK_TOP if silhouette is None else silhouette
    belly = SHARK_BELLY if silhouette is None else silhouette
    # tail
    c.save()
    c.translate(-270, 0)
    c.rotate(math.degrees(wag))
    tail = smooth_path([(10, -12), (-60, -60), (-130, -125), (-80, -20), (-120, 75), (-50, 30), (10, 12)], close=True)
    c.drawPath(tail, P(top))
    c.restore()
    # pectoral (far side)
    c.drawPath(smooth_path([(120, 40), (60, 120), (40, 52)], close=True), P(shade(top, -0.2)))
    # body
    body = skia.Path()
    body.moveTo(355, 6)
    body.cubicTo(330, -60, 180, -82, 40, -78)
    body.cubicTo(-110, -70, -220, -30, -285, -12)
    body.lineTo(-285, 12)
    body.cubicTo(-200, 34, -80, 62, 60, 68)
    body.cubicTo(200, 72, 330, 52, 355, 6)
    body.close()
    c.drawPath(body, P(top))
    if silhouette is None:
        c.save()
        c.clipPath(body, skia.ClipOp.kIntersect, True)
        belly_p = smooth_path([(380, 18), (200, 22), (0, 22), (-290, 4), (-290, 90), (380, 90)], close=True)
        c.drawPath(belly_p, P(belly, 1, blur=6))
        g = skia.GradientShader.MakeLinear([skia.Point(0, -80), skia.Point(0, 0)],
                                           [col((255, 255, 255), 0.18), col((255, 255, 255), 0.0)])
        c.drawPath(body, skia.Paint(AntiAlias=True, Shader=g))
        c.restore()
    # dorsal fin
    dorsal = smooth_path([(70, -74), (-10, -190), (-40, -186), (-70, -70)], close=True)
    c.drawPath(dorsal, P(top))
    # near pectoral fin
    pec = smooth_path([(150, 50), (60, 150), (40, 160), (70, 52)], close=True)
    c.drawPath(pec, P(shade(top, -0.08)))
    if silhouette is None:
        # black tips
        c.save(); c.clipPath(dorsal, skia.ClipOp.kIntersect, True)
        c.drawCircle(-28, -192, 34, P((40, 45, 55))); c.restore()
        c.save(); c.clipPath(pec, skia.ClipOp.kIntersect, True)
        c.drawCircle(50, 160, 30, P((40, 45, 55))); c.restore()
        # gills
        for k in range(4):
            gx = 150 - k * 16
            path = skia.Path(); path.moveTo(gx, -26); path.quadTo(gx - 8, 0, gx, 26)
            c.drawPath(path, P(shade(top, -0.35), 0.8, stroke=3.5))
        # eye
        c.drawCircle(262, -18, 11, P((20, 25, 35)))
        c.drawCircle(259 + 0 * look_down, -21 + 4 * look_down, 3.5, P((255, 255, 255)))
        c.drawLine(244, -36, 280, -28, P(shade(top, -0.45), 1, stroke=6))
        # mouth
        if mouth > 0.08:
            path = smooth_path([(250, 38), (290, 32 + 18 * mouth), (330, 26)])
            c.drawPath(path, P((60, 30, 40), 1, stroke=8 + 10 * mouth))
            for k in range(5):
                tx = 262 + k * 13
                c.drawPath(poly([(tx, 32), (tx + 5, 40 + 4 * mouth), (tx + 10, 31)]), P((255, 255, 255)))
        else:
            path = smooth_path([(250, 40), (290, 36), (330, 28)])
            c.drawPath(path, P(shade(top, -0.5), 1, stroke=4))
    c.restore()
    c.restore()


# ---------------------------------------------------------------- the reef world

_rw = np.random.default_rng(3)


def _branch(x, y, ang, length, depth, out):
    ex, ey = x + math.cos(ang) * length, y + math.sin(ang) * length
    out.append((x, y, ex, ey, depth))
    if depth > 0:
        for d in (-0.45, 0.4):
            _branch(ex, ey, ang + d + _rw.uniform(-0.15, 0.15), length * _rw.uniform(0.62, 0.78), depth - 1, out)


CORAL_COLORS = [hexc("#FF6F91"), hexc("#C77DFF"), hexc("#FF9671"), hexc("#F9F871"), hexc("#00C9A7"), hexc("#FF5E78")]

WORLD = {"far": [], "mid": [], "weed": [], "speck": [], "fish": [], "near": []}
for k in range(70):
    WORLD["far"].append((-2000 + k * 140 + _rw.uniform(-40, 40), _rw.uniform(120, 300), _rw.uniform(80, 200)))
for k in range(1600):
    WORLD["speck"].append((_rw.uniform(-2400, 7000), _rw.uniform(FLOOR + 10, H + 40), _rw.uniform(1.5, 4.5), _rw.uniform(0, 1)))
for k in range(40):
    WORLD["fish"].append((_rw.uniform(0, 4000), _rw.uniform(140, 620), _rw.uniform(40, 110), _rw.uniform(0.35, 0.75), _rw.integers(0, 3)))


def add_coral(kind, x, y=FLOOR + 10, scale=1.0, ci=0, layer_="mid"):
    item = {"kind": kind, "x": x, "y": y, "s": scale, "c": CORAL_COLORS[ci % len(CORAL_COLORS)]}
    if kind == "branch":
        segs = []
        for a in (-1.9, -1.57, -1.2):
            _branch(0, 0, a + _rw.uniform(-0.1, 0.1), 95, 3, segs)
        item["segs"] = segs
    if kind == "fan":
        segs = []
        for a in np.linspace(-2.6, -0.55, 9):
            _branch(0, 0, a, 80, 2, segs)
        item["segs"] = segs
    WORLD[layer_].append(item)


# hand-placed set pieces (world x; scene camera centers: 0, 2000, 4000)
for (kind, x, s, ci) in [("branch", -760, 1.2, 0), ("fan", -880, 1.3, 1), ("brain", -640, 1.0, 3), ("tube", 620, 1.0, 1),
                         ("branch", 760, 1.0, 2), ("anemone", 880, 1.0, 5), ("fan", 980, 1.1, 1),
                         ("branch", 1220, 1.1, 5), ("brain", 1340, 0.9, 4), ("tube", 1460, 1.2, 4),
                         ("fan", 2700, 1.2, 1), ("branch", 2820, 1.2, 0), ("anemone", 2950, 1.0, 5), ("tube", 3150, 0.9, 2),
                         ("brain", 3300, 1.1, 3), ("branch", 3420, 1.0, 4),
                         ("branch", 3240, 1.1, 2), ("fan", 3560, 1.3, 1), ("brain", 4680, 1.0, 4), ("branch", 4760, 1.2, 0),
                         ("anemone", 4880, 1.0, 5), ("tube", 5000, 1.0, 1), ("fan", 3300, 1.0, 1),
                         ("branch", -1300, 1.0, 1), ("fan", -1150, 1.1, 5), ("brain", 5300, 1.0, 3)]:
    add_coral(kind, x, scale=s, ci=ci)
for k in range(46):
    x = -2200 + k * 205 + _rw.uniform(-60, 60)
    WORLD["weed"].append((x, _rw.uniform(160, 330), _rw.uniform(0, 6.28), _rw.integers(0, 2)))

# the mossy rock (hide and seek) and the coral crack (shark scene)
ROCK_X = -470
CRACK_X = 2560


def draw_coral(c, it, t):
    x, y, s, cc = it["x"], it["y"], it["s"], it["c"]
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    k = it["kind"]
    if k == "branch":
        sway = math.sin(t * 0.8 + x * 0.01) * 0.6
        for (x0, y0, x1, y1, d) in it["segs"]:
            w = 10 + d * 7
            c.drawLine(x0 + sway * (-y0) * 0.01, y0, x1 + sway * (-y1) * 0.01, y1, P(cc, 1, stroke=w))
        for (x0, y0, x1, y1, d) in it["segs"]:
            if d == 0:
                c.drawCircle(x1 + sway * (-y1) * 0.01, y1, 8, P(shade(cc, 0.35)))
    elif k == "fan":
        sway = math.sin(t * 0.7 + x) * 0.8
        for (x0, y0, x1, y1, d) in it["segs"]:
            c.drawLine(x0 + sway * (-y0) * 0.02, y0, x1 + sway * (-y1) * 0.02, y1, P(cc, 0.95, stroke=3 + d * 2.5))
        path = skia.Path()
        path.addOval(skia.Rect.MakeXYWH(-150, -250, 300, 230))
        c.drawPath(path, P(cc, 0.25))
    elif k == "brain":
        c.drawOval(skia.Rect.MakeXYWH(-110, -120, 220, 140), P(cc))
        for j in range(5):
            pts = [(-90 + i * 18, -95 + j * 22 + 8 * math.sin(i * 1.3 + j)) for i in range(11)]
            c.drawPath(smooth_path(pts), P(shade(cc, -0.25), 0.8, stroke=5))
    elif k == "tube":
        for j, (dx, h) in enumerate([(-40, 170), (0, 230), (38, 150), (70, 110)]):
            c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(dx - 22, -h, 44, h + 10), 20, 20), P(shade(cc, -0.05 * j)))
            c.drawOval(skia.Rect.MakeXYWH(dx - 16, -h - 4, 32, 14), P(shade(cc, -0.5)))
    elif k == "anemone":
        for j in range(16):
            a = -math.pi + j * math.pi / 15
            pts = []
            for i in range(9):
                r = i * 15
                pts.append((math.cos(a) * r * 0.9 + 12 * math.sin(t * 2 + j + i * 0.6) * i / 8,
                            -40 + math.sin(a) * r * 1.2))
            c.drawPath(smooth_path(pts), P(shade(cc, 0.1), 1, stroke=11))
            c.drawCircle(pts[-1][0], pts[-1][1], 7, P(shade(cc, 0.5)))
        c.drawOval(skia.Rect.MakeXYWH(-60, -50, 120, 60), P(shade(cc, -0.3)))
    c.restore()


def draw_rock(c, x, y, s, t, moss=True):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    rock = smooth_path([(-230, 20), (-240, -90), (-170, -230), (-40, -290), (100, -260), (210, -150), (240, 20)], close=True)
    c.drawPath(rock, P(hexc("#6E7A72")))
    c.save()
    c.clipPath(rock, skia.ClipOp.kIntersect, True)
    rr = np.random.default_rng(5)
    for k in range(160):
        px, py = rr.uniform(-240, 240), rr.uniform(-300, 20)
        cc = [hexc("#58655D"), hexc("#8A968C"), hexc("#7F9A62"), hexc("#5E7F4A")][k % 4]
        c.drawCircle(px, py, rr.uniform(4, 14), P(cc, 0.8))
    if moss:
        c.drawPath(smooth_path([(-260, -120), (-160, -250), (-30, -320), (110, -280), (240, -160)]), P(hexc("#6FA35A"), 0.9, stroke=40, blur=3))
    g = skia.GradientShader.MakeLinear([skia.Point(-200, -280), skia.Point(200, 20)],
                                       [col((255, 255, 255), 0.18), col((0, 0, 0), 0.25)])
    c.drawRect(skia.Rect.MakeXYWH(-260, -320, 520, 360), skia.Paint(AntiAlias=True, Shader=g))
    c.restore()
    c.restore()


def floor_y(wx):
    return FLOOR + 14 * math.sin(wx * 0.004) + 8 * math.sin(wx * 0.011 + 1)


ROCK_PAL = [hexc("#6E7A72"), hexc("#58655D"), hexc("#8A968C"), hexc("#7F9A62"), hexc("#5E7F4A")]
SAND_PAL = [hexc("#E9D3A4"), hexc("#D7BC86"), hexc("#F6E8C8"), hexc("#C9A86E"), hexc("#FFF6E0")]


class Cam:
    def __init__(self, x=0.0, y=0.0, zoom=1.0, fx=960, fy=540):
        self.x, self.y, self.zoom, self.fx, self.fy = x, y, zoom, fx, fy


def sx(cam, wx, par=1.0):
    return wx * 1 - cam.x * par + 960


def draw_background(c, t, cam, darkness=0.0, scatter=0.0, fish=True, surface=0.0):
    # water gradient
    g = skia.GradientShader.MakeLinear([skia.Point(0, -cam.y * 0.3), skia.Point(0, H)],
                                       [col(hexc("#7FE3EA")), col(hexc("#23A6C9")), col(hexc("#0B5A86"))], [0, 0.45, 1])
    c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Shader=g))
    # water surface shimmer (intro)
    if surface > 0.01:
        yy = -cam.y * 0.6 + 80
        for k in range(3):
            pts = [(i * 40, yy + k * 18 + 10 * math.sin(i * 0.5 + t * 2 + k)) for i in range(50)]
            c.drawPath(smooth_path(pts), P((255, 255, 255), 0.35 * surface, stroke=6 - k * 1.5, blur=2))
    # light rays
    for k in range(7):
        x0 = 150 + k * 280 + 60 * math.sin(t * 0.3 + k) - cam.x * 0.05 % 280
        w = 90 + 60 * math.sin(k * 1.7)
        ray = poly([(x0, -10), (x0 + w, -10), (x0 + w * 2.2 + 260, H), (x0 + 260, H)])
        gg = skia.GradientShader.MakeLinear([skia.Point(0, 0), skia.Point(0, H)],
                                            [col((255, 255, 240), 0.16 + 0.05 * math.sin(t + k)), col((255, 255, 240), 0.0)])
        c.drawPath(ray, skia.Paint(AntiAlias=True, Shader=gg))
    c.save()
    c.translate(0, -cam.y)
    # far reef silhouettes
    for (x, w, h) in WORLD["far"]:
        X = x - cam.x * 0.35 + 960
        if -300 < X < W + 300:
            c.drawOval(skia.Rect.MakeXYWH(X - w, FLOOR - 60 - h, w * 2, h * 2), P(hexc("#2F8FB0"), 0.55))
    # distant floor band
    c.drawRect(skia.Rect.MakeXYWH(0, FLOOR - 70, W, 200), P(hexc("#3C9DB8"), 0.55))
    # background fish schools
    if fish:
        for (x0, y0, sp, sc_, ci) in WORLD["fish"]:
            X = ((x0 + t * sp * (1 + 6 * scatter) - cam.x * 0.4) % 4000) - 1000
            Y = y0 - scatter * 500 * ((x0 % 7) / 7 + 0.3)
            if -100 < X < W + 100 and Y > -80:
                fc = [hexc("#FFE680"), hexc("#9CF6FB"), hexc("#FFB3C1")][ci]
                c.save(); c.translate(X, Y); c.scale(sc_, sc_)
                c.drawOval(skia.Rect.MakeXYWH(-30, -12, 60, 24), P(fc, 0.75))
                c.drawPath(poly([(-26, 0), (-46, -14 + 4 * math.sin(t * 9 + x0)), (-46, 14 + 4 * math.sin(t * 9 + x0))]), P(fc, 0.75))
                c.drawCircle(16, -3, 3.5, P((30, 30, 50), 0.8))
                c.restore()
    # seaweed
    for (x, h, ph, ci) in WORLD["weed"]:
        X = x - cam.x * 0.8 + 960
        if -100 < X < W + 100:
            pts = [(X + 26 * math.sin(t * 1.1 + ph + i * 0.5) * i / 8, FLOOR + 10 - i * h / 8) for i in range(9)]
            c.drawPath(smooth_path(pts), P(hexc("#2E9E6B") if ci else hexc("#56C271"), 0.95, stroke=16))
    # sand
    pts = [(X, floor_y(X + cam.x)) for X in range(-20, W + 41, 40)]
    sandp = poly(pts + [(W + 40, H + 300), (-20, H + 300)])
    gs = skia.GradientShader.MakeLinear([skia.Point(0, FLOOR - 20), skia.Point(0, H)],
                                        [col(hexc("#F1DDAE")), col(hexc("#D9B97D"))])
    c.drawPath(sandp, skia.Paint(AntiAlias=True, Shader=gs))
    for (x, y, r, k) in WORLD["speck"]:
        X = x - cam.x + 960
        if -10 < X < W + 10:
            c.drawCircle(X, y + 8 * math.sin(x * 0.004), r, P(hexc("#B8955B") if k < 0.6 else hexc("#FFF8E6"), 0.55))
    # caustics on the sand
    for k in range(12):
        X = (k * 190 + 40 * math.sin(t * 0.7 + k) - cam.x) % (W + 200) - 100
        Y = FLOOR + 40 + (k % 3) * 55
        c.drawOval(skia.Rect.MakeXYWH(X, Y, 120 + 30 * math.sin(t + k), 16), P((255, 255, 255), 0.18, blur=6))
    # mid corals
    for it in WORLD["mid"]:
        X = it["x"] - cam.x + 960
        if -400 < X < W + 400:
            d = dict(it)
            d["x"] = X
            draw_coral(c, d, t)
    c.restore()
    if darkness > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), P(hexc("#06223F"), 0.45 * darkness))


def draw_particles(c, t, cam=None, a=1.0):
    rp = np.random.default_rng(9)
    for k in range(70):
        x0, y0, sp, r = rp.uniform(0, W), rp.uniform(0, H), rp.uniform(5, 18), rp.uniform(1.5, 4)
        X = (x0 + 20 * math.sin(t * 0.4 + k)) % W
        Y = (y0 - t * sp) % H
        c.drawCircle(X, Y, r, P((255, 255, 255), 0.25 * a))


def draw_bubbles(c, t, x, y, n=6, a=1.0, spread=30, speed=90, size=1.0, seed=0):
    rb = np.random.default_rng(seed)
    for k in range(n):
        ph = rb.uniform(0, 4)
        life = ((t + ph) % 4) / 4
        bx = x + rb.uniform(-spread, spread) + 10 * math.sin(t * 3 + k)
        by = y - life * speed * 4
        r = (4 + rb.uniform(0, 8)) * size * (0.6 + life)
        aa = a * (1 - life)
        c.drawCircle(bx, by, r, P((255, 255, 255), 0.55 * aa, stroke=2.5))
        c.drawCircle(bx - r * 0.35, by - r * 0.35, r * 0.25, P((255, 255, 255), 0.7 * aa))


def vignette(c, a=0.45):
    g = skia.GradientShader.MakeRadial(skia.Point(960, 540), 1150,
                                       [col((0, 20, 40), 0.0), col((0, 20, 40), 0.0), col((0, 20, 40), a)], [0, 0.55, 1])
    c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Shader=g))
