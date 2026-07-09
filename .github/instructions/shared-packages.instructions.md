---
applyTo: "packages/**"
description: "Environment-specific standards for internal shared packages. Inherits the global engineering standards and adds package-level constraints."
---

# Shared Packages Instructions

These instructions apply to the internal shared packages under packages/ and extend the global workspace standards.

## Environment-Specific Constraints
- Keep shared packages focused, generic, and reusable.
- Expose TypeScript source directly from the package entrypoints as required by the workspace conventions.
- Preserve the package boundary and avoid app-specific logic inside shared packages.
- Keep dependencies minimal and intentional, and prefer workspace-local links for internal relationships.
- Maintain clear, stable public exports and avoid introducing unnecessary runtime dependencies.

## Inheritance Rule
- Inherit the global requirements for planning, ambiguity handling, dependency selection, and deprecation avoidance.
- If a task is ambiguous, stop and ask clarifying questions before implementing anything.
