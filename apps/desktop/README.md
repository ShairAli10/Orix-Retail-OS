# Desktop App

Electron host application for Orix Retail OS.

Planned responsibilities:

- Windows desktop packaging entry point
- Renderer shell using React and Vite
- Electron main process, preload bridge, and IPC registration
- Composition root for application services

Business rules must not live in this package. React components communicate with application
services through typed IPC contracts only.
