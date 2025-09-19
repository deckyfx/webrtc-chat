# Project: WebRTC Chat

## Project Overview

This is a serverless, peer-to-peer (P2P) chat application built with WebRTC, React, and TypeScript. It uses Bun as the runtime and toolkit. The application allows users to create or join chat rooms and communicate directly with other peers without a central server for message relay.

**Key Technologies:**

*   **Frontend:** React, TypeScript
*   **Runtime/Bundler:** Bun
*   **Styling:** Tailwind CSS, shadcn-ui
*   **P2P Communication:** WebRTC
*   **Signaling:** Serverless (manual exchange of connection strings)
*   **Storage:** `localStorage` for user profiles and chat history

**Architecture:**

The application is a single-page application (SPA). The signaling for WebRTC is "serverless," meaning users must manually exchange base64-encoded offer/answer strings to establish a connection. Once connected, messages are sent directly between peers. The application state is managed within React components, and data like user identity and message history is persisted in the browser's `localStorage`.

## Building and Running

The project uses `bun` for all package management and scripting.

*   **Install Dependencies:**
    ```bash
    bun install
    ```

*   **Run in Development Mode:**
    Starts a development server with hot reloading.
    ```bash
    bun dev
    ```

*   **Run in Production Mode:**
    Starts the application in production mode.
    ```bash
    bun start
    ```

*   **Build for Production:**
    Bundles the application for deployment. The output is placed in the `dist/` directory.
    ```bash
    bun run build.ts
    ```

## Development Conventions

*   **Language:** The project is written in TypeScript.
*   **Component Model:** It uses modern React with functional components and hooks.
*   **Directory Structure:**
    *   `src/components`: Contains React components, with UI-specific components in `src/components/ui`.
    *   `src/services`: Holds the core logic for WebRTC (`webrtc.ts`), signaling (`serverless-signaling.ts`), and local storage (`storage.ts`).
    *   `src/lib`: Contains utility functions.
*   **Styling:** The project uses Tailwind CSS for utility-first styling, with pre-built components from `shadcn-ui`.
*   **Entry Point:** The application is served via `src/index.tsx`, which sets up a simple Bun server to serve the static `index.html` and assets.
