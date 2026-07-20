# Third-party model register

This service is a **research integration**. Do not enable the downloaded checkpoints for a commercial salon service until the dataset/model permissions are confirmed in writing.

| Runtime component | Source | Purpose | Important terms |
|---|---|---|---|
| BiSeNet ResNet18 ONNX | `yakhyo/face-parsing` | Face/skin parsing | Repository code is MIT; published weights are trained on CelebAMask-HQ, whose dataset terms are non-commercial. |
| Acne-LDS fold 0 | `openface-io/acne-lds` | ACNE04 severity grade and lesion-count estimate | Code is MIT. ACNE04 is described by its authors as free for academic use; other use requires contacting the authors. |
| FFHQ-Wrinkle stage 2 U-Net | `labhai/ffhq-wrinkle-dataset` | Wrinkle segmentation | FFHQ-Wrinkle is CC BY-NC-SA 4.0 and explicitly non-commercial. The checkpoint is derived from that dataset. |
| ACNE04-v2 | `AIpourlapeau/acne04v2` | Future lesion-localization training | This repository publishes 32,443 annotations for 1,204 ACNE04 images, not a ready-to-run checkpoint. It is not loaded at runtime by this version. |

The service deliberately labels its output as non-diagnostic and research-only. Before commercial release, replace the restricted checkpoints with models trained on data that COSMO can lawfully use, or obtain permissions from all relevant rights holders.
