"""
prepare-art.py - tidies freshly generated art so the website can place it precisely.

Run it from the repo folder after adding or replacing pictures in assets/img/:

    python tools/prepare-art.py

It needs Pillow (pip install pillow). It is safe to run again and again: a picture
that is already tidy is left exactly as it is. It is NOT part of the website.

What it does, and why:

1. OBJECTS (cut-out PNGs such as obj-clock.png): crops away the empty transparent
   margin. Gemini centres each object in a big square, so without this a "10% wide"
   clock would really be a 10%-wide square with a much smaller clock inside it.
   Pictures that swap places (lamp off/on, twine tied/loose) are cropped to the same
   box so they don't jump when they swap.

2. ON-WHITE pictures (stains, illustrations, doodles): the site blends these with
   "multiply", which only hides the background if it is pure white. Gemini's "white"
   is often cream or slightly shaded, which shows up as a pale box. This pushes the
   background to pure white, then crops to the drawing.

3. age-corner.png: keeps only the folded corner itself.
"""

import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageMath, PngImagePlugin

FOLDER = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "assets" / "img"

# Pictures that are swapped for each other must share one crop box.
PAIRS = [("obj-lamp-off", "obj-lamp-on"), ("obj-twine", "obj-twine-loose")]

# Full-card textures: tidy the white, crop to the texture, but never to a "drawing".
FULL_FRAME = {"age-yellowing", "age-pencil"}

# Tiny pencil drawings on unevenly shaded paper need the stronger background fix.
SHADED_PAPER_PREFIX = "doodle-"

# The part of age-corner.png that is the fold itself (fractions of the picture):
# left, top, right, bottom. The top-right of this box is the card's corner.
CORNER_FOLD_BOX = (0.36, 0.20, 0.765, 0.52)

NEARLY_WHITE = 246   # anything this bright becomes pure white
PADDING = 2          # pixels of breathing room left around a crop


def alpha_box(image):
    """The box around everything that isn't transparent."""
    return image.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()


def padded(box, size):
    left, top, right, bottom = box
    return (max(0, left - PADDING), max(0, top - PADDING),
            min(size[0], right + PADDING), min(size[1], bottom + PADDING))


def union(a, b):
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def trim_objects():
    # Work out every crop box first, so paired pictures can share one.
    boxes = {}
    for path in sorted(FOLDER.glob("*.png")):
        image = Image.open(path)
        if image.mode == "RGBA" and alpha_box(image):
            boxes[path] = (alpha_box(image), image.size)

    for first, second in PAIRS:
        a, b = FOLDER / (first + ".png"), FOLDER / (second + ".png")
        if a in boxes and b in boxes and boxes[a][1] == boxes[b][1]:  # same canvas size
            shared = union(boxes[a][0], boxes[b][0])
            boxes[a] = (shared, boxes[a][1])
            boxes[b] = (shared, boxes[b][1])

    for path, (box, size) in boxes.items():
        box = padded(box, size)
        if box == (0, 0, *size):
            continue  # already tidy
        Image.open(path).crop(box).save(path)
        print(f"trimmed   {path.name}: {size} -> {box[2] - box[0]}x{box[3] - box[1]}")


def flat_background(image):
    """One background colour: the typical colour of the picture's outer edge."""
    w, h = image.size
    edge = Image.new("RGB", (w * 2 + h * 2, 1))
    strips = [image.crop((0, 2, w, 3)), image.crop((0, h - 3, w, h - 2)),
              image.crop((2, 0, 3, h)).rotate(90, expand=True), image.crop((w - 3, 0, w - 2, h)).rotate(90, expand=True)]
    x = 0
    for strip in strips:
        edge.paste(strip, (x, 0))
        x += strip.size[0]
    # the middle value of each colour channel along the edge
    typical = tuple(sorted(channel.tobytes())[channel.size[0] // 2] for channel in edge.split())
    return Image.new("RGB", image.size, typical)


def shaded_background(image):
    """A soft map of the paper's shading, found by erasing the thin pencil lines."""
    return image.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(30))


def whiten(image, background, nearly_white=NEARLY_WHITE):
    """Divides the picture by its background, so the background becomes white."""
    channels = []
    for pixel, paper in zip(image.split(), background.split()):
        ratio = ImageMath.lambda_eval(
            lambda args: args["convert"](args["min"](args["p"] * 255 / args["max"](args["b"], 1), 255), "L"),
            p=pixel, b=paper)
        channels.append(ratio.point(lambda v: 255 if v >= nearly_white else v))
    return Image.merge("RGB", channels)


def content_box(image, ignore_specks=False):
    """The box around everything that isn't pure white."""
    difference = ImageChops.difference(image, Image.new("RGB", image.size, (255, 255, 255))).convert("L")
    if ignore_specks:
        # keep only clearly drawn marks, and drop lone dots of paper grain
        marks = difference.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MedianFilter(5))
        box = marks.getbbox()
        return box and (box[0] - 8, box[1] - 8, box[2] + 8, box[3] + 8)
    return difference.point(lambda v: 255 if v > 6 else 0).getbbox()


def clean_on_white():
    for path in sorted(FOLDER.glob("*.png")):
        stem = path.stem
        if not stem.startswith(("age-", "ill-", "doodle-")):
            continue
        image = Image.open(path)
        if image.mode == "RGBA":
            continue
        image = image.convert("RGB")
        if image.info.get("prepared") == "yes":
            continue  # a note we leave inside the file the first time; see the end of this loop
        original_size = image.size

        if stem == "age-corner":
            w, h = image.size
            left, top, right, bottom = CORNER_FOLD_BOX
            if w == h:  # only the untouched square original still needs cropping
                image = image.crop((int(left * w), int(top * h), int(right * w), int(bottom * h)))
            cleaned = whiten(image, flat_background(image))
        else:
            if stem.startswith(SHADED_PAPER_PREFIX):
                # faint pencil on shaded paper: be firmer about what counts as "paper"
                cleaned = whiten(image, shaded_background(image), nearly_white=236)
            else:
                cleaned = whiten(image, flat_background(image))
            box = content_box(cleaned, ignore_specks=stem.startswith(SHADED_PAPER_PREFIX))
            if box:
                cleaned = cleaned.crop(box if stem in FULL_FRAME else padded(box, cleaned.size))
            if stem in FULL_FRAME:
                # shave the faint painted border so the texture runs edge to edge
                w, h = cleaned.size
                cleaned = cleaned.crop((int(w * 0.015), int(h * 0.02), int(w * 0.985), int(h * 0.98)))

        note = PngImagePlugin.PngInfo()
        note.add_text("prepared", "yes")  # so a second run leaves this picture alone
        cleaned.save(path, pnginfo=note)
        print(f"whitened  {path.name}: {original_size} -> {cleaned.size[0]}x{cleaned.size[1]}")


if __name__ == "__main__":
    if not FOLDER.is_dir():
        sys.exit(f"Can't find the art folder: {FOLDER}")
    trim_objects()
    clean_on_white()
    print("Art is ready.")
