# WebRTC Chat - P2P Messaging Application

A peer-to-peer chat application built with React and WebRTC, enabling direct browser-to-browser communication without a central server.

## Features

- 🔒 **Peer-to-Peer**: Direct browser-to-browser communication
- 💬 **Real-time Messaging**: Instant text messaging with formatting support
- 📁 **File Sharing**: Send images and files directly to peers
- 🎨 **Modern UI**: Clean, responsive interface with dark mode support
- 🔐 **Privacy-Focused**: No server storage, messages stay between peers
- 🌐 **No Server Required**: Works entirely in the browser using WebRTC

## Live Demo

Once deployed, the app will be available at: `https://deckyfx.github.io/webrtc-chat/`

## Getting Started

### Development

1. Install dependencies:
\`\`\`bash
bun install
\`\`\`

2. Run the development server:
\`\`\`bash
bun dev
\`\`\`

3. Open http://localhost:10001 in your browser

### Production Build

Build for production:
\`\`\`bash
bun run build
\`\`\`

Preview production build locally:
\`\`\`bash
bun run preview
\`\`\`

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

1. Push your code to GitHub
2. Go to Settings → Pages in your repository
3. Set Source to "GitHub Actions"
4. Push to main branch - the app will automatically deploy

### Manual Deployment

1. Build for GitHub Pages:
\`\`\`bash
bun run build:gh-pages
\`\`\`

2. The GitHub Actions workflow will automatically deploy when you push to main

## How to Use

### Creating a Connection

1. **Host** (Person A):
   - Create or join a room
   - Type \`/invite\` to generate an invitation code
   - Share the invitation code with Person B

2. **Guest** (Person B):
   - Create or join the same room
   - Type \`/join <invitation_code>\` with the code from Person A
   - Share the answer code back with Person A

3. **Host** (Person A):
   - Type \`/accept <answer_code>\` with the code from Person B
   - Connection established!

### Available Commands

- \`/invite\` - Generate invitation code
- \`/join <code>\` - Join with invitation code
- \`/accept <code>\` - Accept connection with answer code
- \`/format\` - Show text formatting guide
- \`/help\` - Show all available commands

### Text Formatting

- \`_text_\` - Underline
- \`___text___\` - Italic
- \`*text*\` - Bold
- \`-text-\` - Strikethrough
- \`\`\`text\`\`\` - Inline code
- \`\`\`\`\`\`code\`\`\`\`\`\` - Code block

## Technology Stack

- **React** - UI framework
- **WebRTC** - Peer-to-peer communication
- **Bun** - JavaScript runtime and bundler
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- HTTPS connection required for camera/microphone access (provided by GitHub Pages)

## Privacy & Security

- All communication is peer-to-peer
- No messages or files are stored on any server
- Connection codes are one-time use
- Data is encrypted during transmission via WebRTC

## Future Features

- 📹 Video calling
- 🎤 Voice calls
- 🖥️ Screen sharing
- 👥 Group chat support

## License

MIT
# Trigger GitHub Pages deployment
