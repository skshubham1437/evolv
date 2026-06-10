# ADR-0010: AI Resilience and Security Patterns

**Date**: 2026-06-11  
**Status**: Accepted  
**Deciders**: Engineering

---

## Context

The initial integration with Gemini AI API had multiple resilience and security vulnerabilities:
1. **Infinite timeouts**: API calls relied on the request context, which could hang indefinitely if the API server was unresponsive.
2. **Cascading failures**: Sustainable external API outages could saturate server threads with hanging HTTP requests.
3. **No abuse protection**: Users could make unlimited AI calls, leading to high API billings and potential denial-of-service.
4. **Prompt injection**: Raw user inputs (e.g. goal descriptions, journal entries) were embedded directly into instructions, allowing malicious users to bypass system prompts or break JSON outputs.

The premortem (June 2026) classified these combined gaps as a high risk to availability and cost.

## Decision

Implement a comprehensive AI Resilience and Security layer in the server.

### Technical Implementation

1. **Thread-safe Circuit Breaker (`services/circuit_breaker.go`)**:
   - Implements three states: Closed, Open, and Half-Open.
   - Trips to `Open` after 5 consecutive failures.
   - Cooldown period of 30 seconds before transitioning to `Half-Open` to probe recovery.
   - Rejects requests immediately with `ErrCircuitOpen` (503 Service Unavailable) when open.

2. **Per-User Rate Limiter (`services/ai_limiter.go`)**:
   - Implements a token-bucket algorithm per authenticated user.
   - Limits users to a maximum burst of 20 tokens, replenishing at 20 tokens per hour (~1 every 3 minutes).
   - Runs a background cleanup goroutine every 10 minutes to evict stale buckets (idle > 2 hours).

3. **15-Second Timeouts**:
   - All external Gemini content generation calls are wrapped in a 15-second timeout sub-context.

4. **Prompt Sanitization**:
   - Truncates user-controlled string inputs (e.g. 100 characters for names, 500 for descriptions, 1000/2000 for journal/chat).
   - Filters out non-printable/control characters.
   - Defangs prompt override strings (e.g., `ignore previous instructions`, `system override`) using regular expressions.

5. **Structured Fallback Responses**:
   - Every service function returns standard structured static fallbacks when Gemini is down, ensuring partial app usability (e.g., pre-written subtasks, default sentiment/themes).

6. **Error Propagation**:
   - Rate limit (429) and circuit breaker open (503) errors are propagated through `handleAIError` in `handlers/ai.go` (and burnout handler) to notify clients with precise HTTP codes.

## Consequences

- **Positive**: Complete defense against prompt injection, denial-of-service, and heavy API bills.
- **Positive**: Fails fast during API outages without hanging HTTP connections or locking up server resources.
- **Positive**: Graceful UI degradation via high-quality fallback plans, morning briefs, and reviews.
- **Negative**: Users are rate-limited to 20 calls/hour (though this is extremely generous for standard productivity workloads).
- **Negative**: Development overhead to sanitize inputs and define fallbacks for new AI-enabled features.
