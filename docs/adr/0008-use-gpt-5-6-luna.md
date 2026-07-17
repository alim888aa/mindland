# ADR 0008: Use GPT-5.6 Luna

Status: proposed

Date: 2026-07-17

## Context

Mindland needs responsive multi-turn interviews and reliable structured decisions about islands, activities, questionnaire answers, and visual details.

## Proposed decision

Use `gpt-5.6-luna` through the Responses API. Start with low reasoning for conversational turns and medium reasoning when finalizing structured islands or daily records. Validate the split on representative conversations before accepting this ADR.

## Reason

OpenAI describes GPT-5.6 Luna as the efficient option for high-volume workloads. Low reasoning should favor chat responsiveness, while medium reasoning may improve the harder classification and summarization steps.

## Consequences

The implementation needs separate request settings for conversation and finalization, structured-output validation, latency and quality measurements, and a fallback when model output fails validation.

## Source

[OpenAI: Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model.md)
