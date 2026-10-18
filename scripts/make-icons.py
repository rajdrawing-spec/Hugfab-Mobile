#!/usr/bin/env python3
"""
Generate the app's launcher icons.

WHY THIS EXISTS, AND WHAT IT IS NOT
-----------------------------------
`app.json` shipped pointing at the Expo template's icons — the generic dark
chevron every unconfigured Expo app wears. That is a hard blocker for a Play
Store listing and it looked wrong on a test device next to the pink splash.

What this writes is a **placeholder**: a geometric H monogram in the brand pink
from `src/theme/tokens.json`. It is not a logo and it is not a substitute for
one. It exists so the build configuration is coherent and the home screen does
not say "Expo", and `docs/PRODUCTION-READINESS.md` lists real artwork as
outstanding. Replace the PNGs, or replace this script — either is fine, and
nothing imports it at runtime.

It is committed rather than run-and-forgotten so the placeholder is
reproducible: a reviewer can see exactly how these were made and that no
designer's work was quietly dropped in.

WHY IT IS HAND-ROLLED
---------------------
This container has no Pillow, no sharp, no ImageMagick and no librsvg, and the
network policy blocks installing them. A PNG is a zlib stream in a handful of
chunks, which is less code than arguing with the toolchain — so the geometry is
supersampled here and the file is written with `zlib` and `struct` from the
standard library.

    python3 scripts/make-icons.py

Geometry is in a 1024-square canvas. The adaptive-icon foreground keeps the mark
inside Android's safe zone: of the 108dp adaptive canvas only the central ~66% is
guaranteed visible, because the launcher may mask it to a circle, a squircle or a
rounded square, so a mark sized for the full square loses its corners.
"""

import struct
import zlib
from pathlib import Path

# --------------------------------------------------------------------------
# The palette. These are `src/theme/tokens.json` values, not new decisions.
#
# The pink is the one CLAUDE.md insists on: #D81B60 at 4.95:1 on white, chosen
# over the reference image's #E91E63 (4.35:1, fails WCAG AA). Do not brighten it
# here to make an icon pop — the contrast note in docs/design-system.md applies
# to the whole brand, and an icon is the first place someone would be tempted.
# --------------------------------------------------------------------------
PINK = (0xD8, 0x1B, 0x60)
WHITE = (0xFF, 0xFF, 0xFF)

CANVAS = 1024
SAMPLES = 4  # 4×4 subpixels per pixel; enough that no edge shows stair-steps.


def capsule(x0: float, y0: float, x1: float, y1: float):
    """A rectangle with semicircular ends — a rounded rect at full radius.

    Returned as a predicate rather than rasterised, so several can be unioned
    before anything is sampled and the joins come out seamless instead of
    showing where two antialiased edges were composited over each other.
    """
    radius = min(x1 - x0, y1 - y0) / 2
    cx0, cy0 = x0 + radius, y0 + radius
    cx1, cy1 = x1 - radius, y1 - radius

    def inside(px: float, py: float) -> bool:
        # Clamp to the capsule's spine, then measure.
        nx = min(max(px, cx0), cx1)
        ny = min(max(py, cy0), cy1)
        return (px - nx) ** 2 + (py - ny) ** 2 <= radius * radius

    return inside


def monogram(width: float, height: float, stroke: float):
    """The H: two stems and a crossbar, centred on the canvas.

    `stroke` is the limb thickness. The crossbar sits slightly above the optical
    centre — a bar on the exact midline reads as low, which is why type
    designers raise it.
    """
    cx = cy = CANVAS / 2
    x0, x1 = cx - width / 2, cx + width / 2
    y0, y1 = cy - height / 2, cy + height / 2
    bar_centre = cy - height * 0.02

    parts = [
        capsule(x0, y0, x0 + stroke, y1),
        capsule(x1 - stroke, y0, x1, y1),
        capsule(x0, bar_centre - stroke / 2, x1, bar_centre + stroke / 2),
    ]

    def inside(px: float, py: float) -> bool:
        return any(part(px, py) for part in parts)

    return inside


def coverage(shape, size: int) -> list[list[float]]:
    """Supersample `shape` into a 0–1 coverage value per pixel."""
    scale = CANVAS / size
    step = 1.0 / SAMPLES
    offsets = [(i + 0.5) * step for i in range(SAMPLES)]
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            hits = 0
            for dy in offsets:
                py = (y + dy) * scale
                for dx in offsets:
                    if shape((x + dx) * scale, py):
                        hits += 1
            row.append(hits / (SAMPLES * SAMPLES))
        rows.append(row)
    return rows


def write_png(path: Path, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    """Write RGBA pixels as a PNG.

    Filter type 0 (none) on every scanline: these are flat colour and a smooth
    edge, so the adaptive filters zlib would benefit from buy a few hundred
    bytes on a file written once.
    """
    height, width = len(pixels), len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    # Bit depth 8, colour type 6 (truecolour with alpha), no interlace.
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def compose(
    size: int,
    mark,
    *,
    background: tuple[int, int, int] | None,
    ink: tuple[int, int, int],
) -> list[list[tuple[int, int, int, int]]]:
    """The mark in `ink` over `background`, or over transparency when None."""
    cov = coverage(mark, size) if mark else [[0.0] * size for _ in range(size)]
    out = []
    for y in range(size):
        row = []
        for x in range(size):
            a = cov[y][x]
            if background is None:
                # Straight (unassociated) alpha: the colour stays full strength
                # and only alpha falls off, which is what every consumer of
                # these files expects. Premultiplying would fringe the edges.
                row.append((*ink, round(a * 255)))
            else:
                row.append(
                    (
                        *(
                            round(background[i] + (ink[i] - background[i]) * a)
                            for i in range(3)
                        ),
                        255,
                    )
                )
        out.append(row)
    return out


def main() -> None:
    assets = Path(__file__).resolve().parent.parent / "assets"

    # The full-bleed mark, for a square icon the OS will round off itself.
    full = monogram(width=480, height=600, stroke=132)

    # Smaller, for the adaptive foreground: inside the central ~66% that every
    # launcher mask is guaranteed to keep. A 400×500 box's corners sit 320px
    # from the centre, inside the 341px safe radius.
    safe = monogram(width=400, height=500, stroke=112)

    written = []

    # iOS and the generic icon. Opaque: iOS does not composite alpha and a
    # transparent icon comes out black there.
    write_png(assets / "icon.png", compose(1024, full, background=PINK, ink=WHITE))
    written.append("icon.png")

    # Android adaptive: background and foreground are separate layers so the
    # launcher can parallax them.
    write_png(
        assets / "android-icon-background.png",
        compose(1024, None, background=PINK, ink=PINK),
    )
    written.append("android-icon-background.png")

    write_png(
        assets / "android-icon-foreground.png",
        compose(1024, safe, background=None, ink=WHITE),
    )
    written.append("android-icon-foreground.png")

    # Themed icons (Android 13+) take the shape from the alpha channel and tint
    # it with the wallpaper palette, so the colour here is ignored.
    write_png(
        assets / "android-icon-monochrome.png",
        compose(1024, safe, background=None, ink=WHITE),
    )
    written.append("android-icon-monochrome.png")

    # The in-app splash draws its own branding; this is the native one, over the
    # pink `splash.backgroundColor` already set in app.json.
    write_png(
        assets / "splash-icon.png", compose(1024, safe, background=None, ink=WHITE)
    )
    written.append("splash-icon.png")

    # Web only, and small, so the mark is rendered at size rather than scaled.
    write_png(assets / "favicon.png", compose(48, full, background=PINK, ink=WHITE))
    written.append("favicon.png")

    for name in written:
        print(f"wrote assets/{name}")


if __name__ == "__main__":
    main()
