# Architecture

## Introduction and Goals

### Requirements Overview

Quizzard of Oz is a multiplayer quiz platform that supports both relaxed and
competitive game sessions. The system needs to support session management,
question delivery, ranking, and a polished web experience for public and logged
in players.

### Quality Goals

- Keep gameplay responsive, especially in live ranked and unranked sessions.
- Make the architecture easy for the team to understand and extend.
- Support a clear separation between frontend, backend, and persistence.
- Preserve enough flexibility to evolve game modes and question sourcing.

### Stakeholders

| Role | Contact | Expectations |
| --- | --- | --- |
| Development Team | Project contributors | Shared architecture language, maintainable implementation |
| Players | End users | Reliable gameplay, clear UX, responsive sessions |
| Reviewers / Instructors | Course stakeholders | Understandable decisions, documented architecture, visible progress |

## Architecture Constraints

- The project is a web application with a separate frontend and backend.
- Ranked and unranked matches need synchronized gameplay behavior.
- Documentation is published through Sphinx on Read the Docs.
- The system uses an external trivia API, so caching and resilience matter.

## Context and Scope

### Business Context

The platform serves players who want either a casual quiz experience or a
competitive match with persistent ranking. Users interact with a web frontend,
which communicates with backend services responsible for authentication,
question sourcing, matchmaking, and score tracking.

### Technical Context

- Frontend: Next.js application for the website and game flows
- Backend: Python service layer for APIs, matchmaking, and business logic
- Database: Persistent storage for users, sessions, questions, and leaderboard
- External integration: Trivia provider for question retrieval

## Solution Strategy

- Use a modern web frontend for the player-facing experience.
- Build the backend around explicit API contracts and cached question access.
- Model sessions and participants directly in the database so gameplay state is
  inspectable and durable.
- Separate concept documentation from architecture decisions to keep this page
  focused on system structure.

## Building Block View

### Whitebox Overall System

**Core building blocks**

- Frontend application for navigation, game flows, and player-facing UI
- Backend application for auth, matchmaking, gameplay orchestration, and scoring
- Persistence layer for users, sessions, questions, and ranking data
- External trivia API used to populate and refresh the question cache

**Important interfaces**

- HTTP APIs between frontend and backend
- WebSocket-style real-time communication for synchronized matches
- Database access for gameplay and leaderboard state
- External API calls for new question data

## Runtime View

### Ranked and Unranked Session Flow

![Ranked and unranked session flow](images/ranked_session_flow.svg)

Both synchronized game modes share the same broad sequence:

1. Players enter a queue or session.
2. The backend creates or activates a session.
3. Questions are prepared from cached or newly fetched trivia data.
4. Players answer questions round by round.
5. The backend calculates scores and advances category selection.
6. Ranked mode additionally updates Elo after the match ends.

## Deployment View

### Infrastructure Level 1

- The frontend is deployed as a web application for players.
- The backend is deployed as an API service with access to persistent storage.
- Documentation is deployed separately through Read the Docs using Sphinx.

### Infrastructure Level 2

- Client browsers load the frontend and connect to backend APIs.
- Backend services persist state in the database and communicate with the
  external trivia provider when the cache needs replenishment.

## Cross-cutting Concepts

### Authentication

Authentication is handled with JWT-backed sessions and hashed passwords.

### Real-Time Communication

Ranked and unranked matches need near real-time event delivery so both players
see progress consistently.

### Question Caching

Question data is cached locally to reduce latency and avoid overusing the
external trivia API.

## Quality Requirements

### Quality Requirements Overview

- Responsive question delivery
- Stable synchronized sessions
- Maintainable separation of concerns
- Clear operational and architectural visibility

### Quality Scenarios

- A ranked match should progress without players waiting on repeated external
  question fetches during the session.
- New team members should be able to understand the main system components
  through this documentation alone.

## Risks and Technical Debts

- Real-time synchronization can become fragile if session state is not modeled
  clearly on the backend.
- External trivia API availability may impact gameplay without strong caching.
- Documentation still reflects an evolving product, so some sections remain
  directional rather than final.

## Glossary

| Term | Definition |
| --- | --- |
| Elo | Ranking value used to estimate player skill in ranked matches |
| Session | A single multiplayer match lifecycle |
| Question Cache | Local store of trivia questions fetched from the external provider |
