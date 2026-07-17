# ADR 0008: Use GPT-5.6 Luna

Status: accepted

Date: 2026-07-17

## Context

Mindland needs responsive multi-turn interviews and reliable structured decisions about islands, activities, questionnaire answers, and visual details.

## Decision

Use `gpt-5.6-luna` through the Responses API with low reasoning as the default for every V1 request. Test it on representative conversations and raise reasoning only for request types that make incorrect judgments at low.

## Reason

OpenAI describes GPT-5.6 Luna as the efficient option for high-volume workloads. Beginning with low reasoning favors responsiveness and keeps the configuration simple while evidence is gathered.

## Consequences

The implementation needs one low-reasoning default, structured-output validation, latency and quality measurements, and a fallback when model output fails validation. Reasoning may later vary by request type when evaluations justify it.

## Source

[OpenAI: Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model.md)
