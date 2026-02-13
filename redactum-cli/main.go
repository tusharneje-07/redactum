package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/term"
)

type ProviderConfig struct {
	Name    string `json:"name"`
	APIKey  string `json:"api_key"`
	Model   string `json:"model"`
	BaseURL string `json:"base_url,omitempty"`
}

type Config struct {
	ActiveProvider string                    `json:"active_provider"`
	Providers      map[string]ProviderConfig `json:"providers"`
}

func configPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	path := filepath.Join(dir, "redactum", "config.json")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	return path, nil
}

func loadConfig() (Config, error) {
	path, err := configPath()
	if err != nil {
		return Config{}, err
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return Config{ActiveProvider: "groq", Providers: map[string]ProviderConfig{}}, nil
	}
	b, err := ioutil.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	var c Config
	if err := json.Unmarshal(b, &c); err != nil {
		return Config{}, err
	}
	return c, nil
}

func saveConfig(c Config) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(path, b, 0o600)
}

func prompt(prompt string) (string, error) {
	fmt.Print(prompt)
	r := bufio.NewReader(os.Stdin)
	s, err := r.ReadString('\n')
	if err != nil && err != io.EOF {
		return "", err
	}
	return strings.TrimSpace(s), nil
}

func promptPassword(promptText string) (string, error) {
	fmt.Print(promptText)
	b, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Println()
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func cmdAuth() error {
	name, err := prompt("Provider name (e.g. openai, groq, custom): ")
	if err != nil {
		return err
	}

	// defaults for known providers
	defaultModel, defaultBase := presetDefaults(strings.ToLower(name))

	apiKey, err := promptPassword("API key (input hidden): ")
	if err != nil {
		return err
	}

	// Model prompt with default suggestion
	modelPrompt := "Model (optional): "
	if defaultModel != "" {
		modelPrompt = fmt.Sprintf("Model (optional) [%s]: ", defaultModel)
	}
	model, err := prompt(modelPrompt)
	if err != nil {
		return err
	}

	// Base URL prompt with default suggestion
	basePrompt := "Base URL (optional, e.g. https://api.openai.com/v1/chat/completions): "
	if defaultBase != "" {
		basePrompt = fmt.Sprintf("Base URL (optional) [%s]: ", defaultBase)
	}
	baseUrl, err := prompt(basePrompt)
	if err != nil {
		return err
	}

	// Use defaults if left empty
	if model == "" && defaultModel != "" {
		model = defaultModel
	}
	if (baseUrl == "" || strings.TrimSpace(baseUrl) == "") && defaultBase != "" {
		baseUrl = defaultBase
	}

	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	if cfg.Providers == nil {
		cfg.Providers = map[string]ProviderConfig{}
	}
	cfg.Providers[name] = ProviderConfig{Name: name, APIKey: apiKey, Model: model, BaseURL: baseUrl}
	cfg.ActiveProvider = name
	if err := saveConfig(cfg); err != nil {
		return err
	}
	fmt.Println("Saved provider and set as active.")
	return nil
}

// presetDefaults returns sensible defaults for common providers
func presetDefaults(name string) (string, string) {
	switch name {
	case "openai":
		return "gpt-4o", "https://api.openai.com/v1/chat/completions"
	case "groq":
		return "llama-3.3-70b-versatile", "https://api.groq.com/openai/v1/chat/completions"
	case "anthropic":
		return "claude-3-opus-20240229", "https://api.anthropic.com/v1/complete"
	case "openrouter":
		return "openai/gpt-4o", "https://api.openrouter.ai/v1/chat/completions"
	case "ollama":
		return "llama3.1", "http://127.0.0.1:11434/v1/complete"
	default:
		return "", ""
	}
}

// normalizeBaseURL attempts to convert user-provided base URLs into a chat completions endpoint
func normalizeBaseURL(raw string) string {
	if raw == "" {
		return raw
	}
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	path := u.Path
	// leave /openai/ in place (some providers like Groq use /openai/v1)
	if strings.Contains(path, "chat/completions") {
		// already fine
	} else {
		if strings.Contains(path, "/v1") {
			path = strings.TrimRight(path, "/")
			if strings.HasSuffix(path, "/v1") {
				path = path + "/chat/completions"
			} else {
				path = path + "/chat/completions"
			}
		} else {
			path = strings.TrimRight(path, "/") + "/v1/chat/completions"
		}
	}
	u.Path = path
	return u.String()
}

func cmdSetProvider() error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	if len(cfg.Providers) == 0 {
		fmt.Println("No providers configured. Run with --auth first.")
		return nil
	}
	i := 0
	keys := make([]string, 0, len(cfg.Providers))
	fmt.Println("Configured providers:")
	for k := range cfg.Providers {
		i++
		fmt.Printf("%d) %s\n", i, k)
		keys = append(keys, k)
	}
	selStr, err := prompt("Choose provider number: ")
	if err != nil {
		return err
	}
	sel := 0
	fmt.Sscanf(selStr, "%d", &sel)
	if sel <= 0 || sel > len(keys) {
		return errors.New("invalid selection")
	}
	cfg.ActiveProvider = keys[sel-1]
	if err := saveConfig(cfg); err != nil {
		return err
	}
	fmt.Printf("Set active provider to %s\n", cfg.ActiveProvider)
	return nil
}

func createPrompt(tone, text string) string {
	var toneInstruction string
	switch tone {
	case "formal":
		toneInstruction = "Rewrite this text in a formal tone. Use precise language, maintain objectivity, and follow standard conventions for academic, legal, or official contexts. Avoid contractions and colloquialisms."
	case "professional":
		toneInstruction = "Rewrite this text in a professional tone suitable for business communication. Be courteous, clear, and maintain appropriate workplace etiquette without being overly stiff."
	case "neutral":
		toneInstruction = "Rewrite this text in a neutral tone. Present facts objectively without emotional language or bias. Focus on clarity and informational value."
	case "straightforward":
		toneInstruction = "Rewrite this text in a straightforward tone. Be direct and concise. Remove unnecessary words and get straight to the point with clear action items."
	case "friendly":
		toneInstruction = "Rewrite this text in a friendly tone. Be warm and approachable while remaining respectful. Connect with the reader personally without being overly casual."
	case "casual":
		toneInstruction = "Rewrite this text in a casual tone. Use conversational language, contractions, and a relaxed style suitable for informal contexts like blogs or team chats."
	case "persuasive":
		toneInstruction = "Rewrite this text in a persuasive tone. Present compelling arguments, highlight benefits, and guide the reader toward a specific conclusion or action."
	case "authoritative":
		toneInstruction = "Rewrite this text in an authoritative tone. Project confidence and expertise. Be decisive and command respect through knowledgeable, well-reasoned statements."
	case "empathetic":
		toneInstruction = "Rewrite this text in an empathetic tone. Show understanding and emotional awareness. Be supportive and considerate of the reader's feelings and perspective."
	case "inspirational":
		toneInstruction = "Rewrite this text in an inspirational tone. Motivate and uplift the reader. Use encouraging language that inspires action and conveys a sense of purpose."
	default:
		toneInstruction = "Rewrite this text in a professional tone."
	}

	qualityRules := `CRITICAL RULES - Apply ALL of these:

PUNCTUATION & STRUCTURE:
- Max 1 em dash per 500 words
- Vary list lengths (2-5 items), avoid triadic patterns
- No emoji formatting
- Avoid generic templates

SENTENCE CONSTRUCTION:
- Max 1 "Not just X, but Y" per document
- Ban: "To clarify", "In summary", "In other words"
- Each sentence must add value

VOCABULARY - BANNED WORDS:
Delve, Elevate, Innovative, Cutting-edge, Practical solutions, Transformative, Leverage, Robust, Seamless

Use concrete, domain-specific language. Vary sentence length.

AUTHENTICITY:
- No exaggerated praise without specific actions
- Replace generic claims with concrete details
- Allow natural cognitive movement

QUALITY:
- Simulate multi-step writing (outline → draft → edit)
- Use conditional phrasing for unverifiable claims
- Post-process for concision`

	return fmt.Sprintf("You are a professional editor and writing coach.\n\nTONE REQUIREMENT:\n%s\n\nQUALITY CONTROL RULES:\n%s\n\nORIGINAL TEXT:\n%s\n\nREFINED TEXT:", toneInstruction, qualityRules, text)
}

func callProvider(cfg Config, promptStr string) (string, error) {
	p, ok := cfg.Providers[cfg.ActiveProvider]
	if !ok {
		return "", errors.New("active provider not configured")
	}
	if p.APIKey == "" {
		return "", errors.New("api key for provider is empty")
	}
	if p.BaseURL == "" {
		return "", errors.New("provider base_url not configured; set it with --auth or edit config")
	}
	base := normalizeBaseURL(p.BaseURL)

	// Build JSON body safely (escape content)
	reqBody := map[string]interface{}{
		"model":       p.Model,
		"messages":    []map[string]string{{"role": "user", "content": promptStr}},
		"temperature": 0.4,
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// Prepare candidate endpoints to try (normalized first, then provided, then provider-specific fallbacks)
	candidates := []string{}
	if base != "" {
		candidates = append(candidates, base)
	}
	if p.BaseURL != "" && p.BaseURL != base {
		candidates = append(candidates, p.BaseURL)
	}
	low := strings.ToLower(p.BaseURL)
	if strings.Contains(low, "groq") {
		// try common groq endpoints
		candidates = append(candidates, "https://api.groq.com/openai/v1/chat/completions", "https://api.groq.com/v1/chat/completions")
	}
	if strings.Contains(low, "openrouter") {
		candidates = append(candidates, "https://api.openrouter.ai/v1/chat/completions")
	}

	var lastErr error
	client := &http.Client{}
	for _, endpoint := range candidates {
		if endpoint == "" {
			continue
		}
		// ensure endpoint is a full URL
		if !strings.HasPrefix(endpoint, "http") {
			endpoint = "https://" + endpoint
		}
		req, err := http.NewRequest("POST", endpoint, bytes.NewReader(bodyBytes))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Authorization", "Bearer "+p.APIKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		b, _ := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			// remember error and try next candidate
			lastErr = fmt.Errorf("api error %d: %s", resp.StatusCode, string(b))
			// if server clearly indicates unknown URL, try next candidate
			continue
		}
		// success
		// try to parse JSON response
		var v map[string]interface{}
		if err := json.Unmarshal(b, &v); err == nil {
			if choices, ok := v["choices"]; ok {
				if arr, ok := choices.([]interface{}); ok && len(arr) > 0 {
					if first, ok := arr[0].(map[string]interface{}); ok {
						if msg, ok := first["message"].(map[string]interface{}); ok {
							if content, ok := msg["content"].(string); ok {
								return content, nil
							}
						}
						if text, ok := first["text"].(string); ok {
							return text, nil
						}
					}
				}
			}
			if output, ok := v["output"]; ok {
				switch out := output.(type) {
				case string:
					return out, nil
				case []interface{}:
					if len(out) > 0 {
						if first, ok := out[0].(map[string]interface{}); ok {
							if content, ok := first["content"].(string); ok {
								return content, nil
							}
						}
					}
				}
			}
		}
		// fallback: return raw body
		return string(b), nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no endpoints available to try")
	}
	return "", lastErr
}

func cmdRefine(tone, text string) error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	promptStr := createPrompt(tone, text)
	fmt.Printf("Sending prompt to %s...\n", cfg.ActiveProvider)
	out, err := callProvider(cfg, promptStr)
	if err != nil {
		return err
	}
	fmt.Printf("\n---- REFINED ----\n%s\n", out)
	return nil
}

func printHelp() {
	fmt.Println("redactum - simple CLI for text refinement\n")
	fmt.Println("USAGE:")
	fmt.Println("  redactum --auth                Configure provider")
	fmt.Println("  redactum --set-provider        Choose active provider")
	fmt.Println("  redactum -t --tone <tone> \"text\"     Refine text with tone")
	fmt.Println("TONES: formal, professional, neutral, straightforward, friendly, casual, persuasive, authoritative, empathetic, inspirational")
}

func main() {
	auth := flag.Bool("auth", false, "Configure provider")
	setp := flag.Bool("set-provider", false, "Set active provider")
	refine := flag.Bool("t", false, "Refine mode")
	tone := flag.String("tone", "professional", "Tone to apply")
	flag.Parse()

	if *auth {
		if err := cmdAuth(); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}
	if *setp {
		if err := cmdSetProvider(); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}
	if *refine {
		args := flag.Args()
		if len(args) == 0 {
			fmt.Fprintln(os.Stderr, "no text provided")
			os.Exit(1)
		}
		text := strings.Join(args, " ")
		if err := cmdRefine(*tone, text); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}
	printHelp()
}
