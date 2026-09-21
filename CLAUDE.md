<!-- ci-workflows:block:start -->
### Pipeline rules (simple branch model) — read before pushing

Language: node. Image: `ghcr.io/zaphold2k/duplexalmar`. This block is generated from the pipeline configuration; do not hand-edit it.

This repository's branch model is declared, not inferred. If it already declared one, use it without re-evaluating. If it doesn't yet declare one, choose based on observable characteristics of the repository and say why. If what you observe suggests a different model than the one declared, the declared model still wins — raise the discrepancy, don't change the declaration yourself.

**Before starting a task:**
- Branch from `main`.
- Name your branch matching `feature/*` (e.g. `feature/login-oauth`) — a name outside this pattern runs the checks and produces no version or image.
- Open the pull request against `main`.

**What a push produces:**
- Push to a `feature/*` branch → prerelease tag + image, plus a moving tag with the branch name.
- Accepted release-please PR on `main` → stable version.
- Any other branch → checks only, nothing published.

**Cutting a package, by request type:**
- "A build to test this" → push your work branch; its prerelease tag/image is the answer. Precondition: checks pass. Verify with the tag and image printed in the job summary.
- "Cut a stable release" → accept the pending release-please pull request. Precondition: it exists and its checks are green. Verify the new tag and image tags in the run summary.
- If the request doesn't say which of these it means, assume the prerelease of the current work branch, and ask before doing anything else if that assumption isn't safe (e.g. the request implies something user-facing).

**The quality gate is a limit, not an obstacle.** On a block:
- Coverage regression → add the missing tests. Do not lower `coverage_tolerance` or `coverage_floor`.
- Fewer passing tests → restore the missing coverage, or explain why the loss is deliberate and let a human decide on an override. Do not delete or skip a failing test to pass this check.
- New lint/type suppression → fix the underlying issue instead. Do not add the suppression to get through the gate.
- In every case: `ci-ratchet-override` is a label a human applies to the pull request. You may explain why an exception might be warranted; you may not apply it yourself.

**This block should let you answer, without asking:** which branch to start from and how to name it, which branch to open the pull request against, what a push to each branch role produces, how to cut each package type and how to verify it landed, and what specifically not to do when the quality gate blocks you.
<!-- ci-workflows:block:end -->
