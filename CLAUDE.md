# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: WebRTC Serverless Chat System

A peer-to-peer chat application using WebRTC for serverless communication, built with Bun, React, TypeScript, Tailwind CSS v4, and shadcn/ui components.

## Common Development Commands

```bash
# Install dependencies
bun install

# Start development server with hot reload
bun dev
# or
bun --hot src/index.tsx

# Build for production
bun run build

# Start production server
bun start
```

## Architecture Overview

### Server Architecture
- **Entry Point**: `src/index.tsx` - Bun server using HTML imports
- **Routing**: Uses `Bun.serve()` with route configuration supporting WebSocket connections
- **WebSocket Support**: Native WebSocket support for WebRTC signaling when needed

### Frontend Architecture
- **Entry**: `src/index.html` → `src/frontend.tsx` → `src/App.tsx`
- **Styling**: Tailwind CSS v4 with custom theme configuration in `styles/globals.css`
- **Components**: shadcn/ui components in `src/components/ui/`
- **Hot Module Replacement**: Configured for development with state persistence

### Build System
- **Builder**: Custom Bun build script (`build.ts`) with Tailwind plugin
- **CSS**: Tailwind v4 with `@import` and `@theme` directives
- **TypeScript**: Strict mode with path aliases (`@/*` → `./src/*`)

## WebRTC Implementation Guidelines

For the serverless WebRTC chat system:

1. **Signaling**: Implement a minimal signaling mechanism (can use WebSocket initially for peer discovery, then disconnect after P2P connection established)
2. **STUN/TURN**: Use public STUN servers for NAT traversal
3. **Data Channels**: Use RTCDataChannel for text messages (no media streams needed for chat)
4. **Connection Management**: Handle peer connection lifecycle, reconnections, and cleanup

## Bun-Specific Patterns

Default to using Bun instead of Node.js:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Bun automatically loads .env files

### Key Bun APIs
- `Bun.serve()` for server with WebSocket support
- `WebSocket` is built-in (no `ws` package needed)
- Prefer `Bun.file` over `node:fs` operations
- Use HTML imports for frontend bundling (no Vite/Webpack needed)

### Frontend with HTML Imports

HTML files can import TypeScript/React directly:

```html
<script type="module" src="./frontend.tsx"></script>
```

CSS imports work directly in TypeScript:
```tsx
import './index.css';
```

## Testing

Use `bun test` to run tests:

```ts
import { test, expect } from "bun:test";

test("example test", () => {
  expect(1).toBe(1);
});
```

## TypeScript Configuration

- Target: ESNext with strict mode
- Module resolution: bundler mode
- JSX: react-jsx
- Path aliases: `@/*` maps to `./src/*`
- Allow `.ts`/`.tsx` extensions in imports

## Tailwind CSS v4 Setup

- Global styles: `styles/globals.css`
- Component styles: Direct Tailwind classes
- Theme variables: CSS custom properties
- Animation: `tailwindcss-animate` plugin
- Dark mode: CSS custom properties with `.dark` class

## Important Reminders

- WebRTC requires HTTPS in production (except localhost)
- STUN/TURN servers needed for NAT traversal
- Consider connection limits for mesh topology
- Implement proper error handling for network failures
- Use TypeScript strict typing (avoid `any`)