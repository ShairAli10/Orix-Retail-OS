# Coding Standards

## TypeScript

- Use strict TypeScript.
- Do not use `any`.
- Prefer explicit domain types over primitive obsession.
- Prefer type-only imports where possible.
- Treat unchecked indexing and optional properties carefully.

## React

- Components are presentation and interaction boundaries.
- Do not put business rules in components.
- Use React Hook Form and Zod for form validation when forms are introduced.
- Keep data fetching and mutation orchestration outside reusable UI primitives.

## Services

- Application services own use cases.
- Services should be easy to test without rendering React.
- Services should express business failures as typed outcomes.

## Repositories

- Repositories load and persist data.
- Repositories do not enforce business policy.
- Repository methods should reflect persistence needs, not UI screens.

## Testing

- Use Vitest for unit and integration tests.
- Use Playwright for end-to-end desktop/renderer flows when the shell exists.
- Add tests at the layer where behavior belongs.

## Documentation

Architectural changes require docs updates. If package boundaries change, update both `docs/` and
`ai/`.
