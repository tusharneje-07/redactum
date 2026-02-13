# Redactum CLI

Lightweight single-file Go CLI to refine text using configured AI providers. It sends a chat-style prompt (with tone and quality rules) to a provider endpoint and prints the refined output.

Quick start
-----------

1. Build the binary:

```bash
cd redactum-cli
go build -o redactum-cli
```

2. Configure a provider (interactive):

```bash
./redactum-cli --auth
```

3. Choose the active provider (optional if `--auth` already set it):

```bash
./redactum-cli --set-provider
```

4. Refine text:

```bash
./redactum-cli -t --tone formal "Your text to refine"
# or short form
./redactum-cli -t --tone professional "Short message"
```

Install for global use
----------------------

- Build and move to a location on your PATH:

```bash
go build -o redactum-cli
sudo mv redactum-cli /usr/local/bin/
```

- Or use your Go bin directory (make sure `$GOBIN` or `$GOPATH/bin` is in PATH):

```bash
go build -o $GOBIN/redactum-cli
```

Configuration
-------------

Settings are saved to your OS config directory, for example:

- Linux: `~/.config/redactum/config.json`
- macOS: `~/Library/Application Support/redactum/config.json`
- Windows: `%APPDATA%/redactum/config.json`

Sample `config.json`:

```json
{
  "active_provider": "groq",
  "providers": {
    "groq": {
      "name": "groq",
      "api_key": "sk-...",
      "model": "llama-3.3-70b-versatile",
      "base_url": "https://api.groq.com/openai/v1/chat/completions"
    }
  }
}
```

Notes on providers
------------------

- The CLI accepts a `base_url` for the provider and will POST a chat-style JSON body. For best results provide the full completions endpoint (for example OpenAI: `https://api.openai.com/v1/chat/completions`).
- The CLI includes presets for common providers (OpenAI, Groq, Anthropic, OpenRouter, Ollama) and will suggest defaults during `--auth`.
- The CLI attempts to normalize and try multiple endpoint variants automatically (helps avoid 404 caused by slightly different vendor URL shapes).

Available tones
---------------

formal, professional, neutral, straightforward, friendly, casual, persuasive, authoritative, empathetic, inspirational

Where the code lives
--------------------

- Main implementation: `redactum-cli/main.go`

Troubleshooting
---------------

- If you get a 404 with an error like `Unknown request URL`, check the configured `base_url` and update it to the provider's chat completions path.
- Edit the config manually if needed (`~/.config/redactum/config.json`) and re-run.
- If the CLI cannot find the provider, ensure `active_provider` matches a configured provider name.

Next improvements you might want
------------------------------

1) Add non-interactive flags / env vars for CI usage (so you can pass API key via env)
2) Add provider-specific request shapes and authentication helpers (for Anthropic, Ollama, etc.)
3) Stream responses and display token usage where supported
