---
applyTo: "apps/mobile/**"
description: "Environment-specific standards for the Expo mobile app. Inherits the global engineering standards and adds Expo-specific constraints."
---

# Expo App Instructions

These instructions apply to the Expo mobile application and extend the global workspace standards.

## Environment-Specific Constraints
- Follow Expo and React Native best practices for the current supported SDK and runtime.
- Keep app code focused on the mobile experience and avoid introducing unnecessary framework or build-system complexity.
- Do not add custom Metro, Babel, or monorepo workaround files unless explicitly requested and justified.
- Prefer the current Expo-supported patterns for app entrypoints, configuration, and typing.
- Keep changes scoped to the Expo app unless a shared package change is required by the task.

## Inheritance Rule
- Inherit the global requirements for planning, ambiguity handling, dependency selection, and deprecation avoidance.
- If a task is ambiguous, stop and ask clarifying questions before implementing anything.
