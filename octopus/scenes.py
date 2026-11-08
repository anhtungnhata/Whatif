"""Scene choreography. Every cue is tied to the voice timeline (line starts / word times)."""
import math
import numpy as np
import skia
from draw import *

PALE = hexc("#FFE0CC")
ANGRY = hexc("#B3261E")
BLUE = hexc("#3B82F6")
GREEN = hexc("#2FBF71")
PURPLE = hexc("#9B5DE5")
TEAL = hexc("#14B8A6")
DARK = hexc("#0E3B5C")


class X:
    """Timing helper for a scene."""

    def __init__(self, scene):
        self.s = scene
        self.start = scene["start"]
        self.end = scene["end"]
        self.lines = scene["lines"]

    def L(self, i):
        return self.lines[i]["start"]

    def E(self, i):
        return self.lines[i]["end"]

    def wt(self, i, word, frac=0.0):
        ln = self.lines[i]
        idx = ln["text"].find(word)
        assert idx >= 0, (word, ln["text"])
        n = len(ln["text"])
        return ln["start"] + (ln["end"] - ln["start"]) * (idx + frac * len(word)) / n

    def mouth(self, spk, t):
        for ln in self.lines:
            if ln["speaker"] == spk and ln["start"] <= t < ln["end"]:
                k = int((t - ln["start"]) * 30)
                env = ln["env"]
                if 0 <= k < len(env):
                    return env[k]
        return 0.0

    def speaking(self, spk, t):
        return any(ln["speaker"] == spk and ln["start"] - 0.1 <= t < ln["end"] + 0.1 for ln in self.lines)


def blink(t, seed=0.0):
    period = 3.6 + seed * 0.7
    ph = (t + seed * 1.37) % period
    if ph < 0.14:
        return 1 - abs(ph - 0.07) / 0.07
    return 0.0


def pop(t, t0, d=0.45):
    return ease_out_back((t - t0) / d) if t >= t0 else 0.0


def fade(t, a, b, d=0.4):
    return ramp(t, a, a + d) * (1 - ramp(t, b - d, b))


def draw_props(c, t, cam):
    rx = ROCK_X - cam.x + 960
    if -400 < rx < W + 400:
        draw_rock(c, rx, floor_y(ROCK_X) + 22, 1.0, t)


def draw_crack_wall(c, t, cam, pip_fn=None):
    x = CRACK_X - cam.x + 960
    y = FLOOR + 30
    wall = smooth_path([(-320, 30), (-300, -230), (-200, -420), (-40, -470), (130, -430), (260, -300), (330, 30)], close=True)
    crack = smooth_path([(-10, 10), (-55, -120), (-30, -250), (10, -330), (40, -220), (55, -90), (40, 10)], close=True)
    c.save()
    c.translate(x, y)
    c.drawPath(wall, P(hexc("#E46A7A")))
    c.save()
    c.clipPath(wall, skia.ClipOp.kIntersect, True)
    rr = np.random.default_rng(21)
    for k in range(120):
        c.drawCircle(rr.uniform(-330, 330), rr.uniform(-480, 30), rr.uniform(6, 18),
                     P([hexc("#F08A98"), hexc("#C94F64"), hexc("#FFB0BB")][k % 3], 0.7))
    c.restore()
    c.drawPath(crack, P(hexc("#3A1020")))
    if pip_fn:
        c.save()
        c.clipPath(crack, skia.ClipOp.kIntersect, True)
        c.translate(-x, -y)
        pip_fn()
        c.restore()
    c.restore()
    return x, y


def bubble_transition(c, t, tb):
    """Bubble wipe centred on scene boundary tb."""
    d = t - tb
    if abs(d) > 0.75:
        return
    k = (d + 0.75) / 1.5
    cover = 1 - abs(d) / 0.75
    rb = np.random.default_rng(int(tb * 10))
    for i in range(60):
        x = rb.uniform(-50, W + 50)
        r = rb.uniform(50, 170)
        y = H + 200 - k * (H + 600) * rb.uniform(0.9, 1.5) + rb.uniform(-200, 200)
        c.drawCircle(x, y, r, P((220, 248, 255), 0.85))
        c.drawCircle(x - r * 0.3, y - r * 0.3, r * 0.22, P((255, 255, 255), 0.9))
    c.drawRect(skia.Rect.MakeWH(W, H), P((200, 240, 250), smooth(cover) * 0.9))


def speech_mark(c, s, x, y, a, scale=1.0, color=(255, 255, 255)):
    if a <= 0.01:
        return
    c.save()
    c.translate(x, y)
    c.scale(scale, scale)
    text(c, s, 0, 0, 110, color, a, outline=DARK, ow=10)
    c.restore()


def thought_bubble(c, x, y, a, t, content=None):
    if a <= 0.01:
        return
    for i, (dx, dy, r) in enumerate([(-150, 120, 12), (-110, 80, 20)]):
        c.drawCircle(x + dx, y + dy, r, P((255, 255, 255), a))
    path = skia.Path()
    for (dx, dy, r) in [(-60, 0, 60), (0, -30, 70), (70, -10, 65), (40, 40, 55), (-30, 40, 55)]:
        path.addCircle(x + dx, y + dy, r)
    c.drawPath(path, P((255, 255, 255), a))
    if content:
        content()


def mini_swatch_wheel(c, x, y, t, a, r=46):
    for k in range(6):
        ang = t * 1.5 + k * math.pi / 3
        c.drawCircle(x + r * math.cos(ang), y + r * 0.6 * math.sin(ang), 20, P(hsv(k / 6, 0.7, 1), a))


def stopwatch(c, x, y, a, t, s="< 1 SEC"):
    if a <= 0.01:
        return
    c.save()
    c.translate(x, y)
    c.scale(a, a)
    c.drawCircle(0, 0, 95, P((255, 255, 255)))
    c.drawCircle(0, 0, 95, P(DARK, 1, stroke=10))
    c.drawRect(skia.Rect.MakeXYWH(-16, -128, 32, 26), P(DARK))
    ang = t * 6
    c.drawLine(0, 0, 70 * math.sin(ang), -70 * math.cos(ang), P(hexc("#FF5E5B"), 1, stroke=8))
    c.drawCircle(0, 0, 9, P(DARK))
    c.restore()
    label(c, s, x, y + 150, 46, bg=hexc("#FF5E5B"), fg=(255, 255, 255), a=a)


# ====================================================================== INTRO
def scene_intro(c, t, x):
    cam = Cam(x=lerp(-700, 0, smooth((t - 0) / 14)), y=lerp(-900, 0, smooth((t - 0.5) / 9)))
    draw_background(c, t, cam, surface=1 - ramp(t, 4, 8))
    c.save()
    c.translate(0, -cam.y)
    # Ollie peeks from behind the rock
    rx = ROCK_X - cam.x + 960
    peek = ramp(t, 9.5, 10.6) * (1 - ramp(t, x.L(1) - 0.2, x.L(1) + 0.6))
    if peek > 0:
        o = Octo(expr=EXPR["neutral"], look=(math.sin(t * 1.3), -0.2), blink=blink(t))
        draw_octopus(c, rx + 70, lerp(820, 640, peek), 0.62, t, o)
    draw_props(c, t, cam)
    c.restore()
    draw_bubbles(c, t, 1500, 900 - cam.y, n=8, seed=1)
    draw_particles(c, t)
    # the "what if" lens
    l0, l1 = x.L(1), x.L(2)
    lens = pop(t, l0 + 0.2, 0.6) * (1 - ramp(t, l1 - 0.3, l1 + 0.3))
    if lens > 0.01:
        c.drawRect(skia.Rect.MakeWH(W, H), P(DARK, 0.45 * min(1, lens)))
        r = 270 * lens
        cx, cy = 960, 500
        t_col = x.wt(1, "Any color")
        t_pat = x.wt(1, "any pattern")
        t_tex = x.wt(1, "any texture")
        o = Octo()
        o.color = hsv((t * 0.35) % 1, 0.7, 1) if t > t_col else OLLIE_ORANGE
        stripes = fade(t, t_pat, t_pat + 1.2, 0.25)
        spots = ramp(t, t_pat + 1.2, t_pat + 1.45)
        o.patterns = [("stripes", stripes, None), ("spots", spots, None)]
        o.bumps = ramp(t, t_tex, t_tex + 0.5)
        o.spikes = 0.0
        c.save()
        c.translate(cx, cy)
        layer(c)
        c.drawCircle(0, 0, r, P(o.color))
        c.scale(1.2, 1.2)
        octo_patterns(c, o, t)
        c.restore()
        c.drawCircle(0, 0, r, P((255, 255, 255), min(1, lens), stroke=14))
        c.restore()
        text(c, "?", cx + r * 0.75, cy - r * 0.6, 150, (255, 255, 255), min(1, lens), outline=DARK, ow=12)
        words = [("ANY COLOR", t_col), ("ANY PATTERN", t_pat), ("ANY TEXTURE", t_tex)]
        for i, (wd, tw) in enumerate(words):
            a = ramp(t, tw, tw + 0.3) * min(1, lens)
            label(c, wd, 960 + (i - 1) * 520, 900, 54, bg=[hexc("#FF8A2B"), hexc("#9B5DE5"), hexc("#14B8A6")][i],
                  fg=(255, 255, 255), a=a, scale=pop(t, tw))
    # title card
    tt = x.wt(2, "What If")
    if t > tt - 0.2:
        a = ramp(t, tt - 0.2, tt + 0.3)
        c.drawRect(skia.Rect.MakeWH(W, H), P(DARK, 0.35 * a))
        s1 = pop(t, tt, 0.5)
        c.save(); c.translate(960, 300); c.scale(s1, s1)
        text(c, "WHAT IF YOU COULD", 0, 0, 82, (255, 255, 255), a, outline=DARK, ow=14)
        c.restore()
        s2 = pop(t, tt + 0.7, 0.55)
        c.save(); c.translate(960, 480); c.scale(s2, s2)
        word = "CHANGE COLOR"
        total = text_width(word, 170)
        xx = -total / 2
        for i, ch in enumerate(word):
            w = text_width(ch, 170)
            colr = hsv((i * 0.08 + t * 0.15) % 1, 0.65, 1) if ch != " " else (255, 255, 255)
            yy = 8 * math.sin(t * 3 + i * 0.6)
            text(c, ch, xx + w / 2, yy, 170, colr, a, outline=DARK, ow=18)
            xx += w
        c.restore()
        s3 = pop(t, tt + 1.4, 0.55)
        c.save(); c.translate(960, 640); c.scale(s3, s3)
        text(c, "LIKE AN OCTOPUS?", 0, 0, 120, OLLIE_ORANGE, a, outline=DARK, ow=16)
        c.restore()
        label(c, "A 6-Minute Animated Adventure", 960, 760, 40, bg=(255, 255, 255), fg=DARK, a=ramp(t, tt + 2.2, tt + 2.6))
        # Ollie pops up from the bottom-right corner and waves; Pip zips past
        up = ramp(t, tt + 2.0, tt + 3.0)
        o = Octo(expr=EXPR["excited"], wave=up, blink=blink(t))
        draw_octopus(c, 1640, lerp(1300, 930, up), 0.7, t, o)
        px = lerp(-200, 2200, clamp((t - tt - 2.6) / 4.0))
        draw_fish(c, px, 900 + 30 * math.sin(t * 4), 0.9, t, facing=1, speed=2, expr="happy")
    vignette(c)


# ====================================================================== MEET
def scene_meet(c, t, x):
    cam = Cam(x=0)
    draw_background(c, t, cam)
    draw_props(c, t, cam)
    # Ollie swims in
    arrive = x.L(0) + 1.4
    k = smooth((t - x.start) / (arrive - x.start))
    ox = lerp(2150, 1060, k)
    oy = 560 + 14 * math.sin(t * 2) - 120 * math.sin(k * math.pi) * (1 - k)
    o = Octo(trail=(1 - k) * 0.9, tilt=-10 * (1 - k), blink=blink(t), mouth=x.mouth("OLLIE", t))
    t_or = x.wt(0, "Ollie is orange")
    o.glow = fade(t, t_or, x.E(0) + 0.3, 0.4) * (0.7 + 0.3 * math.sin(t * 6))
    o.expr = seq(t, EXPR["happy"], [(x.L(3), EXPR["worried"]), (x.wt(3, "What if"), EXPR["happy"]),
                                     (x.L(4), EXPR["neutral"]), (x.L(5), EXPR["surprised"])], 0.3)
    o.look = seq(t, (0, 0), [(x.wt(1, "Pip"), (-1, 0)), (x.L(2) + 1.0, (-0.6, -0.3)), (x.L(3), (0.8, 0)),
                             (x.L(3) + 1.5, (-0.8, 0.2)), (x.wt(3, "What if"), (0.3, -1)), (x.L(4), (-1, -0.3))], 0.35)
    o.arms_up = fade(t, x.L(5), x.E(5) + 1.0, 0.2) * 0.7
    draw_octopus(c, ox, oy, 0.95, t, o)
    # Pip
    tp = x.wt(1, "Pip") - 0.6
    pk = smooth((t - tp) / 1.2)
    px, py = lerp(-200, 560, pk), 400 + 16 * math.sin(t * 2.4)
    facing = 1
    speed = 1 + 2 * (1 - pk)
    tz0 = x.wt(2, "very, very fast")
    if tz0 <= t < tz0 + 2.2:
        a = (t - tz0) / 2.2 * 2 * math.pi
        px = 1060 - 500 * math.cos(a)
        py = 470 - 260 * math.sin(a)
        facing = 1 if math.sin(a) > 0 else -1
        speed = 3
    pexpr = "normal"
    if x.L(2) <= t < x.E(2):
        pexpr = "happy"
    if t >= x.L(4):
        pexpr = "happy" if x.mouth("PIP", t) < 0.5 else "normal"
    bounce = 30 * abs(math.sin((t - x.L(4)) * 6)) * fade(t, x.L(4), x.E(4), 0.2)
    draw_fish(c, px, py - bounce, 1.0, t, facing=facing, mouth=x.mouth("PIP", t), expr=pexpr, speed=speed,
              blink=blink(t, 2), look=(1, 0) if t > x.L(3) else (0, 0))
    if tz0 <= t < tz0 + 2.2:
        for k2 in range(5):
            c.drawLine(px - facing * (60 + k2 * 25), py - 20 + k2 * 10, px - facing * (100 + k2 * 25), py - 20 + k2 * 10,
                       P((255, 255, 255), 0.5, stroke=5))
    # name tags
    tn = x.wt(0, "Meet Ollie") + 0.5
    label(c, "OLLIE", ox, 225, 54, bg=OLLIE_ORANGE, fg=(255, 255, 255), a=fade(t, tn, x.L(3), 0.3), scale=pop(t, tn))
    label(c, "PIP", 560, 290, 50, bg=PIP_YELLOW, fg=DARK, a=fade(t, tp + 1.2, x.wt(2, "very, very fast"), 0.3), scale=pop(t, tp + 1.2))
    # thought bubble
    tb = x.wt(3, "different color") - 0.4
    ta = fade(t, tb, x.L(4) + 0.6, 0.35)
    thought_bubble(c, ox + 330, 230, ta, t, lambda: mini_swatch_wheel(c, ox + 335, 215, t, ta))
    speech_mark(c, "!", ox + 150, 300, ramp(t, x.L(5), x.L(5) + 0.2), pop(t, x.L(5), 0.35), hexc("#FFD93B"))
    draw_particles(c, t)
    vignette(c)


# ====================================================================== SCIENCE
def chromatophore(c, x, y, r, colr, a=1.0, muscles=True, pull=0.5, t=0.0):
    if a <= 0.01:
        return
    if muscles:
        R = r * 1.9 + 30
        for k in range(10):
            ang = k * math.pi / 5 + 0.1
            c.drawLine(x + math.cos(ang) * r * 0.95, y + math.sin(ang) * r * 0.95,
                       x + math.cos(ang) * R, y + math.sin(ang) * R, P(hexc("#E86A6A"), 0.85 * a, stroke=4 + 8 * pull))
        c.drawCircle(x, y, R, P(hexc("#E86A6A"), 0.25 * a, stroke=3))
    c.drawCircle(x, y, r, P(colr, a))
    c.drawCircle(x - r * 0.3, y - r * 0.3, r * 0.3, P((255, 255, 255), 0.3 * a))


def nerve(c, pts, t, a, pulse=True):
    path = smooth_path(pts)
    c.drawPath(path, P(hexc("#FFE66D"), a, stroke=7))
    if pulse:
        meas = skia.PathMeasure(path, False)
        L = meas.getLength()
        for k in range(3):
            d = ((t * 400 + k * L / 3) % L)
            pos, _ = meas.getPosTan(d)
            c.drawCircle(pos.x(), pos.y(), 13, P((255, 255, 255), a, blur=4))


def brain_icon(c, x, y, a):
    if a <= 0.01:
        return
    c.drawOval(skia.Rect.MakeXYWH(x - 70, y - 50, 140, 100), P(hexc("#FFB3C6"), a))
    for k in range(4):
        pts = [(x - 55 + i * 12, y - 30 + k * 18 + 6 * math.sin(i * 1.7 + k)) for i in range(10)]
        c.drawPath(smooth_path(pts), P(hexc("#E5738F"), a, stroke=4))
    label(c, "BRAIN", x, y + 90, 32, bg=(255, 255, 255), fg=DARK, a=a)


PIG = [hexc("#E63946"), hexc("#FFC300"), hexc("#8B5A2B"), hexc("#222222")]


def scene_science(c, t, x):
    zoom_t = x.wt(0, "hidden") - 0.2
    zk = smooth((t - zoom_t) / 1.3)
    back = x.L(4)
    zout = smooth((t - back + 0.3) / 0.8)
    panel = ramp(t, zoom_t + 0.9, zoom_t + 1.4) * (1 - zout)
    # reef view (before/after the diagram)
    if panel < 0.999:
        z = lerp(1, 5, zk) if t < back - 0.3 else lerp(5, 1, zout)
        c.save()
        c.translate(1000, 380)
        c.scale(z, z)
        c.translate(-1000, -380)
        cam = Cam(x=0)
        draw_background(c, t, cam)
        draw_props(c, t, cam)
        o = Octo(blink=blink(t), mouth=x.mouth("OLLIE", t))
        o.look = (0.3, -0.6) if x.L(5) <= t < x.E(5) + 0.3 else (-0.7, 0)
        if t > back:
            flash = x.wt(4, "whole look")
            cols = [OLLIE_ORANGE, ANGRY, PIG[2], PALE, hexc("#2F2F2F"), PIG[1], OLLIE_ORANGE]
            if flash <= t < flash + 2.4:
                i = int((t - flash) / 0.34) % len(cols)
                o.color = cols[i]
                o.expr = EXPR["excited"]
            elif t >= x.L(5):
                o.expr = seq(t, EXPR["calm"], [(x.L(6), EXPR["excited"])], 0.3)
        draw_octopus(c, 1060, 560 + 12 * math.sin(t * 2), 0.95, t, o)
        draw_fish(c, 560, 400 + 16 * math.sin(t * 2.4), 1.0, t, mouth=x.mouth("PIP", t),
                  expr="happy" if t > x.L(6) else "normal", blink=blink(t, 2))
        # magnifier
        ma = fade(t, x.wt(0, "secret") - 0.3, zoom_t + 0.8, 0.3)
        if ma > 0:
            c.drawCircle(1000, 380, 70, P((255, 255, 255), ma, stroke=12))
            c.drawLine(1050, 430, 1120, 500, P(DARK, ma, stroke=20))
        c.restore()
        if t > back:
            stopwatch(c, 1600, 330, pop(t, x.wt(4, "less than a second")) * (1 - ramp(t, x.L(5), x.L(5) + 0.4)), t)
        draw_particles(c, t)
        vignette(c)
    if panel <= 0.001:
        return
    # ----------------------------------------------------------- the skin diagram
    layer(c, panel)
    g = skia.GradientShader.MakeRadial(skia.Point(960, 400), 1300, [col(hexc("#FFC79A")), col(hexc("#F28A4B"))])
    c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Shader=g))
    # skin surface
    pts = [(X, 150 + 10 * math.sin(X * 0.01 + t)) for X in range(-20, W + 41, 40)]
    c.drawPath(smooth_path(pts), P((255, 240, 225), 0.9, stroke=14))
    label(c, "INSIDE OCTOPUS SKIN", 960, 75, 48, bg=DARK, fg=(255, 255, 255))
    l1, l2, l3 = x.L(1), x.L(2), x.L(3)
    # --- L1: row of chromatophores
    row_a = 1 - ramp(t, l2 - 0.2, l2 + 0.4)
    if t < l3 and row_a > 0:
        tc = x.wt(1, "chromatophores")
        cues = [x.wt(1, "red"), x.wt(1, "yellow"), x.wt(1, "brown"), x.wt(1, "black")]
        xs = np.linspace(330, 1590, 8)
        for i, X in enumerate(xs):
            ci = i % 4
            t0 = tc + i * 0.08 if i >= 4 else cues[ci]
            if i < 4:
                t0 = min(cues[ci], tc + 1.5 + i * 0.3)
            s = pop(t, t0)
            r = (52 + 24 * math.sin(t * 1.6 + i * 1.3)) * s
            chromatophore(c, X, 460, r, PIG[ci], row_a * clamp(s), True, 0.5 + 0.5 * math.sin(t * 1.6 + i * 1.3), t)
        label(c, "CHROMATOPHORES", 960, 700, 64, bg=(255, 255, 255), fg=hexc("#C2410C"), a=row_a * ramp(t, tc, tc + 0.3), scale=pop(t, tc))
        names = ["RED", "YELLOW", "BROWN", "BLACK"]
        for i in range(4):
            label(c, names[i], 450 + i * 340, 840, 40, bg=PIG[i], fg=(255, 255, 255) if i != 1 else DARK,
                  a=row_a * ramp(t, cues[i], cues[i] + 0.2), scale=pop(t, cues[i]))
    # --- L2: one big sac with muscles + nerve
    big_a = ramp(t, l2, l2 + 0.5) * (1 - ramp(t, l3 - 0.3, l3 + 0.3))
    if big_a > 0.01:
        t_pull = x.wt(2, "muscles pull")
        t_wide = x.wt(2, "stretches wide")
        t_relax = x.wt(2, "relax")
        t_dot = x.wt(2, "tiny dot")
        r = seq(t, 45, [(t_pull, 190), (t_relax, 22)], 1.0)
        pull = seq(t, 0.2, [(t_pull, 1.0), (t_relax, 0.0)], 0.6)
        cx, cy = 1060, 560
        # paint-drop spread effect
        if t > t_wide:
            for k in range(14):
                ang = k * 0.45 + 0.3
                rr = r * (1.0 + 0.12 * math.sin(k * 2.3 + t * 2))
                c.drawCircle(cx + math.cos(ang) * rr * 0.55, cy + math.sin(ang) * rr * 0.55, rr * 0.5, P(PIG[0], 0.5 * big_a))
        chromatophore(c, cx, cy, r, PIG[0], big_a, True, pull, t)
        brain_icon(c, 230, 260, big_a * ramp(t, x.wt(2, "brain") - 0.3, x.wt(2, "brain")))
        tn = x.wt(2, "nerves")
        if t > tn - 0.3:
            nerve(c, [(300, 280), (520, 330), (700, 460), (cx - 330, cy - 40)], t, big_a * ramp(t, tn - 0.3, tn + 0.2))
            label(c, "NERVE", 560, 270, 36, bg=hexc("#FFE66D"), fg=DARK, a=big_a, scale=pop(t, tn))
        label(c, "MUSCLES", cx + 330, cy - 300, 40, bg=hexc("#E86A6A"), fg=(255, 255, 255),
              a=big_a * ramp(t, x.wt(2, "tiny muscles"), x.wt(2, "tiny muscles") + 0.3), scale=pop(t, x.wt(2, "tiny muscles")))
        label(c, "PIGMENT SAC", cx, cy + 390, 40, bg=(255, 255, 255), fg=hexc("#C2410C"), a=big_a)
        word = "STRETCH!" if t < t_relax else "RELAX"
        label(c, word, 1620, 820, 50, bg=DARK, fg=(255, 255, 255), a=big_a * ramp(t, t_pull, t_pull + 0.3),
              scale=pop(t, t_pull if t < t_relax else t_relax))
    # --- L3: layered cross-section
    lay_a = ramp(t, l3 - 0.2, l3 + 0.4)
    if lay_a > 0.01:
        ti = x.wt(3, "iridophores")
        tl = x.wt(3, "leucophores")
        # band 1 chromatophores
        for i, X in enumerate(np.linspace(520, 1780, 9)):
            r = 30 + 12 * math.sin(t * 1.6 + i)
            chromatophore(c, X, 290, r, PIG[i % 4], lay_a, False)
        label(c, "CHROMATOPHORES", 260, 300, 34, bg=(255, 255, 255), fg=hexc("#C2410C"), a=lay_a)
        # band 2 iridophores
        ia = lay_a * ramp(t, ti, ti + 0.4)
        if ia > 0:
            for i in range(30):
                X = 500 + i * 43
                for j in range(4):
                    hue = (0.5 + 0.12 * math.sin(t * 2 + i * 0.4 + j)) % 1
                    c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(X, 440 + j * 34 + 4 * math.sin(i + t), 34, 16), 6, 6),
                                P(hsv(hue, 0.6, 1), ia * 0.95))
            # light ray reflecting
            k = ((t - ti) % 2.5) / 2.5
            c.drawLine(900, 160, 900 + 180 * min(1, k * 2), 160 + 300 * min(1, k * 2), P((255, 255, 210), ia, stroke=8))
            if k > 0.5:
                kk = (k - 0.5) * 2
                c.drawLine(1080, 460, 1080 + 180 * kk, 460 - 300 * kk, P((120, 220, 255), ia, stroke=8))
            label(c, "IRIDOPHORES", 260, 520, 34, bg=hexc("#3BB3E0"), fg=(255, 255, 255), a=ia, scale=pop(t, ti))
            label(c, "shimmer", 260, 580, 26, bg=(255, 255, 255), fg=DARK, a=ia)
        la = lay_a * ramp(t, tl, tl + 0.4)
        if la > 0:
            rr = np.random.default_rng(4)
            for i in range(80):
                X, Y = rr.uniform(500, 1820), rr.uniform(700, 860)
                c.drawCircle(X, Y, rr.uniform(10, 24), P((255, 255, 255), la * 0.95))
            c.drawRect(skia.Rect.MakeXYWH(480, 690, 1380, 190), P((255, 255, 255), 0.2 * la, blur=20))
            label(c, "LEUCOPHORES", 260, 770, 34, bg=(255, 255, 255), fg=DARK, a=la, scale=pop(t, tl))
            label(c, "bright white", 260, 830, 26, bg=(255, 255, 255), fg=DARK, a=la)
    c.restore()
    vignette(c, 0.3)


# ====================================================================== PRACTICE
def scene_practice(c, t, x):
    zoom = seq(t, 1.0, [(x.L(5), 1.45), (x.E(5) + 1.2, 1.0)], 1.0)
    # hide & seek: Ollie goes to the rock
    t_go = x.wt(6, "One")
    rock_sx = ROCK_X + 960
    ox = seq(t, 1060.0, [(t_go - 0.2, rock_sx + 40), (x.L(9) + 0.6, 960.0)], 1.6)
    oy = seq(t, 560.0, [(t_go - 0.2, 690.0), (x.L(9) + 0.6, 560.0)], 1.6)
    focus_x, focus_y = 1060, 470
    c.save()
    c.translate(focus_x, focus_y)
    c.scale(zoom, zoom)
    c.translate(-focus_x, -focus_y)
    cam = Cam(x=0)
    draw_background(c, t, cam)
    draw_props(c, t, cam)
    o = Octo(blink=blink(t), mouth=x.mouth("OLLIE", t))
    # --- colors
    tblue = x.L(1) + 0.3
    l4 = x.lines[4]
    tg, tp, ts, tsp = x.wt(4, "Green"), x.wt(4, "Purple"), x.wt(4, "Stripes"), x.wt(4, "Spots")
    tshow = x.wt(4, "light show")
    tend = x.L(5)
    if t < tblue:
        o.color = OLLIE_ORANGE
    elif t < tg:
        o.color, o.wipe_color, o.wipe = OLLIE_ORANGE, BLUE, smooth((t - tblue) / 1.0)
        if t > tblue + 1.0:
            o.color, o.wipe_color = BLUE, None
    elif t < tp:
        o.color, o.wipe_color, o.wipe = BLUE, GREEN, smooth((t - tg) / 0.7)
    elif t < tshow - 0.5:
        o.color, o.wipe_color, o.wipe = GREEN, PURPLE, smooth((t - tp) / 0.7)
        if t > ts:
            o.color, o.wipe_color = PURPLE, None
            o.patterns.append(("stripes", ramp(t, ts, ts + 0.3) * (1 - ramp(t, tsp, tsp + 0.3)), hexc("#F15BB5")))
        if t > tsp:
            o.color = lerp(PURPLE, TEAL, ramp(t, tsp, tsp + 0.3))
            o.patterns.append(("spots", ramp(t, tsp, tsp + 0.3), (255, 255, 255)))
    elif t < tend:
        k = t - (tshow - 0.5)
        o.color = hsv((k * 0.6) % 1, 0.75, 1)
        phase = int(k / 0.9) % 4
        o.patterns = [("rainbow", 1.0 if phase == 0 else 0.0, None), ("stripes", 1.0 if phase == 1 else 0.0, (255, 255, 255)),
                      ("spots", 1.0 if phase == 2 else 0.0, hexc("#22223B")), ("clouds", 1.0 if phase == 3 else 0.0, hexc("#3A0CA3"))]
        if t > tend - 0.6:
            o.color = OLLIE_ORANGE
            o.patterns = []
    else:
        o.color = OLLIE_ORANGE
    # --- papillae
    tb_ = x.wt(5, "Tiny bumps")
    tsm, tbu, tsk = x.wt(5, "smooth"), x.wt(5, "bumpy"), x.wt(5, "spiky")
    o.bumps = seq(t, 0.0, [(tb_, 0.5), (tsm, 0.0), (tbu, 1.0), (x.E(5) + 1.4, 0.0)], 0.4)
    o.spikes = seq(t, 0.0, [(tsk, 1.0), (x.E(5) + 1.4, 0.0)], 0.4)
    # --- hide and seek camo
    tsq = x.L(7)
    tspk = x.wt(7, "speckled")
    tlb = x.wt(7, "little bumps")
    tboo = x.L(9)
    camo = ramp(t, tspk - 0.2, tspk + 1.2) * (1 - ramp(t, tboo, tboo + 0.12))
    if camo > 0:
        o.patterns.append(("speckle", camo, ROCK_PAL))
        o.bumps = max(o.bumps, 0.85 * ramp(t, tlb, tlb + 0.8) * (1 - ramp(t, tboo, tboo + 0.12)))
        o.alpha = 1 - 0.12 * camo
        o.sucker_alpha = 1 - camo
    o.flat = 0.3 * ramp(t, tsq, tsq + 1.0) * (1 - ramp(t, tboo, tboo + 0.15))
    # --- expressions
    o.expr = seq(t, EXPR["happy"], [
        (x.L(0), EXPR["focus"]), (tblue + 0.8, EXPR["surprised"]), (x.L(2), EXPR["excited"]),
        (x.L(3), EXPR["happy"]), (tg, EXPR["excited"]), (tend, EXPR["happy"]), (tsk, EXPR["excited"]),
        (x.L(6), EXPR["happy"]), (tsq, EXPR["sly"]), (tboo, EXPR["excited"]), (x.L(10), EXPR["happy"])], 0.25)
    o.arms_up = seq(t, 0.0, [(x.L(2), 0.6), (x.L(3), 0.0), (tshow - 0.4, 0.5), (tend, 0.0), (tboo, 1.0), (tboo + 0.9, 0.0)], 0.2)
    o.look = seq(t, (-0.7, 0), [(x.L(2), (0, 0.6)), (x.L(3), (-0.8, -0.2)), (tsq, (0.8, 0)), (x.L(8) + 1.0, (0.9, -0.4)), (tboo, (0.5, -0.2))], 0.3)
    o.tilt = 6 * math.sin(t * 3) * fade(t, x.L(10), x.E(10) + 1, 0.2)
    o.trail = 0.0
    sc = 0.95 if t < t_go else lerp(0.95, 0.72, smooth((t - t_go) / 1.6)) if t < tboo + 0.6 else lerp(0.72, 0.95, smooth((t - tboo - 0.6) / 1.6))
    # sparkles at color changes
    draw_octopus(c, ox, oy + 12 * math.sin(t * 2) * (1 - camo), sc, t, o)
    for tc in (tblue, tg, tp, ts, tsp, tboo):
        if tc <= t < tc + 0.8:
            k = (t - tc) / 0.8
            for i in range(8):
                ang = i * math.pi / 4 + tc
                star(c, ox + math.cos(ang) * 220 * k * sc, oy - 100 * sc + math.sin(ang) * 220 * k * sc, 22 * (1 - k), (255, 255, 220), 1 - k)
    # --- Pip
    px, py, facing, pexpr = 520.0, 400.0 + 16 * math.sin(t * 2.4), 1, "normal"
    look = (0, 0)
    if x.L(2) <= t < x.L(4):
        pexpr = "happy"
    if x.L(6) <= t < x.L(8):
        facing, pexpr = -1, "closed"
        px = seq(t, 520.0, [(x.L(6) + 0.5, 1500.0)], 1.2)
    if x.L(8) <= t < tboo:
        k = (t - x.L(8)) / (tboo - x.L(8))
        px = lerp(1500, 760, smooth(k * 1.4)) + (60 * math.sin(k * 9) if k > 0.7 else 0)
        facing = -1 if k < 0.75 else (1 if math.sin(t * 2.5) > 0 else -1)
        look = (math.sin(t * 2), -0.3)
    if t >= tboo:
        k = smooth((t - tboo) / 0.4)
        px = lerp(760, 940, k) if t < x.L(10) else seq(t, 940.0, [(x.L(10), 700.0)], 1.0)
        py = 380 - 80 * math.sin(min(1, (t - tboo) / 0.5) * math.pi) + 16 * math.sin(t * 2.4)
        facing = -1
        pexpr = "scared" if t < x.L(10) else "happy"
    bounce = 26 * abs(math.sin((t - x.L(3)) * 6)) * fade(t, x.L(3), x.E(3), 0.2)
    bounce += 20 * abs(math.sin((t - x.L(10)) * 7)) * fade(t, x.L(10), x.E(10) + 0.8, 0.2)
    draw_fish(c, px, py - bounce, 1.0, t, facing=facing, mouth=x.mouth("PIP", t), expr=pexpr, look=look, blink=blink(t, 2))
    c.restore()
    # overlays (screen space)
    label(c, "PAPILLAE", 960, 140, 60, bg=DARK, fg=(255, 255, 255),
          a=fade(t, x.wt(5, "papillae"), x.E(5) + 1.4, 0.3), scale=pop(t, x.wt(5, "papillae")))
    for i, (wd, tw) in enumerate([("SMOOTH", tsm), ("BUMPY", tbu), ("SPIKY", tsk)]):
        label(c, wd, 560 + i * 400, 960, 46, bg=[hexc("#7BDFF2"), hexc("#F7D6E0"), hexc("#F15BB5")][i], fg=DARK,
              a=fade(t, tw, x.E(5) + 1.4, 0.2), scale=pop(t, tw))
    for i, wd in enumerate(["One", "two", "three"]):
        tw = x.wt(6, wd)
        speech_mark(c, str(i + 1), 1400 + i * 130, 260, fade(t, tw, x.L(7) + 0.5, 0.15), pop(t, tw, 0.3), hexc("#FFD93B"))
    if x.L(8) <= t < tboo:
        speech_mark(c, "?", 1000 + 300 * math.sin(t), 230, 0.9, 0.8)
    speech_mark(c, "BOO!", 640, 300, fade(t, tboo, tboo + 1.3, 0.1), pop(t, tboo, 0.25) * 1.2, OLLIE_ORANGE)
    label(c, "think blue...", 1060, 140, 44, bg=(255, 255, 255), fg=BLUE, a=fade(t, x.L(0), x.L(1) + 0.4, 0.3))
    draw_particles(c, t)
    vignette(c)


# ====================================================================== SHARK
def shark_state(t, x):
    """(x, y, facing, scale) of the shark."""
    t_in = x.wt(2, "reef shark")
    t5 = x.L(5)
    t6 = x.L(6)
    t_out = x.E(6) + 2.6
    if t < t_in:
        return None
    if t < t5:
        k = smooth((t - t_in) / (t5 - t_in))
        return (lerp(-500, 900, k), lerp(260, 380, k), 1, 0.85)
    if t < t6:
        k = (t - t5) / (t6 - t5)
        return (lerp(900, 1080, k), 380 + 10 * math.sin(t), 1, 0.85)
    mid = t6 + (t_out - t6) * 0.42
    if t < mid:
        k = smooth((t - t6) / (mid - t6))
        return (lerp(1080, 2500, k), lerp(380, 300, k), 1, 0.85)
    k = smooth((t - mid) / (t_out - mid))
    return (lerp(2500, -700, k), 330, -1, 0.85)


def scene_shark(c, t, x):
    cam = Cam(x=2000)
    t_dark0 = x.start + 0.5
    dark = ramp(t, t_dark0, x.E(0)) * (1 - ramp(t, x.E(6), x.L(8) + 0.5)) * 0.9
    scatter = ramp(t, x.L(0) + 1.0, x.L(0) + 4.0) * (1 - ramp(t, x.L(9), x.L(9) + 3))
    draw_background(c, t, cam, darkness=dark, scatter=scatter)
    # shadow sweep
    ts = x.wt(0, "long shadow")
    if ts - 0.3 <= t < ts + 4:
        k = (t - ts + 0.3) / 4.3
        c.save()
        c.translate(lerp(-700, 2600, k), 220)
        c.scale(1.6, 1.6)
        draw_shark(c, 0, 0, 1, t, 1, silhouette=hexc("#05243D"), alpha=0.35)
        c.restore()
    # Pip
    t_dart = x.wt(2, "darts")
    t_peek = x.L(7)
    t_out = x.L(8) + 0.2
    crack_x = CRACK_X - cam.x + 960
    pip_pos = None
    hidden = t_dart + 0.7 <= t < t_out
    if t < t_dart:
        pip_pos = (720, 450 + 16 * math.sin(t * 2.4), 1)
    elif t < t_dart + 0.7:
        k = smooth((t - t_dart) / 0.7)
        pip_pos = (lerp(720, crack_x, k), lerp(450, FLOOR - 150, k), 1)
    shark = shark_state(t, x)
    # crack wall (with Pip inside when hidden)

    def pip_inside():
        k = ramp(t, t_peek - 0.2, t_peek + 0.4)
        draw_fish(c, crack_x + 15 - 20 * k, FLOOR - 140, 0.75, t, facing=-1, mouth=x.mouth("PIP", t),
                  expr="scared" if t < x.L(8) else "normal", speed=0.3)

    draw_crack_wall(c, t, cam, pip_inside if hidden else None)
    # Ollie on the sand
    o = Octo(blink=blink(t), mouth=x.mouth("OLLIE", t))
    tfl = x.wt(4, "flattens")
    tpa = x.wt(4, "pale and speckled")
    tfb = x.wt(4, "fine bumps")
    tva = x.wt(4, "vanishes")
    trel = x.L(8)
    unc = 1 - ramp(t, trel - 0.4, trel + 0.3)
    o.flat = ramp(t, tfl, tfl + 1.0) * unc
    sp = ramp(t, tpa - 0.2, tpa + 1.2) * unc
    o.patterns = [("speckle", sp, SAND_PAL)]
    o.sucker_alpha = 1 - sp
    o.bumps = 0.6 * ramp(t, tfb, tfb + 0.8) * unc
    o.alpha = 1 - 0.8 * ramp(t, tva - 0.6, tva + 0.6) * unc
    o.face_alpha = 1 - 0.3 * ramp(t, tva - 0.6, tva + 0.6) * unc
    o.expr = seq(t, EXPR["happy"], [(x.L(0) + 1.0, EXPR["worried"]), (x.L(1), EXPR["scared"]), (tfl, EXPR["focus"]),
                                     (tva, EXPR["hidden"]), (trel, EXPR["surprised"]), (trel + 0.8, EXPR["happy"])], 0.3)
    if shark and x.L(5) - 1 < t < x.E(6) + 2.6:
        o.look = (clamp((shark[0] - 960) / 500, -1, 1), -0.8)
    elif x.L(0) <= t < tfl:
        o.look = (math.sin(t * 3) * 0.8, -0.6)
    oy = 690 + 175 * o.flat + (1 - o.flat) * 10 * math.sin(t * 2)
    draw_octopus(c, 960, oy, 0.85, t, o)
    if pip_pos and not hidden:
        draw_fish(c, pip_pos[0], pip_pos[1], 1.0, t, facing=pip_pos[2], mouth=x.mouth("PIP", t),
                  expr="scared" if t > x.L(0) + 2 else "normal", speed=3 if t > t_dart else 1)
    if t >= t_out:
        k = smooth((t - t_out) / 1.4)
        draw_fish(c, lerp(crack_x - 10, 700, k), lerp(FLOOR - 140, 470, k) + 16 * math.sin(t * 2.4), lerp(0.75, 1.0, k), t,
                  facing=-1, mouth=x.mouth("PIP", t), expr="happy" if t > x.L(9) else "normal")
    if shark:
        draw_shark(c, shark[0], shark[1], shark[3], t, shark[2], mouth=x.mouth("SHARK", t),
                   look_down=1.0 if x.L(5) <= t < x.E(6) else 0.0)
    if x.L(1) <= t < x.E(1) + 0.6:
        speech_mark(c, "!", 760, 330, 1.0, pop(t, x.L(1), 0.3), hexc("#FF5E5B"))
    if x.L(5) - 0.5 <= t < x.E(5) + 0.5 and shark:
        speech_mark(c, "?", shark[0] + 200, shark[1] - 140, fade(t, x.L(5), x.E(5) + 0.5, 0.2), 0.9)
    # info card for the closing fact
    t9 = x.L(9)
    tsci = x.wt(9, "Scientists")
    a1 = fade(t, t9 + 0.3, tsci, 0.4)
    a2 = ramp(t, tsci, tsci + 0.4) * (1 - ramp(t, x.end - 0.9, x.end - 0.5))
    if a1 > 0:
        label(c, "CAMOUFLAGE = SURVIVAL", 960, 150, 58, bg=DARK, fg=(255, 255, 255), a=a1, scale=pop(t, t9 + 0.3))
    if a2 > 0:
        label(c, "LIGHT-SENSING PROTEINS IN THE SKIN", 960, 150, 52, bg=hexc("#7B2CBF"), fg=(255, 255, 255), a=a2, scale=pop(t, tsci))
        for i in range(10):
            ang = i * 0.63 + t * 0.6
            star(c, 960 + 220 * math.cos(ang), 560 + 120 * math.sin(ang), 14 + 6 * math.sin(t * 5 + i), (255, 250, 200), a2)
    draw_particles(c, t, a=1 - dark * 0.5)
    vignette(c, 0.45 + 0.25 * dark)


# ====================================================================== FEELINGS
def kid(c, x, y, s, colr, a=1.0, pattern=None, t=0.0, face="smile", wall=0.0):
    if a <= 0.01:
        return
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    layer(c, a)
    body = skia.Path()
    body.addCircle(0, -120, 95)
    body.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(-150, -20, 300, 240), 110, 110))
    c.drawPath(body, P(colr))
    if pattern == "rainbow":
        for k in range(-8, 10):
            c.drawRect(skia.Rect.MakeXYWH(-200, k * 40 - (t * 80) % 40, 400, 41), P(hsv((k * 0.12 + t * 0.2) % 1, 0.7, 1), 1, blend=SRCATOP))
    elif pattern == "bricks":
        c.drawRect(skia.Rect.MakeXYWH(-200, -250, 400, 500), P(hexc("#C8553D"), wall, blend=SRCATOP))
        for j in range(12):
            yy = -240 + j * 40
            c.drawLine(-200, yy, 200, yy, P(hexc("#F3E9DC"), wall, stroke=5, blend=SRCATOP))
            for i in range(6):
                xx = -200 + i * 80 + (40 if j % 2 else 0)
                c.drawLine(xx, yy, xx, yy + 40, P(hexc("#F3E9DC"), wall, stroke=5, blend=SRCATOP))
    elif pattern == "stripes":
        for k in range(-8, 10):
            c.drawRect(skia.Rect.MakeXYWH(-200, k * 50, 400, 22), P((255, 255, 255), 0.8, blend=SRCATOP))
    c.restore()
    ea = 1 - 0.7 * wall
    for side in (-1, 1):
        c.drawCircle(side * 32, -130, 11, P((30, 30, 50), ea))
    path = skia.Path()
    if face == "shy":
        path.moveTo(-20, -82); path.quadTo(0, -90, 20, -82)
        for side in (-1, 1):
            c.drawOval(skia.Rect.MakeXYWH(side * 60 - 18, -105, 36, 18), P((255, 60, 110), 0.6))
    else:
        path.moveTo(-30, -88); path.quadTo(0, -60, 30, -88)
    c.drawPath(path, P((30, 30, 50), ea, stroke=6))
    c.restore()


def scene_feelings(c, t, x):
    cam = Cam(x=4000)
    draw_background(c, t, cam)
    t_you = x.L(3)
    t_back = x.L(6)
    away = ramp(t, t_you - 0.2, t_you + 0.6) * (1 - ramp(t, t_back - 0.3, t_back + 0.5))
    o = Octo(blink=blink(t), mouth=x.mouth("OLLIE", t))
    tcalm, tang, tcl = x.wt(1, "calm"), x.wt(1, "angry"), x.wt(1, "passing clouds")
    o.color = seq(t, OLLIE_ORANGE, [(tcalm, PALE), (tang, ANGRY), (tcl - 1.0, hexc("#E07A3F")), (x.L(2), ANGRY),
                                    (x.E(2) + 0.3, OLLIE_ORANGE), (x.L(7), OLLIE_ORANGE)], 0.5)
    o.patterns = [("clouds", ramp(t, tcl - 0.8, tcl) * (1 - ramp(t, x.L(2), x.L(2) + 0.4)), hexc("#5A1A0A"))]
    o.expr = seq(t, EXPR["happy"], [(tcalm, EXPR["calm"]), (tang, EXPR["grumpy"]), (tcl - 1.0, EXPR["neutral"]),
                                     (x.L(2), EXPR["grumpy"]), (x.E(2) + 0.2, EXPR["happy"]), (x.L(7), EXPR["calm"]),
                                     (x.wt(7, "orange"), EXPR["happy"])], 0.3)
    o.blush = fade(t, x.wt(7, "really like"), x.end + 1, 0.4)
    o.glow = fade(t, x.wt(7, "orange"), x.end + 1, 0.5) * 0.6
    ox = lerp(760, 300, away)
    sc = lerp(0.95, 0.6, away)
    draw_octopus(c, ox, 560 + lerp(0, 160, away) + 12 * math.sin(t * 2), sc, t, o)
    # Pip
    gold = ramp(t, x.wt(6, "gold") - 0.3, x.wt(6, "gold") + 0.6)
    pexpr = "happy" if (x.E(2) - 0.5 <= t < x.E(2) + 1.5) or t > x.L(6) else "normal"
    px = lerp(1220, 560, away)
    draw_fish(c, px, lerp(380, 600, away) + 16 * math.sin(t * 2.4), lerp(1.0, 0.7, away), t, facing=-1,
              mouth=x.mouth("PIP", t), expr=pexpr, gold=gold, blink=blink(t, 2))
    # mood labels
    for i, (wd, tw, colr, te) in enumerate([("CALM", tcalm, PALE, tang), ("ANGRY", tang, ANGRY, tcl - 0.8),
                                             ("PASSING CLOUDS", tcl, hexc("#5A1A0A"), x.L(2) + 0.3)]):
        label(c, wd, 1350, 300 + i * 0, 58, bg=colr, fg=DARK if i == 0 else (255, 255, 255),
              a=fade(t, tw, te, 0.2), scale=pop(t, tw))
    label(c, "COLOR = FEELINGS", 960, 120, 52, bg=DARK, fg=(255, 255, 255), a=fade(t, x.L(0) + 0.5, x.E(2), 0.4),
          scale=pop(t, x.L(0) + 0.5))
    # the "you" mirror
    if away > 0.01:
        mx, my = 1180, 540
        c.drawOval(skia.Rect.MakeXYWH(mx - 330 * away, my - 380 * away, 660 * away, 760 * away), P(hexc("#E9C46A"), away))
        c.drawOval(skia.Rect.MakeXYWH(mx - 300 * away, my - 350 * away, 600 * away, 700 * away), P(hexc("#DFF6FF"), away))
        clip = skia.Path()
        clip.addOval(skia.Rect.MakeXYWH(mx - 300 * away, my - 350 * away, 600 * away, 700 * away))
        c.save()
        c.clipPath(clip, skia.ClipOp.kIntersect, True)
        temb, tbd, ths = x.wt(4, "Embarrassed"), x.wt(4, "birthday"), x.wt(4, "hide and seek")
        tout, tmsg, tfeel = x.wt(5, "match your outfit"), x.wt(5, "secret"), x.wt(5, "Of course")
        wall = ramp(t, ths, ths + 0.8) * (1 - ramp(t, tout - 0.3, tout))
        if wall > 0:
            c.drawRect(skia.Rect.MakeXYWH(mx - 320, my - 360, 640, 720), P(hexc("#C8553D"), wall))
            for j in range(19):
                yy = my - 360 + j * 40
                c.drawLine(mx - 320, yy, mx + 320, yy, P(hexc("#F3E9DC"), wall, stroke=5))
                for i in range(9):
                    xx = mx - 320 + i * 80 + (40 if j % 2 else 0)
                    c.drawLine(xx, yy, xx, yy + 40, P(hexc("#F3E9DC"), wall, stroke=5))
        base = hexc("#8EC5FF")
        colr = seq(t, base, [(temb, hexc("#FF8FB1")), (tbd, (255, 255, 255)), (ths, hexc("#C8553D")), (tout, hexc("#2A9D8F")),
                             (tmsg, base)], 0.35)
        pattern = None
        if tbd <= t < ths:
            pattern = "rainbow"
        elif ths <= t < tout:
            pattern = "bricks"
        elif tout <= t < tmsg:
            pattern = "stripes"
        face = "shy" if temb <= t < tbd else "smile"
        if tfeel <= t:
            colr = hsv((t * 0.8) % 1, 0.55, 1)
        if tmsg <= t < tfeel:
            # two kids flashing secret color messages
            kid(c, mx - 140, my + 210, 0.75, colr, away, t=t)
            kid(c, mx + 150, my + 210, 0.75, hexc("#FFD166"), away, t=t)
            for i in range(5):
                on = (int(t * 4) + i) % 3 == 0
                c.drawCircle(mx - 70 + i * 36, my - 160, 13, P(hsv(i / 5, 0.8, 1), away if on else 0.25 * away))
        else:
            kid(c, mx, my + 200, 1.0, colr, away, pattern, t, face, wall)
        c.restore()
        label(c, "WHAT IF YOU COULD?", mx, my - 440 * away, 50, bg=DARK, fg=(255, 255, 255), a=away, scale=pop(t, t_you))
        tags = [("EMBARRASSED", temb, tbd), ("BIRTHDAY!", tbd, ths), ("HIDE & SEEK", ths, tout), ("MATCH YOUR OUTFIT", tout, tmsg),
                ("SECRET MESSAGES", tmsg, tfeel), ("NO HIDING FEELINGS!", tfeel, t_back)]
        for (wd, a0, a1) in tags:
            label(c, wd, mx, my + 450 * away, 44, bg=(255, 255, 255), fg=DARK, a=fade(t, a0, a1, 0.2) * away, scale=pop(t, a0))
        if x.wt(4, "birthday") <= t < ths:
            for i in range(12):
                ang = i * 0.52 + t
                star(c, mx + 360 * math.cos(ang), my + 320 * math.sin(ang), 16, hsv(i / 12, 0.6, 1), away)
    if t > x.L(7):
        for i in range(4):
            k = ((t - x.L(7)) * 0.4 + i * 0.25) % 1
            hx, hy = ox + 160 + 30 * math.sin(i * 2 + t * 2), 380 - k * 260
            heart(c, hx, hy, 22 * (1 - k * 0.5), (1 - k) * ramp(t, x.L(7), x.L(7) + 0.5))
    draw_particles(c, t)
    vignette(c)


def heart(c, x, y, r, a):
    if a <= 0.01:
        return
    path = skia.Path()
    path.moveTo(x, y + r)
    path.cubicTo(x - 2.2 * r, y - 0.2 * r, x - 0.9 * r, y - 1.6 * r, x, y - 0.5 * r)
    path.cubicTo(x + 0.9 * r, y - 1.6 * r, x + 2.2 * r, y - 0.2 * r, x, y + r)
    c.drawPath(path, P(hexc("#FF5D8F"), a))


# ====================================================================== RECAP
def scene_recap(c, t, x):
    cam = Cam(x=3650)
    draw_background(c, t, cam)
    c.drawRect(skia.Rect.MakeWH(W, H), P(DARK, 0.25))
    tbonus = x.L(5)
    tend = x.L(8)
    o = Octo(blink=blink(t), mouth=x.mouth("OLLIE", t))
    l1, l2, l3, l4 = x.L(1), x.L(2), x.L(3), x.L(4)
    if l1 <= t < l2:
        k = int((t - l1) / 0.8) % 4
        o.color = lerp(OLLIE_ORANGE, PIG[k] if k != 3 else hexc("#5A3A2A"), 0.85)
    elif l2 <= t < l3:
        o.patterns = [("shimmer", ramp(t, l2, l2 + 0.5) * (1 - ramp(t, l3 - 0.3, l3)), None)]
    elif l3 <= t < l4:
        k = (t - l3) / (x.E(3) - l3)
        o.bumps = smooth(k * 2)
        o.spikes = smooth(k * 2 - 1)
    elif l4 <= t < tbonus:
        tr = x.wt(4, "show how they feel")
        o.patterns = [("speckle", fade(t, l4, tr, 0.4), ROCK_PAL)]
        if t > tr:
            o.color = lerp(OLLIE_ORANGE, ANGRY, fade(t, tr, tbonus, 0.3))
    o.expr = seq(t, EXPR["happy"], [(tbonus, EXPR["surprised"]), (x.wt(5, "color-blind"), EXPR["excited"]),
                                     (x.L(6), EXPR["excited"]), (tend, EXPR["happy"])], 0.3)
    o.wave = fade(t, x.L(6), x.E(7) + 0.5, 0.3) + ramp(t, x.L(8) + 3.0, x.L(8) + 3.5)
    o.wave = min(1.0, o.wave)
    end_k = ramp(t, tend - 0.2, tend + 0.8)
    ox = lerp(1460, 1500, end_k)
    oy = lerp(600, 700, end_k)
    draw_octopus(c, ox, oy + 12 * math.sin(t * 2), lerp(0.85, 0.65, end_k), t, o)
    pbounce = 24 * abs(math.sin(t * 5)) * fade(t, x.L(6), x.E(7) + 0.5, 0.2)
    draw_fish(c, lerp(1180, 1180, end_k), lerp(420, 640, end_k) + 16 * math.sin(t * 2.4) - pbounce, 0.9, t, facing=1, mouth=x.mouth("PIP", t),
              expr="happy" if t > x.L(6) else "normal", blink=blink(t, 2))
    # cards
    ca = 1 - ramp(t, tbonus - 0.3, tbonus + 0.2)
    if ca > 0:
        label(c, "WHAT WE LEARNED", 560, 130, 56, bg=DARK, fg=(255, 255, 255), a=ca * ramp(t, x.start, x.start + 0.5), scale=pop(t, x.start + 0.2))
        items = [("1", "Chromatophores: stretchy color sacs", hexc("#E63946")),
                 ("2", "Iridophores + leucophores: shimmer & white", hexc("#3BB3E0")),
                 ("3", "Papillae: smooth, bumpy, spiky skin", hexc("#9B5DE5")),
                 ("4", "Color to hide AND to show feelings", hexc("#2FBF71"))]
        for i, (n, s, colr) in enumerate(items):
            tc = x.L(1 + i)
            a = ca * ramp(t, tc, tc + 0.3)
            if a <= 0:
                continue
            k = pop(t, tc, 0.5)
            c.save()
            c.translate(lerp(-600, 0, min(1, k)), 0)
            y = 250 + i * 150
            pill(c, 90, y, 980, 120, (255, 255, 255), a, r=34)
            c.drawCircle(160, y + 60, 42, P(colr, a))
            text(c, n, 160, y + 78, 52, (255, 255, 255), a, shadow=False)
            text(c, s, 225, y + 76, 40, DARK, a, name="Nunito-ExtraBold", align="left", shadow=False)
            c.restore()
    # bonus fact
    ba = fade(t, tbonus, tend - 0.2, 0.3)
    if ba > 0:
        s = pop(t, tbonus, 0.5)
        c.save()
        c.translate(620, 400)
        c.scale(s, s)
        c.rotate(-6 + 3 * math.sin(t * 2))
        star(c, 0, 0, 230, hexc("#FFD93B"), ba)
        text(c, "BONUS", 0, -10, 64, DARK, ba, shadow=False)
        text(c, "FACT", 0, 55, 64, DARK, ba, shadow=False)
        c.restore()
        tcb = x.wt(5, "color-blind")
        label(c, "Most octopuses are probably COLOR-BLIND!", 620, 760, 46, bg=(255, 255, 255), fg=DARK,
              a=ba * ramp(t, tcb - 0.3, tcb), scale=pop(t, tcb - 0.3))
        speech_mark(c, "?", ox + 170, 300, ba * ramp(t, tcb, tcb + 0.3), 0.8)
    # end card
    ea = ramp(t, tend - 0.2, tend + 0.6)
    if ea > 0:
        s = pop(t, tend, 0.6)
        c.save(); c.translate(760, 300); c.scale(s, s)
        text(c, "WHAT WOULD YOU DO?", 0, 0, 96, (255, 255, 255), ea, outline=DARK, ow=14)
        c.restore()
        tsc = x.wt(8, "Stay curious")
        s2 = pop(t, tsc, 0.5)
        c.save(); c.translate(760, 470); c.scale(s2, s2)
        word = "STAY CURIOUS!"
        total = text_width(word, 130)
        xx = -total / 2
        for i, ch in enumerate(word):
            w = text_width(ch, 130)
            text(c, ch, xx + w / 2, 6 * math.sin(t * 3 + i * 0.6), 130, hsv((i * 0.07 + t * 0.1) % 1, 0.6, 1), ea, outline=DARK, ow=16)
            xx += w
        c.restore()
        tn = x.wt(8, "next What If")
        label(c, "See you on the next WHAT IF adventure!", 760, 640, 46, bg=OLLIE_ORANGE, fg=(255, 255, 255),
              a=ea * ramp(t, tn - 0.3, tn), scale=pop(t, tn - 0.3))
    draw_bubbles(c, t, 300, 1000, n=10, seed=4, size=1.5)
    draw_particles(c, t)
    vignette(c)
    # final fade to black
    fo = ramp(t, x.end - 1.6, x.end - 0.1)
    if fo > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), P((2, 12, 24), fo))


SCENE_FUNCS = {"intro": scene_intro, "meet": scene_meet, "science": scene_science, "practice": scene_practice,
               "shark": scene_shark, "feelings": scene_feelings, "recap": scene_recap}


def render_frame(c, t, timeline, xs):
    scenes = timeline["scenes"]
    for i, sc in enumerate(scenes):
        if t < sc["end"] or i == len(scenes) - 1:
            break
    c.clear(skia.ColorBLACK)
    SCENE_FUNCS[sc["name"]](c, t, xs[i])
    for j in range(1, len(scenes)):
        bubble_transition(c, t, scenes[j]["start"])
    # fade in at the very start
    if t < 1.2:
        c.drawRect(skia.Rect.MakeWH(W, H), P((2, 12, 24), 1 - smooth(t / 1.2)))
