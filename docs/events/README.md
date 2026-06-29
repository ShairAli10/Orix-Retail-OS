# Event Model

This directory defines business events for Orix Retail OS.

Events are durable business facts. They are not API contracts, database schema, queue messages, or
UI events. Future implementation may persist, publish, replay, or sync these events, but the
business meaning should remain stable.

## Documents

- [Business Events](./business-events.md)

## Naming Rules

- Event names use PascalCase.
- Event names describe something that already happened.
- Events should be meaningful to business stakeholders.
- Events should identify the producing workflow and likely consumers.

## Event Usage

Events support:

- Application service boundaries
- Audit requirements
- Dashboard updates
- Report derivation
- Future cloud sync
- Future mobile app integration
- Support diagnostics
