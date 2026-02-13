from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

# Configuration
SETTINGS_FILE = 'settings.json'

# Default settings
DEFAULT_SETTINGS = {
    "activeProvider": "groq",
    "theme": "dark",
    "providers": {
        "openai": {"apiKey": "", "model": "gpt-4o"},
        "groq": {"apiKey": "", "model": "llama-3.3-70b-versatile"},
        "nvidia": {"apiKey": "", "model": "llama-3.1-70b-instruct"},
        "grok": {"apiKey": "", "model": "grok-beta"},
        "anthropic": {"apiKey": "", "model": "claude-3-opus-20240229"},
        "together": {"apiKey": "", "model": "llama-3.3-70b"},
        "openrouter": {"apiKey": "", "model": "openai/gpt-4o"},
        "ollama": {"apiKey": "", "model": "llama3.1"},
        "custom": {"apiKey": "", "model": "", "baseUrl": ""}
    }
}

# Tone definitions
TONES = [
    {"id": "formal", "name": "Formal", "description": "Structured, precise, impersonal", "instruction": "Refine this text to be formal and professional. Use precise language, avoid contractions, maintain a structured tone, and focus on clarity and correctness."},
    {"id": "professional", "name": "Professional", "description": "Polished, business-appropriate", "instruction": "Refine this text to be polished and business-appropriate. Use clear, direct language suitable for workplace communication."},
    {"id": "neutral", "name": "Neutral", "description": "Objective, factual", "instruction": "Refine this text to be neutral and objective. Present facts clearly without bias or emotional language."},
    {"id": "straightforward", "name": "Straightforward", "description": "Concise, direct", "instruction": "Refine this text to be concise and direct. Remove unnecessary words and get straight to the point."},
    {"id": "friendly", "name": "Friendly", "description": "Warm, approachable", "instruction": "Refine this text to be warm and approachable. Use conversational but respectful language that builds rapport."},
    {"id": "casual", "name": "Casual", "description": "Relaxed, conversational", "instruction": "Refine this text to be casual and conversational. Use everyday language while maintaining clarity."},
    {"id": "persuasive", "name": "Persuasive", "description": "Designed to influence", "instruction": "Refine this text to be persuasive and compelling. Use strong arguments, clear benefits, and motivating language."},
    {"id": "authoritative", "name": "Authoritative", "description": "Confident, expert-level", "instruction": "Refine this text to sound authoritative and expert. Use confident language that demonstrates knowledge and expertise."},
    {"id": "empathetic", "name": "Empathetic", "description": "Emotionally aware", "instruction": "Refine this text to be empathetic and understanding. Acknowledge feelings while providing clear communication."},
    {"id": "inspirational", "name": "Inspirational", "description": "Motivating, uplifting", "instruction": "Refine this text to be inspirational and motivating. Use uplifting language that encourages action and positive change."}
]

# Quality control rules (same as terminal app)
QUALITY_RULES = """
CRITICAL RULES - Apply ALL of these:

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
- Post-process for concision
"""

def load_settings():
    """Load settings from file or return defaults"""
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        except:
            return DEFAULT_SETTINGS
    return DEFAULT_SETTINGS

def save_settings(settings):
    """Save settings to file"""
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)

def create_refinement_prompt(text, tone_id, tone_instruction, custom_instructions=None):
    """Create the AI prompt with quality rules and optional custom instructions"""
    custom_section = ""
    if custom_instructions:
        custom_section = f"""
CUSTOM INSTRUCTIONS:
{custom_instructions}
"""
    
    return f"""You are a professional editor and writing coach. Your task is to refine the following text according to specific requirements.

TONE REQUIREMENT:
{tone_instruction}
{custom_section}
QUALITY CONTROL RULES:
{QUALITY_RULES}

ORIGINAL TEXT:
{text}

REFINED TEXT:"""

class AIProvider:
    """Base class for AI providers"""
    def __init__(self, api_key, model):
        self.api_key = api_key
        self.model = model
    
    def generate_completion(self, prompt, temperature=0.4):
        raise NotImplementedError("Subclasses must implement this method")

class GroqProvider(AIProvider):
    """Groq API provider"""
    def generate_completion(self, prompt, temperature=0.4):
        try:
            import groq
            client = groq.Groq(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"Groq API error: {str(e)}")

class OpenAIProvider(AIProvider):
    """OpenAI API provider"""
    def generate_completion(self, prompt, temperature=0.4):
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

class AnthropicProvider(AIProvider):
    """Anthropic Claude provider"""
    def generate_completion(self, prompt, temperature=0.4):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")

def get_ai_provider(provider_name, settings):
    """Factory function to get the appropriate AI provider"""
    provider_config = settings.get('providers', {}).get(provider_name, {})
    api_key = provider_config.get('apiKey', '')
    model = provider_config.get('model', '')
    
    if not api_key:
        return None
    
    providers = {
        'groq': GroqProvider,
        'openai': OpenAIProvider,
        'anthropic': AnthropicProvider,
        # Add more providers as needed
    }
    
    provider_class = providers.get(provider_name)
    if provider_class:
        return provider_class(api_key, model)
    
    return None

@app.route('/')
def landing():
    """Landing page"""
    return render_template('landing.html')

@app.route('/app')
def index():
    """Main app page"""
    return render_template('index.html')

@app.route('/api/tones')
def get_tones():
    """Get available tones"""
    return jsonify(TONES)

@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    """Get or update settings"""
    if request.method == 'GET':
        # Don't return API keys for security
        settings = load_settings()
        safe_settings = {
            'activeProvider': settings['activeProvider'],
            'theme': settings['theme'],
            'providers': {
                name: {'configured': bool(config.get('apiKey', ''))}
                for name, config in settings['providers'].items()
            }
        }
        return jsonify(safe_settings)
    
    elif request.method == 'POST':
        data = request.json
        settings = load_settings()
        
        if 'activeProvider' in data:
            settings['activeProvider'] = data['activeProvider']
        
        if 'theme' in data:
            settings['theme'] = data['theme']
        
        if 'provider' in data and 'apiKey' in data:
            provider_name = data['provider']
            if provider_name in settings['providers']:
                settings['providers'][provider_name]['apiKey'] = data['apiKey']
                if 'model' in data:
                    settings['providers'][provider_name]['model'] = data['model']
        
        save_settings(settings)
        return jsonify({'success': True})

@app.route('/api/refine', methods=['POST'])
def refine_text():
    """Refine text using AI"""
    data = request.json
    text = data.get('text', '').strip()
    tone_id = data.get('tone', 'professional')
    custom_instructions = data.get('customInstructions', '').strip()
    
    if not text:
        return jsonify({'error': 'Please enter some text to refine'}), 400
    
    # Find tone
    tone = next((t for t in TONES if t['id'] == tone_id), TONES[1])  # Default to professional
    
    # Load settings
    settings = load_settings()
    
    # Get AI provider
    provider = get_ai_provider(settings['activeProvider'], settings)
    if not provider:
        return jsonify({'error': f'No API key configured for {settings["activeProvider"]}. Please configure in settings.'}), 400
    
    # Create prompt with optional custom instructions
    prompt = create_refinement_prompt(
        text, 
        tone_id, 
        tone['instruction'],
        custom_instructions if custom_instructions else None
    )
    
    try:
        refined_text = provider.generate_completion(prompt, 0.4)
        return jsonify({
            'success': True,
            'original': text,
            'refined': refined_text,
            'tone': tone
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/providers')
def get_providers():
    """Get available providers info"""
    providers = {
        'openai': {'name': 'OpenAI', 'defaultModel': 'gpt-4o'},
        'groq': {'name': 'Groq', 'defaultModel': 'llama-3.3-70b-versatile'},
        'nvidia': {'name': 'NVIDIA NIM', 'defaultModel': 'llama-3.1-70b-instruct'},
        'grok': {'name': 'xAI/Grok', 'defaultModel': 'grok-beta'},
        'anthropic': {'name': 'Anthropic', 'defaultModel': 'claude-3-opus-20240229'},
        'together': {'name': 'Together AI', 'defaultModel': 'llama-3.3-70b'},
        'openrouter': {'name': 'OpenRouter', 'defaultModel': 'openai/gpt-4o'},
        'ollama': {'name': 'Ollama', 'defaultModel': 'llama3.1'},
        'custom': {'name': 'Custom', 'defaultModel': ''}
    }
    return jsonify(providers)

if __name__ == '__main__':
    # Initialize settings file if it doesn't exist
    if not os.path.exists(SETTINGS_FILE):
        save_settings(DEFAULT_SETTINGS)
    
    app.run(debug=True, port=5555)
