from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
CAPTURES = ROOT / "assets" / "captures"
OUTPUT = ROOT / "output"
OUTPUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FPS = 60
DURATION = 18.0
TOTAL_FRAMES = int(FPS * DURATION)

CREAM = (246, 242, 234)
CREAM_2 = (235, 231, 219)
GREEN = (22, 58, 41)
GREEN_2 = (11, 41, 28)
GOLD = (195, 145, 76)
INK = (23, 47, 35)
MUTED = (92, 106, 96)
WHITE = (255, 254, 250)

SERIF = Path("C:/Windows/Fonts/georgia.ttf")
SERIF_BOLD = Path("C:/Windows/Fonts/georgiab.ttf")
SANS = Path("C:/Windows/Fonts/segoeui.ttf")
SANS_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


F_BRAND = font(SANS_BOLD, 24)
F_EYEBROW = font(SANS_BOLD, 22)
F_H1 = font(SERIF_BOLD, 82)
F_H2 = font(SERIF_BOLD, 68)
F_BODY = font(SANS, 32)
F_CHIP = font(SANS_BOLD, 24)
F_SMALL = font(SANS, 21)
F_CTA = font(SERIF_BOLD, 74)
F_DOMAIN = font(SANS_BOLD, 48)


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def ease(v: float) -> float:
    v = clamp(v)
    return 1 - (1 - v) ** 3


def smooth(v: float) -> float:
    v = clamp(v)
    return v * v * (3 - 2 * v)


def back_out(v: float) -> float:
    """Sprężyste, ale kontrolowane wejście znane z motion designu."""
    v = clamp(v)
    c1 = 1.35
    c3 = c1 + 1
    return 1 + c3 * (v - 1) ** 3 + c1 * (v - 1) ** 2


def gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    a = np.array(top, dtype=np.float32)[None, None, :]
    b = np.array(bottom, dtype=np.float32)[None, None, :]
    arr = np.repeat((a * (1 - y) + b * y).astype(np.uint8), W, axis=1)
    return Image.fromarray(arr, "RGB").convert("RGBA")


BG_CREAM = gradient((250, 247, 240), (231, 233, 222))
BG_GREEN = gradient((26, 64, 45), (8, 34, 24))


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    r = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return r.crop((left, top, left + tw, top + th))


def prepare_capture(name: str, crop_box: tuple[int, int, int, int]) -> Image.Image:
    im = Image.open(CAPTURES / name).convert("RGB").crop(crop_box)
    return cover(im, (914, 570))


CAPTURE_DATA = {
    "dashboard": prepare_capture("01-dashboard.png", (0, 55, 1424, 855)),
    "booking": prepare_capture("02-booking.png", (245, 65, 1400, 810)),
    "loyalty": prepare_capture("03-loyalty.png", (245, 65, 1400, 835)),
    "beauty": prepare_capture("04-beauty-plan.png", (245, 65, 1400, 835)),
    "chat": prepare_capture("05-chat.png", (245, 65, 1400, 700)),
}


def text_center(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, fnt, fill, spacing=8):
    x, y = xy
    box = draw.multiline_textbbox((0, 0), value, font=fnt, spacing=spacing, align="center")
    w = box[2] - box[0]
    draw.multiline_text((x - w / 2, y), value, font=fnt, fill=fill, spacing=spacing, align="center")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def alpha_paste(base: Image.Image, layer: Image.Image, xy: tuple[int, int], alpha: float = 1.0):
    if alpha <= 0:
        return
    if alpha < 1:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda x: int(x * alpha)))
    base.alpha_composite(layer, xy)


def draw_decor(img: Image.Image, dark: bool, phase: float):
    d = ImageDraw.Draw(img, "RGBA")
    color = (220, 172, 104, 50 if dark else 42)
    cx = 920 + int(math.sin(phase * 1.4) * 20)
    cy = 275 + int(math.cos(phase) * 18)
    for r in (130, 190, 250):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=2)
    d.line((80, 1740, 1000, 1740), fill=(255, 255, 255, 24) if dark else (26, 64, 45, 25), width=2)
    for i in range(7):
        x = 82 + i * 26
        d.ellipse((x, 1786, x + 5, 1791), fill=(GOLD[0], GOLD[1], GOLD[2], 110))


def brand(draw: ImageDraw.ImageDraw, dark: bool):
    fill = WHITE if dark else GREEN
    draw.text((72, 82), "BESKIDSTUDIO", font=F_BRAND, fill=fill, stroke_width=0)
    draw.line((72, 124, 190, 124), fill=GOLD, width=3)
    draw.text((842, 87), "PANEL KLIENTA", font=F_SMALL, fill=(*fill, 155))


def browser_card(key: str, progress: float, dark_bg: bool = False) -> Image.Image:
    card = Image.new("RGBA", (970, 654), (0, 0, 0, 0))
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.rounded_rectangle((18, 22, 952, 638), radius=34, fill=(4, 23, 15, 86 if dark_bg else 54))
    shadow = shadow.filter(ImageFilter.GaussianBlur(17))
    card.alpha_composite(shadow)

    shell = Image.new("RGBA", (940, 618), (255, 255, 255, 255))
    shd = ImageDraw.Draw(shell, "RGBA")
    shd.rounded_rectangle((0, 0, 939, 617), radius=27, fill=(252, 251, 247, 255), outline=(201, 194, 179, 120), width=2)
    shd.rectangle((0, 38, 940, 618), fill=(255, 255, 255, 255))
    for i, c in enumerate(((207, 117, 92), (220, 170, 87), (91, 151, 108))):
        shd.ellipse((22 + i * 24, 15, 34 + i * 24, 27), fill=(*c, 230))
    shd.rounded_rectangle((120, 11, 816, 30), radius=10, fill=(237, 234, 226, 255))

    screen = CAPTURE_DATA[key].copy()
    screen.putalpha(rounded_mask(screen.size, 0))
    shell.alpha_composite(screen, (13, 40))
    shell.putalpha(rounded_mask(shell.size, 27))
    card.alpha_composite(shell, (15, 0))

    zoom = 0.992 + 0.018 * smooth(progress)
    card = card.resize((int(card.width * zoom), int(card.height * zoom)), Image.Resampling.LANCZOS)
    return card


FEATURES = [
    {
        "key": "dashboard",
        "eyebrow": "01  •  WSZYSTKO W JEDNYM MIEJSCU",
        "title": "Salon zawsze\npod ręką.",
        "body": "Wizyty, zalecenia i pielęgnacja — bez szukania\nw wiadomościach i notatkach.",
        "chips": ("Dashboard", "Historia wizyt", "Powiadomienia"),
    },
    {
        "key": "booking",
        "eyebrow": "02  •  REZERWACJA ONLINE",
        "title": "Wizyta w kilka\nprostych kroków.",
        "body": "Klientka wybiera zabieg i dogodny termin.\nSzybko, czytelnie, o każdej porze.",
        "chips": ("24/7", "Przejrzyste usługi", "Mniej telefonów"),
    },
    {
        "key": "loyalty",
        "eyebrow": "03  •  LOJALNOŚĆ, KTÓRA WRACA",
        "title": "Punkty, poziomy,\nrealne korzyści.",
        "body": "Program lojalnościowy motywuje do kolejnej wizyty\ni wzmacnia relację z marką.",
        "chips": ("Punkty", "Kupony", "Poziomy klienta"),
    },
    {
        "key": "beauty",
        "eyebrow": "04  •  PERSONALIZACJA",
        "title": "Beauty Plan skrojony\npod konkretną skórę.",
        "body": "Indywidualne rekomendacje budują zaufanie\ni przedłużają efekt zabiegu.",
        "chips": ("Plan pielęgnacji", "Rekomendacje", "Opieka po wizycie"),
    },
    {
        "key": "chat",
        "eyebrow": "05  •  STAŁY KONTAKT",
        "title": "Wsparcie wtedy,\nkiedy jest potrzebne.",
        "body": "Prywatny czat z salonem skraca dystans\ni daje klientce poczucie zaopiekowania.",
        "chips": ("Prywatność", "Załączniki", "Szybka odpowiedź"),
    },
]


def scene_intro(local_t: float) -> Image.Image:
    p = back_out(local_t / 0.62)
    img = BG_GREEN.copy()
    draw_decor(img, True, local_t)
    d = ImageDraw.Draw(img, "RGBA")
    brand(d, True)

    text_center(d, (W // 2, 260 + int((1 - p) * 55)), "PANEL KLIENTA", F_EYEBROW, (*GOLD, int(255 * p)))
    text_center(d, (W // 2, 350 + int((1 - p) * 55)), "Twoja pielęgnacja.\nZawsze pod ręką.", F_H1, (*WHITE, int(255 * clamp(p))), spacing=12)
    text_center(d, (W // 2, 575 + int((1 - p) * 38)), "Poznaj panel klienta — od rezerwacji\npo codzienną opiekę nad skórą.", F_BODY, (235, 237, 229, int(225 * clamp(p))), spacing=10)

    # Warstwowe miniatury produktu od razu pokazują, że to realny system.
    for idx, (key, ang, ox, oy) in enumerate((("loyalty", -6, -210, 80), ("booking", 6, 210, 90), ("dashboard", 0, 0, 0))):
        enter = back_out((local_t - 0.18 - idx * 0.08) / 0.5)
        thumb = browser_card(key, 0.25, True).resize((760, 512), Image.Resampling.LANCZOS)
        thumb = thumb.rotate(ang, resample=Image.Resampling.BICUBIC, expand=True)
        x = W // 2 - thumb.width // 2 + ox
        y = 900 + oy + int((1 - enter) * 130)
        alpha_paste(img, thumb, (x, y), clamp(enter) * (0.68 if idx < 2 else 1.0))
    d.rounded_rectangle((270, 1650, 810, 1732), radius=41, fill=(*GOLD, int(235 * clamp(p))))
    text_center(d, (W // 2, 1669), "ZOBACZ, JAK TO DZIAŁA  →", F_CHIP, (20, 49, 34, int(255 * clamp(p))))
    return img


def scene_feature(index: int, local_t: float, duration: float) -> Image.Image:
    data = FEATURES[index]
    p = back_out(local_t / 0.48)
    img = BG_CREAM.copy()
    draw_decor(img, False, local_t + index)
    d = ImageDraw.Draw(img, "RGBA")
    brand(d, False)

    y_shift = int((1 - p) * 58)
    x_shift = int((1 - p) * -65)
    d.text((72 + x_shift, 220 + y_shift), data["eyebrow"], font=F_EYEBROW, fill=(*GOLD, int(255 * clamp(p))))
    d.multiline_text((72 + x_shift, 282 + y_shift), data["title"], font=F_H2, fill=(*INK, int(255 * clamp(p))), spacing=7)
    d.multiline_text((72 + x_shift, 475 + y_shift), data["body"], font=F_BODY, fill=(*MUTED, int(230 * clamp(p))), spacing=9)

    card = browser_card(data["key"], local_t / duration)
    direction = -1 if index % 2 == 0 else 1
    x = W // 2 - card.width // 2 + int(direction * (1 - p) * 170)
    y = 700 + int((1 - p) * 95) + int(math.sin(local_t * 2.2) * 3)
    # Subtelna smuga ruchu daje wrażenie motion blur bez utraty ostrości UI.
    alpha_paste(img, card, (x - direction * 22, y + 5), clamp(p) * 0.12)
    alpha_paste(img, card, (x, y), clamp(p))

    chip_y = 1450
    chip_x = 72
    for chip_index, chip in enumerate(data["chips"]):
        box = d.textbbox((0, 0), chip, font=F_CHIP)
        cw = box[2] - box[0] + 54
        cp = ease((local_t - 0.34 - chip_index * 0.09) / 0.55)
        d.rounded_rectangle((chip_x, chip_y + int((1 - cp) * 24), chip_x + cw, chip_y + 64 + int((1 - cp) * 24)), radius=32, fill=(255, 255, 251, int(236 * cp)), outline=(*GOLD, int(110 * cp)), width=2)
        d.text((chip_x + 27, chip_y + 15 + int((1 - cp) * 24)), chip, font=F_CHIP, fill=(*GREEN, int(255 * cp)))
        chip_x += cw + 14

    d.text((72, 1665), f"0{index + 1}", font=F_EYEBROW, fill=(*GOLD, 230))
    d.line((118, 1681, 930, 1681), fill=(*GREEN, 35), width=2)
    d.text((938, 1667), "05", font=F_EYEBROW, fill=(*GREEN, 95))
    return img


def scene_cta(local_t: float) -> Image.Image:
    p = back_out(local_t / 0.55)
    img = BG_GREEN.copy()
    draw_decor(img, True, local_t + 8)
    d = ImageDraw.Draw(img, "RGBA")
    brand(d, True)

    d.ellipse((435, 280, 645, 490), outline=(*GOLD, int(100 * p)), width=2)
    d.ellipse((470, 315, 610, 455), fill=(*GOLD, int(26 * p)), outline=(*GOLD, int(180 * p)), width=3)
    text_center(d, (W // 2, 355), "✦", font(SERIF, 58), (*GOLD, int(255 * p)))
    text_center(d, (W // 2, 585 + int((1 - p) * 55)), "Zapraszam na", F_CTA, (*WHITE, int(255 * clamp(p))), spacing=14)
    text_center(d, (W // 2, 742 + int((1 - p) * 42)), "Umów wizytę i odkryj pielęgnację\ndopasowaną do Twojej skóry.", F_BODY, (229, 235, 226, int(230 * clamp(p))), spacing=9)

    d.rounded_rectangle((100, 1000, 980, 1120), radius=60, fill=(*GOLD, int(245 * clamp(p))))
    text_center(d, (W // 2, 1030), "KosmetologWiktoriaCwik.pl", F_DOMAIN, (18, 49, 34, int(255 * clamp(p))))

    d.line((330, 1325, 750, 1325), fill=(*GOLD, int(140 * p)), width=2)
    text_center(d, (W // 2, 1375), "BESKIDSTUDIO", font(SANS_BOLD, 34), (*WHITE, int(255 * clamp(p))))
    text_center(d, (W // 2, 1430), "Kosmetologia • świadoma pielęgnacja", F_SMALL, (235, 237, 229, int(185 * clamp(p))))
    return img


BOUNDARIES = [0.0, 2.1, 4.75, 7.4, 10.05, 12.7, 15.35, 18.0]
XFADE = 0.28


def render_scene(index: int, local_t: float) -> Image.Image:
    if index == 0:
        return scene_intro(local_t)
    if 1 <= index <= 5:
        return scene_feature(index - 1, local_t, BOUNDARIES[index + 1] - BOUNDARIES[index])
    return scene_cta(local_t)


def render_frame(t: float) -> Image.Image:
    index = max(i for i in range(len(BOUNDARIES) - 1) if BOUNDARIES[i] <= t)
    local_t = t - BOUNDARIES[index]
    current = render_scene(index, local_t)
    if index > 0 and local_t < XFADE:
        mix = smooth(local_t / XFADE)
        previous_duration = BOUNDARIES[index] - BOUNDARIES[index - 1]
        previous = render_scene(index - 1, previous_duration + local_t)
        # Szybkie ukośne przejście maską, jak w klasycznym motion designie.
        mask = Image.new("L", (W, H), 0)
        md = ImageDraw.Draw(mask)
        edge = int(-420 + (W + 840) * mix)
        md.polygon(((-500, 0), (edge, 0), (edge + 380, H), (-500, H)), fill=255)
        current = Image.composite(current, previous, mask)
        stripe = ImageDraw.Draw(current, "RGBA")
        stripe.polygon(((edge - 28, 0), (edge + 10, 0), (edge + 390, H), (edge + 352, H)), fill=(*GOLD, 225))
    return current.convert("RGB")


def make_audio(path: Path):
    sr = 44100
    samples = int(DURATION * sr)
    t = np.arange(samples, dtype=np.float64) / sr
    # Dyskretny, autorski ambient: ciepły akord + krótkie dźwięki przy zmianie scen.
    audio = np.zeros(samples, dtype=np.float64)
    for freq, amp in ((130.81, 0.020), (164.81, 0.014), (196.00, 0.010), (261.63, 0.006)):
        audio += amp * np.sin(2 * np.pi * freq * t + freq / 50)
    audio *= 0.72 + 0.28 * np.sin(2 * np.pi * 0.08 * t)
    for beat in BOUNDARIES[1:-1]:
        dt = t - beat
        env = np.where((dt >= 0) & (dt < 0.85), np.exp(-5.2 * dt), 0.0)
        audio += env * (0.075 * np.sin(2 * np.pi * 523.25 * dt) + 0.045 * np.sin(2 * np.pi * 659.25 * dt))
    fade = np.minimum(np.clip(t / 1.0, 0, 1), np.clip((DURATION - t) / 1.2, 0, 1))
    audio *= fade
    stereo = np.stack((audio, audio * 0.96), axis=1)
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def render_video():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    temp_video = OUTPUT / "reel-video-only.mp4"
    temp_audio = OUTPUT / "reel-ambient.wav"
    final_video = OUTPUT / "beskidstudio-panel-klienta-reel.mp4"

    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "17",
        "-r", str(FPS), "-g", str(FPS * 2), "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(temp_video),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for frame_number in range(TOTAL_FRAMES):
        frame = render_frame(frame_number / FPS)
        proc.stdin.write(frame.tobytes())
        if frame_number == int(1.05 * FPS):
            frame.save(OUTPUT / "beskidstudio-panel-klienta-preview.png", quality=95)
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("FFmpeg nie ukończył renderowania obrazu")

    make_audio(temp_audio)
    mux = [
        ffmpeg, "-y", "-loglevel", "error", "-i", str(temp_video), "-i", str(temp_audio),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
        "-movflags", "+faststart", str(final_video),
    ]
    subprocess.run(mux, check=True)
    temp_video.unlink(missing_ok=True)
    temp_audio.unlink(missing_ok=True)
    print(final_video)


if __name__ == "__main__":
    render_video()
