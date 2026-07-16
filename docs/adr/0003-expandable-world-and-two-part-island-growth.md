# ADR 0003: Expandable world and two-part island growth

Status: accepted

Date: 2026-07-16

## Context

V1 begins with much smaller islands and may add more islands over time. A fixed four-island screen cannot express long-term expansion. Island progress also needs more visual range than adding isolated nodes alone.

## Decision

Use a bounded map that supports movement in both directions and expands its outer perimeter as more space is needed. Start islands small. Grow them through both increased land area and richer contents such as trees, hills, paths, and buildings.

## Reason

This makes the map feel like a growing world and lets progress remain visible after an island already contains many nodes.

## Consequences

The map renderer must separate world coordinates from screen coordinates, support camera movement, recalculate layouts and territories, and represent island growth as visual stages driven by domain data.
