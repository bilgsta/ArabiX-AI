## Packages
react-markdown | Rendering Markdown in chat messages
remark-gfm | GitHub Flavored Markdown support for tables and lists
framer-motion | Smooth animations for messages and UI transitions
react-syntax-highlighter | Code syntax highlighting in chat
date-fns | Date formatting for timestamps
clsx | Utility for conditional classes (standard with tailwind-merge)
tailwind-merge | Utility for merging tailwind classes

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["'IBM Plex Sans Arabic'", "sans-serif"],
  display: ["'IBM Plex Sans Arabic'", "sans-serif"],
  mono: ["'Fira Code'", "monospace"],
}

Integration:
- RTL Layout Direction is mandatory (dir="rtl" on root)
- SSE Streaming expected for chat responses
- Replit Auth is handled via /api/login and /api/logout
