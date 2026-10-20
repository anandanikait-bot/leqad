# Approved Leqad logo

## Immutable master

- Owner archive: `Leqad_Final_Approved_Logo_Original.zip`
- File: `leqad_isometric_learning_mark.png`
- RGB PNG, 1254 × 1254 pixels, 1,172,393 bytes
- SHA-256: `03f744dcc135567bb4f5f91c7a58ce3fe35783b6815942686586db29dc1ab01c`

This file is the owner's exact approved source. Copy its bytes; do not resave, redraw, vectorize, recolor, remove the background, or replace it. A unit test checks its original hash and dimensions.

## Faithful header crop

`leqad-header-mark.png` isolates the complete cube/path/dot artwork. The crop excludes the separate raster wordmark below it. The header retains its existing text label next to the mark.

- Original-coordinate box: `(319, 205, 935, 821)`, right/bottom exclusive, 616 × 616 pixels
- Resize: 132 × 132 pixels using Pillow's Lanczos filter
- Display: 33 × 33 CSS pixels, no CSS filters, recoloring, background removal, or distortion
- SHA-256: `3ed1c3e30f314851a50dccae1fa8b4db689407db6ea9c66a68e5e1f3c7f34d3d`

Reproduce the derivative from the repository root in an environment with Pillow:

```python
from pathlib import Path
from PIL import Image

root = Path("apps/extension/src/assets/brand")
with Image.open(root / "leqad_isometric_learning_mark.png") as master:
    master.crop((319, 205, 935, 821)).resize(
        (132, 132), Image.Resampling.LANCZOS
    ).save(root / "leqad-header-mark.png")
```

The PNG is imported with `?inline` to bundle it as a data URL inside the content script. This avoids resolving an image against the Onshape origin or adding permissions for asset loading. The full master stays in source control and is not embedded into the JavaScript bundle.

The owner must review the small derivative before it is used as a browser extension icon. No manifest icon is changed by this header integration. A fixture preview shows 16/24/32/33px sizes for review, without claiming icon approval or live Onshape acceptance.

## Original-lettering Option B: review only

The owner requested a comparison against the separately rendered header text.
`leqad-header-wordmark.png` is a faithful source crop of the original raster
lettering, including the ivory background. It is **not imported by production**.
Header A remains the default. Neither Option B nor a browser-icon derivative is
approved by this comparison.

- Original-coordinate box: `(230, 814, 1024, 1072)`, right/bottom exclusive, 794 × 258 pixels
- Resize: 320 × 104 pixels using Pillow's Lanczos filter (integer pixel rounding)
- Fixture display: 80 × 26 CSS pixels next to the existing 33px cube crop
- SHA-256: `08405d487717e32a06240b613d94eeea4331339c42f61e912070defeaebbae1c`

Reproduce from the unchanged master:

```python
with Image.open(root / "leqad_isometric_learning_mark.png") as master:
    master.crop((230, 814, 1024, 1072)).resize(
        (320, 104), Image.Resampling.LANCZOS
    ).save(root / "leqad-header-wordmark.png")
```

`tests/fixtures/headerReview.ts` applies this comparison to a controlled fixture
only. The preview is removed on reload, and browser tests verify that Header A
remains the default. There is no production toggle or alternate CAD behavior.
