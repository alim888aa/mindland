# ADR 0004: Grow land first, then add contextual props

Status: accepted

Date: 2026-07-16

## Context

Daily activities need to produce visible progress without making land growth or rocks appear too quickly. The visuals should also reflect what the user actually did.

## Decision

Give each island one summarized positive node per calendar day. For the hackathon build, distinct supportive activities may add up to twelve lifetime positive points to the island on that day, while the node and history remain summarized and preserve their underlying activity details. Revisit this accelerated cap after the demo.

Start land at 30% of its territory footprint. Each of the first five lifetime positive points adds ten percentage points of land, reaching the 80% cap on point five. The sixth and every later positive point adds one context-fitting prop selected from the approved catalogue instead of increasing land further.

Give each island at most one negative point per calendar day containing harmful activity for that topic. Every five negative points creates one visible rock. Preserve the original activity entry, retain corrections in history, and allow accidental submissions to be undone for five minutes.

A single island may receive both one positive and one negative point on the same day. Additional check-ins update that day’s existing summaries. V1 records activity against the current user-local calendar day and does not allow backdating.

For sinking, one visible rock has the same weight as one lifetime positive point. Twenty positive points therefore require twenty rocks, produced from one hundred negative points, before the island sinks.

A submerged island resurfaces as soon as its lifetime positive-point count becomes greater than its visible rock count.

## Reason

Daily summaries prevent repetitive activity from flooding the map with nodes while the underlying history stays detailed. The temporary twelve-point cap lets judges see the full growth loop in one session, while later props keep progress legible after land reaches its cap. Negative scoring remains slow and capped daily. Preserving corrections protects the map from AI misunderstandings without hiding the history.

## Consequences

The domain model must aggregate repeated check-ins by island and user-local calendar day while keeping lifetime positive points, pending negative points, visible rocks, correction history, and undo timing separate. It must reject or redirect attempts to backdate activity.
