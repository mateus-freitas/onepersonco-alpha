<!-- opc-block: swift-ios -->
<!-- opc-stack: swift ios -->

## Swift and iOS platform rules

- Xcode-only toolchain. Build, test, and archive through `xcodebuild` and the
  project's scripts; record the Xcode and Swift versions with every gate run, and
  treat a changed toolchain as a distinct environment, never an equivalent one.
- Iterate on Simulator; physical-device evidence is required where the platform
  or the project's gates demand it. The verification runner takes an exact
  destination UDID — not a device name and not a `booted` alias.
- Keep Xcode's normal ad-hoc signing and generated entitlements for Simulator
  test builds. Local identity (Keychain) depends on them; never disable signing
  to make a build pass.
- Verification entry points: `scripts/verify.py --suite <domain|editor|release>
  --destination <UDID>` (add `--platform device` for a physical iPhone) and
  `scripts/local-ci.py --results-dir <new path> --expected-head <SHA>` for
  offline evidence. The project's quality-gate document owns suite contracts,
  cadence, and pass criteria.
- Simulators and physical devices are shared resources: run one native suite per
  destination at a time, and never commit to a worktree while a suite runs in it
  — the runner fingerprints the source and the run is wasted.
- Gates fail closed: missing console or constraint-capture evidence, missing
  screenshots, or a destination mismatch means unverified, never green. Do not
  weaken assertions, selectors, or exceptions to obtain a pass.
