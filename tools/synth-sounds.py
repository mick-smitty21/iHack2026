"""Synthesize the 19 non-music sounds (+2 optional) for Grandma's Recipe Box.

Every sound is generated from noise and sine waves, so there is nothing to license.
Output: WAV files in ./wav, converted to 128 kbps MP3 by convert.sh.
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(1981)
OUT = os.path.join(os.path.dirname(__file__), "wav")
os.makedirs(OUT, exist_ok=True)


# ---------- helpers ----------
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def noise(n):
    return rng.standard_normal(n)


def bp(x, lo, hi, order=4):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)


def lp(x, f, order=4):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=4):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def pink(n):
    # Voss-McCartney-ish via FFT 1/f shaping
    w = np.fft.rfft(noise(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    w = w / np.sqrt(f)
    x = np.fft.irfft(w, n)
    return x / np.max(np.abs(x))


def env_exp(n, tau_s):
    return np.exp(-np.arange(n) / (tau_s * SR))


def place(buf, sig, at_s, gain=1.0):
    i = int(at_s * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += gain * sig[: j - i]


def partials(dur, freqs, amps, taus, attack=0.002):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for f, a, tau in zip(freqs, amps, taus):
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / tau)
    att = np.minimum(1, t / attack)
    tail = np.minimum(1, (dur - t) / 0.03)  # WHY: avoid a click where the tone is cut off
    return out * att * tail


def room(x, decay=0.08, mix=0.15):
    n = int(decay * 4 * SR)
    ir = noise(n) * env_exp(n, decay)
    ir = lp(ir, 6000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= (np.max(np.abs(wet)) + 1e-9)
    dry = x / (np.max(np.abs(x)) + 1e-9)
    return dry * (1 - mix) + wet * mix


def fade(x, fin=0.005, fout=0.02):
    n_in, n_out = int(fin * SR), int(fout * SR)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def seamless(gen_fn, loop_s, xfade_s=2.0):
    """Make a loop whose end flows into its start."""
    total = gen_fn(loop_s + xfade_s)
    L, X = int(loop_s * SR), int(xfade_s * SR)
    out = total[:L].copy()
    w = np.linspace(0, 1, X)
    out[:X] = total[:X] * np.sqrt(w) + total[L:L + X] * np.sqrt(1 - w)
    return out


def save(name, x, peak_db=-1.0):
    x = np.asarray(x, dtype=np.float64)
    x = x - np.mean(x)
    pk = np.max(np.abs(x)) + 1e-12
    x = x / pk * (10 ** (peak_db / 20))
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))
    print(f"{name:16s} {len(x)/SR:6.2f}s")


# ---------- ambient loops ----------
def fire(dur):
    n = int(dur * SR)
    t = t_axis(dur)
    # low roar: brown-ish noise with slow swell
    roar = lp(np.cumsum(noise(n)) * 0.02, 400)
    roar = hp(roar, 40)
    roar /= np.max(np.abs(roar)) + 1e-9
    swell = 0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * t) * np.sin(2 * np.pi * 0.023 * t + 1)
    hiss = bp(noise(n), 2000, 9000) * 0.05
    hiss /= np.max(np.abs(hiss)) + 1e-9
    out = roar * 0.35 * swell + hiss * 0.06 * swell
    # crackles: Poisson events with varying rate
    t_now = 0.0
    while t_now < dur:
        rate = 5 + 4 * np.sin(2 * np.pi * 0.05 * t_now) + rng.uniform(-2, 2)
        t_now += rng.exponential(1 / max(rate, 1.5))
        ln = int(rng.uniform(0.002, 0.018) * SR)
        burst = hp(noise(ln), rng.uniform(1500, 4000), 2) * env_exp(ln, rng.uniform(0.001, 0.005))
        amp = min(1.0, rng.lognormal(-1.4, 0.6))
        place(out, burst / (np.max(np.abs(burst)) + 1e-9), t_now, amp)
        if rng.random() < 0.06:  # occasional bigger pop
            ln2 = int(0.04 * SR)
            pop = bp(noise(ln2), 300, 2500, 2) * env_exp(ln2, 0.008)
            place(out, pop / (np.max(np.abs(pop)) + 1e-9), t_now + 0.003, rng.uniform(0.6, 1.0))
    return out


def clock(dur):
    n = int(dur * SR)
    out = np.zeros(n)
    tick = partials(0.06, [2600, 4100, 6900], [1, 0.6, 0.3], [0.006, 0.004, 0.003])
    tick += 0.4 * hp(noise(len(tick)), 3000, 2) * env_exp(len(tick), 0.002)
    tock = partials(0.06, [1900, 3300, 5200], [1, 0.5, 0.25], [0.008, 0.005, 0.003])
    tock += 0.35 * hp(noise(len(tock)), 2500, 2) * env_exp(len(tock), 0.002)
    k = 0
    while k < dur:
        place(out, tick if k % 2 == 0 else tock, k + 0.05, 0.9 if k % 2 == 0 else 0.8)
        k += 1
    out = room(out, decay=0.06, mix=0.25)
    out += 0.004 * lp(noise(n), 300)  # faint room tone
    return out


def rain(dur):
    n = int(dur * SR)
    t = t_axis(dur)
    bed = bp(pink(n), 400, 9000)
    bed /= np.max(np.abs(bed)) + 1e-9
    bed *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.04 * t)
    out = bed * 0.5
    # light patter on glass
    count = int(dur * 120)
    for at in rng.uniform(0, dur, count):
        ln = int(0.006 * SR)
        d = hp(noise(ln), 3000, 2) * env_exp(ln, 0.0012)
        place(out, d, at, rng.uniform(0.05, 0.25))
    # occasional heavier drips
    for at in rng.uniform(0, dur, int(dur * 0.8)):
        f = rng.uniform(1800, 3600)
        d = partials(0.08, [f, f * 1.6], [1, 0.3], [0.012, 0.008])
        place(out, d, at, rng.uniform(0.08, 0.2))
    return out


def snow_wind(dur):
    n = int(dur * SR)
    t = t_axis(dur)
    base = noise(n)
    bands = [(150, 300), (250, 500), (400, 800), (700, 1300)]
    out = np.zeros(n)
    for i, (lo, hi) in enumerate(bands):
        b = bp(base, lo, hi, 2)
        b /= np.max(np.abs(b)) + 1e-9
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * (0.03 + 0.017 * i) * t + rng.uniform(0, 6.28))
        out += b * lfo ** 2
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.045 * t) * np.sin(2 * np.pi * 0.011 * t + 2)
    return lp(out * gust, 1500)


def purr(dur):
    """A sleeping cat: a slow rattle of soft thumps that rises and falls with each breath."""
    n = int(dur * SR)
    t = t_axis(dur)
    # One breath is about 2.9 s: in (a little slower and softer), a tiny pause, then out.
    breath_s = 2.9
    phase = (t / breath_s) % 1.0
    breathing_in = phase < 0.45
    rate = np.where(breathing_in, 22.5, 26.0) + 0.8 * np.sin(2 * np.pi * 0.11 * t)   # thumps per second
    loud = np.where(breathing_in, np.abs(np.sin(np.pi * phase / 0.45)) ** 0.6 * 0.8,
                    np.abs(np.sin(np.pi * (phase - 0.45) / 0.55)) ** 0.6)
    loud = lp(np.nan_to_num(loud), 12, 2)             # no clicks where a breath turns round
    # The rattle: a sawtooth-ish pulse at the thump rate, roughened so no two thumps match.
    cycle = (np.cumsum(rate) / SR) % 1.0
    thump = np.exp(-cycle * 7.0) * (1 + 0.25 * lp(noise(n), 30, 2) * 8)
    # WHY so little deep bass: tablet and laptop speakers can't play it, so the purr
    # has to live mostly between 150 and 1400 Hz to be heard at all.
    # Each thump shakes the chest (a low body tone) and the throat (soft breathy noise).
    body = bp(thump, 70, 420, 2)
    throat = bp(noise(n), 250, 1400, 2) * thump * 0.5
    air = bp(noise(n), 900, 3200, 2) * loud * 0.02     # the faint hiss of the breath itself
    out = (body / (np.max(np.abs(body)) + 1e-9) + throat / (np.max(np.abs(throat)) + 1e-9) * 1.3) * loud + air
    drift = 0.85 + 0.15 * np.sin(2 * np.pi * 0.031 * t + 2)   # some breaths deeper than others
    return out * drift


# ---------- effects ----------
def fx_lamp():
    out = np.zeros(int(0.3 * SR))
    chain = hp(noise(int(0.04 * SR)), 4000, 2) * env_exp(int(0.04 * SR), 0.006)
    place(out, chain, 0.0, 0.5)
    click = partials(0.05, [3200, 5100, 7600], [1, 0.6, 0.3], [0.006, 0.004, 0.003])
    click += 0.6 * hp(noise(len(click)), 2000, 2) * env_exp(len(click), 0.0015)
    place(out, click, 0.07, 1.0)
    return fade(room(out, 0.04, 0.12), 0.001, 0.02)


def fx_lid(open_=True):
    dur = 1.4
    n = int(dur * SR)
    t = t_axis(dur)
    pulses = np.zeros(n)
    rate_curve = 35 + 55 * np.sin(np.pi * np.clip(t / 1.1, 0, 1))  # stick-slip rate
    phase, i = 0.0, 0
    amp_env = np.clip(np.sin(np.pi * np.clip(t / 1.15, 0, 1)), 0, 1) ** 0.6
    while i < n:
        r = rate_curve[i] * rng.uniform(0.85, 1.15)
        pulses[i] = amp_env[i] * rng.uniform(0.6, 1.0)
        i += int(SR / r)
    creak = np.zeros(n)
    for f, q in [(620, 0.012), (1240, 0.008), (2100, 0.005)]:
        ln = int(0.05 * SR)
        res = np.sin(2 * np.pi * f * np.arange(ln) / SR) * env_exp(ln, q)
        creak += fftconvolve(pulses, res)[:n]
    creak = bp(creak, 300, 5000, 2)
    knock = partials(0.2, [180, 410], [1, 0.4], [0.03, 0.02])
    knock += 0.3 * lp(noise(len(knock)), 1200) * env_exp(len(knock), 0.01)
    place(creak, knock * np.max(np.abs(creak)) * 0.6, 1.2)
    return fade(room(creak, 0.07, 0.2), 0.01, 0.05)


def fx_lid_close():
    out = np.zeros(int(0.7 * SR))
    thud = partials(0.4, [110, 230, 520], [1, 0.5, 0.2], [0.07, 0.04, 0.02])
    thud += 0.4 * lp(noise(len(thud)), 900) * env_exp(len(thud), 0.015)
    place(out, thud, 0.02, 1.0)
    rattle = partials(0.06, [1500, 2900], [1, 0.4], [0.01, 0.006])
    place(out, rattle, 0.11, 0.12)
    return fade(room(out, 0.06, 0.18), 0.001, 0.05)


def fx_shuffle():
    out = np.zeros(int(1.0 * SR))
    at = 0.02
    for k in range(9):
        ln = int(rng.uniform(0.025, 0.05) * SR)
        e = np.sin(np.pi * np.linspace(0, 1, ln)) ** 2
        flick = bp(noise(ln), rng.uniform(1500, 2500), rng.uniform(5000, 8000), 2) * e
        place(out, flick, at, rng.uniform(0.5, 1.0) * (1 - k * 0.05))
        at += rng.uniform(0.06, 0.1)
    return fade(out, 0.002, 0.05)


def fx_ting():
    f0 = 2350
    s = partials(1.3, [f0, f0 * 2.32, f0 * 4.25, f0 * 6.63],
                 [1, 0.35, 0.15, 0.05], [0.45, 0.2, 0.08, 0.04], attack=0.001)
    strike = hp(noise(int(0.004 * SR)), 5000, 2) * 0.3
    place(s, strike, 0)
    return fade(room(s, 0.1, 0.18), 0.001, 0.1)


def fx_binder():
    out = np.zeros(int(0.4 * SR))
    for at, g in [(0.0, 1.0), (0.035, 0.8)]:
        c = partials(0.15, [3100, 5200, 7900], [1, 0.7, 0.4], [0.03, 0.02, 0.012])
        c += 0.8 * hp(noise(len(c)), 3000, 2) * env_exp(len(c), 0.002)
        place(out, c, at, g)
    return fade(room(out, 0.05, 0.15), 0.001, 0.03)


def fx_twine():
    dur = 1.0
    n = int(dur * SR)
    t = t_axis(dur)
    grain = np.abs(lp(noise(n), 60))
    grain /= np.max(grain) + 1e-9
    body = bp(noise(n), 900, 4500, 2) * (0.3 + grain)
    e = np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 0.8
    return fade(body * e, 0.01, 0.06)


def fx_clink():
    out = np.zeros(int(0.6 * SR))
    wood = partials(0.2, [180, 420], [1, 0.3], [0.025, 0.015])
    place(out, wood, 0.0, 0.7)
    cer = partials(0.5, [1150, 2700, 4350, 6100], [1, 0.6, 0.35, 0.15],
                   [0.12, 0.07, 0.04, 0.025], attack=0.0008)
    place(out, cer, 0.0, 0.8)
    place(out, cer * 0.25, 0.045)
    return fade(room(out, 0.06, 0.15), 0.001, 0.05)


def fx_rattle():
    out = np.zeros(int(0.7 * SR))
    at, gap, g = 0.0, 0.09, 1.0
    for _ in range(7):
        c = partials(0.08, [1800, 3900, 5600], [1, 0.5, 0.2], [0.02, 0.012, 0.008], 0.0008)
        place(out, c, at, g)
        at += gap
        gap *= 0.78
        g *= 0.78
    return fade(room(out, 0.05, 0.15), 0.001, 0.05)


def fx_curtain():
    dur = 0.9
    n = int(dur * SR)
    t = t_axis(dur)
    scrape = bp(noise(n), 3000, 9000, 2) * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 1.5 * 0.35
    out = scrape
    for at in np.sort(rng.uniform(0.05, 0.65, 6)):
        j = partials(0.12, [4200, 6600, 8800], [1, 0.6, 0.3], [0.03, 0.02, 0.012], 0.0008)
        place(out, j, at, rng.uniform(0.3, 0.6))
    return fade(out, 0.01, 0.08)


def fx_chime():
    f = 523.25  # C5
    ratios = [0.5, 1.0, 1.19, 1.5, 2.0, 2.74]
    s = partials(3.0, [f * r for r in ratios], [0.35, 1, 0.4, 0.3, 0.2, 0.08],
                 [1.6, 1.3, 0.9, 0.7, 0.45, 0.25], attack=0.003)
    return fade(room(s, 0.15, 0.2), 0.001, 0.3)


def fx_kettle():
    dur = 3.0
    n = int(dur * SR)
    t = t_axis(dur)
    f = 1450 + 900 * (1 - np.exp(-t / 0.7)) + 12 * np.sin(2 * np.pi * 5.5 * t)
    phase = 2 * np.pi * np.cumsum(f) / SR
    amp = np.clip(t / 1.2, 0, 1) ** 1.5 * np.clip((dur - t) / 1.0, 0, 1)
    tone = (np.sin(phase) + 0.15 * np.sin(2 * phase)) * amp
    breath = bp(noise(n), 1200, 6000, 2)
    breath /= np.max(np.abs(breath)) + 1e-9
    steam = breath * (0.15 + 0.25 * np.clip(t / 0.4, 0, 1)) * np.clip((dur - t) / 0.8, 0, 1)
    return fade(tone * 0.7 + steam * 0.4, 0.02, 0.1)


def fx_static():
    dur = 0.5
    n = int(dur * SR)
    t = t_axis(dur)
    hiss = bp(noise(n), 300, 4500, 2)
    hiss /= np.max(np.abs(hiss)) + 1e-9
    crack = np.zeros(n)
    for at in rng.uniform(0, dur, 40):
        ln = int(0.003 * SR)
        place(crack, noise(ln) * env_exp(ln, 0.0008), at, rng.uniform(0.3, 1))
    f = 700 + 2600 * t / dur
    whistle = 0.15 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.sin(np.pi * t / dur) ** 0.5
    return fade((hiss * 0.6 + crack * 0.5 + whistle) * e, 0.005, 0.03)


def fx_timer_ding():
    out = np.zeros(int(1.6 * SR))
    bell = partials(1.2, [2100, 5150, 8100], [1, 0.45, 0.2], [0.5, 0.2, 0.08], 0.0008)
    for k in range(12):
        place(out, bell, k * 0.05, 0.55 + 0.03 * k)
    return fade(room(out, 0.08, 0.12), 0.001, 0.15)


def fx_pageflip():
    dur = 0.45
    n = int(dur * SR)
    t = t_axis(dur)
    e = np.sin(np.pi * t / dur) ** 2
    swish = bp(noise(n), 800, 7000, 2) * e
    snap = hp(noise(int(0.01 * SR)), 2500, 2) * env_exp(int(0.01 * SR), 0.002)
    place(swish, snap * 1.5, 0.33)
    return fade(swish, 0.005, 0.03)


def fx_pencil():
    dur = 0.35
    n = int(dur * SR)
    t = t_axis(dur)
    grain = np.abs(lp(noise(n), 120))
    grain /= np.max(grain) + 1e-9
    s = bp(noise(n), 2500, 9000, 2) * (0.2 + grain) * np.sin(np.pi * t / dur) ** 0.7
    return fade(s, 0.005, 0.03)


if __name__ == "__main__":
    save("loop-fire", seamless(fire, 75), -3)
    save("loop-clock", seamless(clock, 60), -3)
    save("loop-rain", seamless(rain, 75), -3)
    save("loop-snow", seamless(snow_wind, 75), -3)
    save("loop-purr", seamless(purr, 60), -3)   # M6: the cat under the table
    save("fx-lamp", fx_lamp())
    save("fx-lid", fx_lid())
    save("fx-lid-close", fx_lid_close())
    save("fx-shuffle", fx_shuffle())
    save("fx-ting", fx_ting())
    save("fx-binder", fx_binder())
    save("fx-twine", fx_twine())
    save("fx-clink", fx_clink())
    save("fx-rattle", fx_rattle())
    save("fx-curtain", fx_curtain())
    save("fx-chime", fx_chime())
    save("fx-kettle", fx_kettle())
    save("fx-static", fx_static())
    save("fx-timer-ding", fx_timer_ding())
    save("fx-pageflip", fx_pageflip())
    save("fx-pencil", fx_pencil())
