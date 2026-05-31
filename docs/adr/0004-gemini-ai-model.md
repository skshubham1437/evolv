# 4. Use Google Gemini 2.5 Flash as the AI Model

Date: 2026-05-15

## Status

Accepted

## Context

The AI features (chat, goal breakdown, morning briefs, journal analysis, burnout risk, weekly/monthly reviews) require a capable generative AI model. Options considered included OpenAI GPT-4, Anthropic Claude, and Google Gemini.

## Decision

We will use **Google Gemini 2.5 Flash** via the `github.com/google/generative-ai-go` SDK. The model is accessed directly from the Go backend using an API key, with structured JSON output via `ResponseMIMEType` and `ResponseSchema`.

## Consequences

- **Pros:** Native Go SDK with excellent structured output support. Fast inference for real-time features (morning briefs, burnout checks). Cost-effective for a personal productivity app. Strong JSON schema enforcement reduces parsing errors.
- **Cons:** Vendor lock-in to Google's AI platform. Model availability and pricing may change. No local/offline AI capability.
- **Mitigations:** The AI service layer (`services/ai.go`) abstracts the model — switching providers requires changes only in this file. AI features degrade gracefully when the API key is not set.
