# Redactum Web

Web version of Redactum - AI-powered text refinement tool built with Flask and modern web technologies.

## Features

- **10 Tone Options**: Formal, Professional, Neutral, Straightforward, Friendly, Casual, Persuasive, Authoritative, Empathetic, Inspirational
- **9 AI Providers**: OpenAI, Groq, NVIDIA NIM, xAI/Grok, Anthropic, Together AI, OpenRouter, Ollama, Custom
- **16 Quality Control Rules**: Avoid AI writing red flags automatically
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Real-time Refinement**: AI-powered text improvement with comparison view
- **Easy Configuration**: Simple settings management for API keys

## Installation

1. Navigate to the web app directory:
```bash
cd redactum-web
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python app.py
```

5. Open your browser and go to: `http://localhost:5000`

## Configuration

1. Click the **Settings** button in the top right
2. Select your AI provider (e.g., Groq, OpenAI)
3. Enter your API key
4. Optionally specify a custom model
5. Click **Save Settings**

## Usage

1. **Enter Text**: Type or paste your text in the input box
2. **Select Tone**: Click on one of the 10 tone options
3. **Refine**: Click the "Refine Text" button or press Ctrl+Enter
4. **View Results**: See your refined text with the original below for comparison
5. **Copy**: Click "Copy" to copy the refined text to your clipboard
6. **New**: Click "New" to start with fresh text

## Quality Control Rules

The AI follows 16 strict rules to avoid AI writing red flags:

- Banned words: delve, elevate, innovative, cutting-edge, transformative, leverage, robust, seamless
- Max 1 em dash per 500 words
- Vary sentence and list lengths
- No generic templates or filler phrases
- Concrete, specific language
- Natural cognitive flow

## File Structure

```
redactum-web/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── settings.json         # User settings (created on first run)
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Custom styles
    └── js/
        └── app.js        # Frontend JavaScript
```

## API Endpoints

- `GET /` - Main application page
- `GET /api/tones` - Get available tones
- `GET /api/providers` - Get available AI providers
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings
- `POST /api/refine` - Refine text with AI

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML5, Tailwind CSS (via CDN), Vanilla JavaScript
- **AI Integration**: OpenAI, Groq, Anthropic APIs
- **Styling**: Tailwind CSS with custom dark theme

## License

Same as the main Redactum project.
