# 1. Use React (PWA) and Golang for the MVP

Date: 2026-05-10

## Status

Accepted

## Context

The initial product requirements suggested an offline-first architecture, which was pivoted to a cloud-first approach to validate the MVP quickly. While Node.js was initially considered for the backend, we have decided to use Golang for its performance, strong typing, and concurrency model.

## Decision

We will build the MVP using a **React single-page application (PWA)** for the frontend and a **Golang** backend. We will adopt a standard cloud-first approach (requiring an internet connection for real-time truth).

## Consequences

- **Pros:** High performance and low memory footprint on the backend. Strong static typing. Clean separation of frontend and backend.
- **Cons:** Requires internet access for the core experience in V1.
