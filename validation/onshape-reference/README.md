# Independent Onshape reference evidence

This directory contains the strict capture schema, pending/approved records, append-only hash manifest, and offline evaluator. The evaluator and recorder are independent of Leqad's production recognition path. Dependency checks fail if the harness imports app selectors, recognition, guidance, or registry code, or if the app imports the harness.

`captures/pending/` contains sanitized owner captures that are not authoritative. After review, the owner approval command copies the bytes unchanged to `captures/approved/` and adds their SHA-256 to `manifests/approved.json`. `.github/CODEOWNERS` names the owner for these changes. Repository branch protection must require code-owner review; a hash alone cannot prevent a coordinated evidence-and-manifest rewrite.

`pnpm reference:evaluate -- cap_<capture-id>` compares a manually entered Leqad observation with a hash-verified approved capture. It reports offline outcomes only. CI, synthetic fixtures, and capture comparison do not establish current real-Onshape acceptance or geometry verification. A fresh owner test is required to claim current compatibility, regardless of any historical result.
