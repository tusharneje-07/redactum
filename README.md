# Redactum

AI-powered writing enhancement tool for the terminal. Transform your text with intelligent grammar correction, tone adjustment, and structural improvements.

## Features

- **10 Tonal Variations**: Formal, Professional, Neutral, Straightforward, Friendly, Casual, Persuasive, Authoritative, Empathetic, Inspirational
- **AI-Powered Refinement**: Uses advanced AI models to enhance your writing while eliminating AI-generated red flags
- **10 Beautiful Themes**: opencode, Dracula, Nord, Tokyo Night, Gruvbox, Catppuccin, Monokai, GitHub Dark, Solarized Dark, One Dark
- **Smart Quality Control**: Built-in rules to avoid common AI writing patterns and buzzwords
- **Seamless Workflow**: Type, select tone, refine, and copy with simple keyboard shortcuts

## Installation

```bash
# Navigate to the project directory
cd redactum

# Install dependencies
bun install --legacy-peer-deps

# Build the application
bun run build

# Run locally
bun start

# Or link globally
bun link
redactum
```

## Configuration

On first run, you'll need to configure an AI provider:

1. Type `/settings` to open settings
2. Select "Configure Provider API Key"
3. Choose "openai"
4. Enter your OpenAI API key (starts with `sk-...`)

Optional: Set a custom model (defaults to `gpt-4o`)

## Usage

### Basic Flow

1. **Enter Text**: Type or paste your text in the input box
2. **Press Enter**: Submit your text
3. **Select Tone**: Navigate with ↑↓ and press Enter to choose a tone
4. **Wait**: AI refines your text (takes a few seconds)
5. **Get Results**: View your refined text

### Keyboard Shortcuts

**Global Commands:**
- `/settings` - Open settings to configure API keys
- `/theme` - Open theme selector
- `Ctrl+C` - Exit application

**Input Mode:**
- `Enter` - Submit text and continue to tone selection
- Type normally to enter text

**Tone Selection:**
- `↑/↓` - Navigate tones
- `Enter` - Confirm selection
- `Esc` - Go back to input

**Output View:**
- `C` - Copy refined text to clipboard
- `R` - Retry/refine again
- `N` - Start new input
- `Esc` - Exit

## AI Quality Control Rules

Redactum implements strict quality controls to avoid AI writing red flags:

### Banned Buzzwords
- Delve, Elevate, Innovative, Cutting-edge
- Practical solutions, Transformative, Leverage, Robust, Seamless

### Structural Rules
- Max 1 em dash per 500 words
- Vary list lengths (2-5 items)
- No emoji formatting
- No generic templates

### Sentence Construction
- Max 1 "Not just X, but Y" per document
- No: "To clarify", "In summary", "In other words"
- Each sentence must add value

### Authenticity
- No exaggerated praise
- Add concrete specifics (numbers, timeframes)
- Natural cognitive flow
- Vary sentence length

## Themes

Available themes (use `/theme` to switch):

1. **opencode** (default) - OpenCode-inspired dark
2. **dracula** - Classic Dracula colors
3. **nord** - Arctic north-bluish
4. **tokyo-night** - Tokyo Night palette
5. **gruvbox** - Retro groove
6. **catppuccin** - Soothing pastel
7. **monokai** - Classic Monokai
8. **github-dark** - GitHub dark mode
9. **solarized-dark** - Precision colors
10. **one-dark** - Atom One Dark

## Project Structure

```
redactum/
├── src/
│   ├── components/        # UI Components
│   │   ├── App.tsx       # Main app with state machine
│   │   ├── InputView.tsx # Text input view
│   │   ├── ToneSelector.tsx # Tone selection UI
│   │   ├── OutputView.tsx # Results display
│   │   ├── GeneratingView.tsx # Loading state
│   │   ├── SettingsView.tsx # Settings configuration
│   │   ├── ThemeSelector.tsx # Theme picker
│   │   ├── TextInputWithBg.tsx # Custom input
│   │   ├── Header.tsx    # App header
│   │   └── Footer.tsx    # Status bar
│   ├── ai/               # AI Provider
│   │   ├── index.ts      # Provider factory
│   │   ├── types.ts      # Type definitions
│   │   └── openai.ts     # OpenAI implementation
│   ├── utils/            # Utilities
│   │   ├── settings.ts   # Settings management
│   │   ├── themes.ts     # Theme definitions
│   │   ├── tones.ts      # Tone definitions
│   │   └── clipboard.ts  # Clipboard operations
│   └── config/
│       └── prompts.ts    # AI prompt templates
├── dist/                 # Compiled output
├── package.json
└── tsconfig.json
```

## Development

```bash
# Development mode (auto-rebuild on changes)
bun run dev

# Build once
bun run build

# Run built version
bun start
```

## Credits

Built with [Ink](https://github.com/vadimdemedes/ink) - React for CLI
UI patterns adapted from Nexus project