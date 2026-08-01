# Animation Roadmap — Status to Full Parity
Atlas · 2026-08-01

## Completed this cycle

| Horizon | Capability | Status |
|---------|------------|--------|
| **Now** | 2.5D pose-to-pose + continuous motion base + intel composite | **DONE** |
| **Next** | Layered mouth/eye poses (viseme set) for talk energy | **DONE** |
| Pipeline SOP | Pixar-mapped stages + quality bar | **DONE** |
| Character bible | Locked identity + approved poses | **DONE** |
| Episode brief automation | Live clusters → brief JSON | **DONE** |
| Overlay automation | Title / badges / lower-third from brief | **DONE** |
| Assemble automation | Base + overlays + VO → master | **DONE** |
| Pose library | rest / talk / laugh / point / logo | **DONE** |
| Sunday Aug 1 master | Continuous motion + viseme cutaways + accurate intel | **DONE** |

## Remaining for true Pixar parity (external tooling required)

| Horizon | Capability | Blocker |
|---------|------------|---------|
| **Later** | Blender 3D hero mesh + FK/IK rig | No Blender in runtime |
| **Later** | Shot-based 3D animation caches (USD/Alembic) | Requires 3D farm |
| **Target** | Full lighting, FX, DI color pipeline | Requires 3D + grading suite |
| **Target** | Phoneme-accurate automatic lip-sync | Requires viseme solver / 3D jaw |

## Operating model until 3D comes online
1. Continuous character motion base
2. Episode intel from `build_episode_brief.py`
3. Overlays via `generate_overlays.py` + `assemble_edition.py`
4. Viseme cutaways during VO
5. No pure stills without micro-motion

## Sunday 2026-08-01 delivery
- Master: `animation/delivery/sunday_yardbird_aug1_master.mp4`
- Lead cluster: South Side CLUSTER-HOT (size 30)
- Secondaries: Northwest Side, Northeast Side
