from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime
import re
import math
import postprocess as pp

app = Flask(__name__)

import tempfile

# Configuration
# Persist settings in a user-writable location by default so API keys survive
# server restarts and are not lost when the working directory changes.
# Allow overriding via REDACTUM_SETTINGS_FILE env var.
DEFAULT_SETTINGS_DIR = os.path.join(os.path.expanduser('~'), '.redactum')
SETTINGS_FILE = os.environ.get('REDACTUM_SETTINGS_FILE') or os.path.join(DEFAULT_SETTINGS_DIR, 'settings.json')

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

# Unified system-level message (kept as a string so both backend and frontend can mirror it)
UNIFIED_SYSTEM_MESSAGE = """
You are a professional human editor. Turn the user's draft into a finished, human-written passage that reads like the work of an experienced writer.

Apply these constraints when producing the refined text; do not emit the rules or any editorial notes in the output.

Formatting and punctuation:
- Use no more than one em dash (—) per 500 words.
- Prefer lists of 2–5 items; avoid three-item lists as a default.
- Never add emojis or decorative glyphs at the start of list items.

Sentence construction:
- Limit "Not just X — but Y" constructions to one per document.
- Do not use the phrases: "To clarify", "In summary", or "In other words" as formulaic markers.
- Ensure each sentence adds value or a new detail; remove repetition.

Vocabulary and tone:
- Avoid these buzzwords: Delve, Elevate, Innovative, Cutting-edge, Practical solutions, Transformative, Leverage, Robust, Seamless. Use plain, specific alternatives.
- Avoid vague, inflated praise; prefer concrete specifics, brief examples, or measurable detail.

Process behavior:
- Produce a finished, edited result (simulate outline → draft → edit). Do not output change logs, edit markers, or meta-comments (for example: lines beginning with "Note:", "Edited:", "I updated").
- Use conditional phrasing for unverifiable claims (e.g., "may", "often").

Delivery:
- Return only the refined text. Do not preface with "Here's the revised text" or similar. Do not include these rules in the response.
"""

# Post-processing helpers to enforce the quality rules and "humanize" AI output.
# These are best-effort, deterministic transformations (no additional model calls).
# Use an ordered list so longer multi-word phrases are replaced first.
BANNED_WORDS_REPLACEMENTS = [
    ('delve into', 'examine'),
    ('delve', 'examine'),
    ('elevate', 'improve'),
    ('innovative', 'new'),
    ('cutting-edge', 'advanced'),
    ('practical solutions', 'practical methods'),
    ('transformative', 'substantial'),
    ('leverage', 'use'),
    ('robust', 'reliable'),
    ('seamless', 'smooth')
]

# Match clarifying phrases and any following punctuation/whitespace so we don't leave stray commas.
CLARIFYING_PHRASES_RE = re.compile(r'(?mi)\b(?:to clarify|in summary|in other words)\b\s*(?:[:,;\-—])?\s*')

def remove_editorial_notes(text: str) -> str:
    """Remove editorial/metacomment lines such as "Note: I did ..." or short first-person edit notes.

    This targets clearly editorial sentences ("Note:", "I updated...", "Edited:") and
    parenthetical notes like "(Note: ...)". It is conservative: if the entire output would
    become empty we return the original text instead.
    """
    if not text:
        return text

    # Remove whole lines that look like editorial metadata. Be conservative: only remove
    # lines that either contain first-person edit verbs or short administrative notes.
    def _is_editorial_line(line: str) -> bool:
        if not line:
            return False
        low = line.strip().lower()
        # Quick check: starts with note/nb/edit
        if re.match(r'^(?:note|nb|edit(?:ed)?)(?:[:\-\u2014]|\b)', low):
            # If it contains first-person or edit verbs, treat as editorial
            if re.search(r'\b(i|we|i\s+have|i\s+was|i\s+removed|i\s+removed|removed|edited|updated|changed|fixed|added|replaced)\b', low):
                return True
            # If the line is very short (<=6 words) and reads like a marker, remove it
            if len(low.split()) <= 6:
                return True
            # Otherwise, be conservative and keep the line (it may be substantive)
            return False
        return False

    lines = text.splitlines()
    filtered_lines = [ln for ln in lines if not _is_editorial_line(ln)]
    text = '\n'.join(filtered_lines)

    # Remove parenthetical editorial notes: (Note: ...), (Edited: ...), (NB: ...)
    text = re.sub(r'(?mi)\(\s*(?:note|nb|edit(?:ed)?)[:\-\u2014]?[^)]*\)', '', text)

    # Remove sentences that are clearly first-person editorial: "I updated...", "I changed..."
    text = re.sub(r'(?mi)\bI\s+(?:did|made|changed|updated|added|removed|fixed|replaced|corrected)\b[^.?!\n]*[.?!]?', '', text)

    # Remove explicit 'Note that ...' clauses only when they appear as short administrative
    # markers (e.g., "Note that: duplicate removed"). Avoid removing substantive sentences
    # that start with 'Note that' followed by a full clause.
    def _remove_short_note_that(m: re.Match) -> str:
        s = m.group(0)
        if len(s.split()) <= 12:
            return ''
        return s

    text = re.sub(r'(?mi)\bnote that\b(?:\s*[,;:\-\u2014])?[^.?!\n]*[.?!]?', _remove_short_note_that, text)

    # Remove standalone markers like '[Note]' or 'NB:' at line starts
    text = re.sub(r'(?mi)^\s*\[?\b(?:note|nb)\b\]?[:\-\u2014]?\s*$', '', text)

    return text

def remove_clarifying_phrases(text: str) -> str:
    """Remove formulaic clarifying phrases like 'To clarify' or 'In summary'.

    This also strips following punctuation to avoid leaving stray commas.
    """
    return CLARIFYING_PHRASES_RE.sub('', text)

def replace_banned_words(text: str) -> str:
    """Replace banned buzzwords with simple alternatives (case-insensitive).

    Longer phrases are replaced first to avoid awkward residual words (e.g., 'delve into' -> 'examine').
    """
    for banned, replacement in BANNED_WORDS_REPLACEMENTS:
        pattern = re.compile(rf'(?i)\b{re.escape(banned)}\b')
        text = pattern.sub(replacement, text)
    # Clean up accidental double spaces created by replacements
    text = re.sub(r' {2,}', ' ', text)
    return text

def strip_leading_emoji_from_list_items(text: str) -> str:
    """Remove emoji or decorative characters that start list items.

    Many AI outputs put an emoji at the start of every bullet. This removes sequences of
    leading non-alphanumeric characters (except the bullet marker) at the start of list lines.
    """
    # Matches bullet lines and strips emoji-like characters that immediately follow the bullet
    text = re.sub(r"(?m)^(?P<lead>\s*[-\*\u2022]?\s*)(?P<emoji>[^A-Za-z0-9\s\-\*\u2022\.]+)\s*", r"\g<lead>", text)
    # Also handle lines that start directly with emoji (no bullet)
    text = re.sub(r'(?m)^\s*[^A-Za-z0-9\s\-\*\u2022\.]{1,5}\s+(?=[A-Za-z0-9])', '', text)
    return text

def fix_three_item_lists(text: str) -> str:
    """Transform exact three-item bullet groups into two-item groups by merging the last two.

    This is a deterministic way to avoid the "lists of three" red flag while preserving meaning.
    """
    lines = text.splitlines()
    out_lines = []
    i = 0
    while i < len(lines):
        if re.match(r'^\s*[-\*\u2022]\s+', lines[i]):
            # collect consecutive bullet lines
            group = []
            while i < len(lines) and re.match(r'^\s*[-\*\u2022]\s+', lines[i]):
                item = re.sub(r'^\s*[-\*\u2022]\s*', '', lines[i]).strip()
                group.append(item)
                i += 1
            if len(group) == 3:
                out_lines.append(f"- {group[0]}")
                out_lines.append(f"- {group[1]} and {group[2]}")
            else:
                for it in group:
                    out_lines.append(f"- {it}")
        else:
            out_lines.append(lines[i])
            i += 1
    return '\n'.join(out_lines)

def limit_parallel_structure(text: str) -> str:
    """Keep at most one occurrence of the "Not just X, but Y" pattern; rewrite extras."""
    pattern = re.compile(r'(?i)\bnot just\b.*?\bbut\b.*?(?:[.?!,;]|\Z)', re.DOTALL)
    matches = list(pattern.finditer(text))
    if len(matches) <= 1:
        return text

    # Replacement function that keeps the first match as-is and rewrites subsequent ones.
    counter = { 'n': 0 }
    def _repl(m):
        counter['n'] += 1
        s = m.group(0)
        if counter['n'] == 1:
            return s
        # Gentle rewrite: "Not just X, but Y" -> "Beyond X, Y"
        s = re.sub(r'(?i)\bnot just\b', 'Beyond', s, count=1)
        s = re.sub(r'(?i)\bbut\b', ',', s, count=1)
        return s

    return pattern.sub(_repl, text)

def limit_em_dashes(text: str) -> str:
    """Enforce the em-dash frequency: max 1 em dash per 500 words (best-effort).

    Extra em dashes are replaced with commas to make the text read more naturally.
    """
    words = len(re.findall(r'\w+', text))
    allowed = max(1, words // 500)
    emdash = '—'
    count = text.count(emdash)
    if count <= allowed:
        return text

    # Replace extra em dashes (keep the first `allowed`, replace the rest with commas)
    parts = text.split(emdash)
    # parts length = count+1
    keep = parts[:allowed+1]
    rest = parts[allowed+1:]
    result = emdash.join(keep)
    if rest:
        # join the remaining parts by comma+space to preserve readability
        result += ', ' + ', '.join(p.strip() for p in rest if p.strip())
    return result

def conciseify(text: str) -> str:
    """Small style cleanups to improve concision and remove filler words."""
    replacements = {
        r'(?i)\bin order to\b': 'to',
        r'(?i)\bdue to the fact that\b': 'because',
        r'(?i)\bis able to\b': 'can',
        r'(?i)\bhas the ability to\b': 'can',
        r'(?i)\bat this point in time\b': 'now',
        r'(?i)\bin the event that\b': 'if',
        r'(?i)\bvery\b': '',
        r'(?i)\breally\b': ''
    }
    for pat, repl in replacements.items():
        text = re.sub(pat, repl, text)
    return text

def normalize_whitespace(text: str) -> str:
    # collapse multiple blank lines
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    # normalize spaces
    text = re.sub(r'[ \t]+', ' ', text)
    # rstrip each line
    text = '\n'.join(line.rstrip() for line in text.splitlines())
    return text.strip()

def postprocess_refined_text(text: str) -> str:
    """Apply the full post-processing pipeline. Runs a few passes and returns the best-effort result.

    The pipeline is intentionally conservative: if post-processing removes all content, the original
    refined text is returned.
    """
    if not text:
        return text

    for _ in range(2):  # two-pass pipeline
        text = remove_editorial_notes(text)
        text = remove_clarifying_phrases(text)
        text = replace_banned_words(text)
        text = strip_leading_emoji_from_list_items(text)
        text = fix_three_item_lists(text)
        text = limit_parallel_structure(text)
        text = limit_em_dashes(text)
        text = conciseify(text)
        text = normalize_whitespace(text)

    # Final safety removals: ensure no lingering editorial markers
    text = re.sub(r'(?mi)\b(?:note|nb|edit(?:ed)?)[:\-\u2014]?\b[^.?!\n]*[.?!]?', '', text)
    text = text.strip()

    # Do not revert to the original; user explicitly requested removal of editorial notes.
    return text


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
    """Save settings to file using an atomic replace.

    This ensures that concurrent reads won't observe a partially-written file and
    that settings persist even if the process working directory changes.
    """
    dirpath = os.path.dirname(SETTINGS_FILE)
    try:
        if not os.path.exists(dirpath):
            os.makedirs(dirpath, exist_ok=True)
        # atomic write
        fd, tmp_path = tempfile.mkstemp(dir=dirpath)
        try:
            with os.fdopen(fd, 'w') as f:
                json.dump(settings, f, indent=2)
            os.replace(tmp_path, SETTINGS_FILE)
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    except Exception:
        # Best-effort: do a simple write if atomic replace fails
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
    # Return only the user-level prompt content. Providers should send UNIFIED_SYSTEM_MESSAGE
    # as the system role (chat APIs) when supported. For providers that do not support a
    # system role, the provider adapter may prepend UNIFIED_SYSTEM_MESSAGE to this string.
    # FEW_SHOT_EXAMPLES may be defined in the frontend module; if not available in the backend
    # we simply don't include examples here to avoid a NameError.
    few_shot = globals().get('FEW_SHOT_EXAMPLES', '')

    return f"""TONE REQUIREMENT:
{tone_instruction}
{custom_section}

ORIGINAL TEXT:
{text}

EXAMPLES:
{few_shot}

REFINED TEXT:"""

class AIProvider:
    """Base class for AI providers"""
    def __init__(self, api_key, model):
        self.api_key = api_key
        self.model = model
    
    def generate_completion(self, prompt, temperature=0.4):
        raise NotImplementedError("Subclasses must implement this method")


def extract_response_text(response) -> str:
    """Safely extract text content from provider responses.

    Different provider SDKs return differently-shaped objects. This helper tries
    a few common patterns (attribute-style and dict-style) and falls back to
    a best-effort string conversion. It always returns a str (possibly empty)
    and never raises.
    """
    try:
        # Attribute-style: response.choices[0].message.content or .text
        if hasattr(response, 'choices'):
            choices = getattr(response, 'choices')
            if choices:
                first = choices[0]
                # message.content
                msg = getattr(first, 'message', None)
                if msg is not None:
                    content = getattr(msg, 'content', None)
                    if content:
                        return content.strip()
                # first.text
                content = getattr(first, 'text', None)
                if content:
                    return content.strip()
                # first itself may be a string
                if isinstance(first, str):
                    return first.strip()

        # Dict-style (openai library sometimes returns dict-like)
        if isinstance(response, dict):
            choices = response.get('choices')
            if choices:
                first = choices[0]
                if isinstance(first, dict):
                    message = first.get('message')
                    if isinstance(message, dict):
                        content = message.get('content')
                        if content:
                            return str(content).strip()
                    text = first.get('text') or first.get('message')
                    if text:
                        if isinstance(text, dict):
                            c = text.get('content') or text.get('text')
                            if c:
                                return str(c).strip()
                        return str(text).strip()

        # Anthropic style: response.content[0].text
        if hasattr(response, 'content') and getattr(response, 'content'):
            c0 = getattr(response, 'content')[0]
            if hasattr(c0, 'text'):
                return getattr(c0, 'text', '').strip()

        # Fallback: stringify
        return str(response).strip()
    except Exception:
        return ''

class GroqProvider(AIProvider):
    """Groq API provider"""
    def generate_completion(self, prompt, temperature=0.4):
        try:
            import groq
            client = groq.Groq(api_key=self.api_key)
            messages = [
                {"role": "system", "content": UNIFIED_SYSTEM_MESSAGE},
                {"role": "user", "content": prompt},
            ]
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return extract_response_text(response)
        except Exception as e:
            raise Exception(f"Groq API error: {str(e)}")

class OpenAIProvider(AIProvider):
    """OpenAI API provider"""
    def generate_completion(self, prompt, temperature=0.4):
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            messages = [
                {"role": "system", "content": UNIFIED_SYSTEM_MESSAGE},
                {"role": "user", "content": prompt},
            ]
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return extract_response_text(response)
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

class AnthropicProvider(AIProvider):
    """Anthropic Claude provider"""
    def generate_completion(self, prompt, temperature=0.4):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)
            # Anthropics' SDK may expect a different message format; include system-like guidance
            messages = [
                {"role": "system", "content": UNIFIED_SYSTEM_MESSAGE},
                {"role": "user", "content": prompt},
            ]
            response = client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=temperature,
                messages=messages
            )
            return extract_response_text(response)
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
        # Include UI controls for humanize level and debug flag so the web UI
        # can send them to /api/refine. These are non-sensitive.
        safe_settings['humanizeLevel'] = settings.get('humanizeLevel', 'standard')
        safe_settings['debug'] = bool(settings.get('debug', False))
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
                # Trim the API key and persist it
                api_key = str(data['apiKey']).strip()
                settings['providers'][provider_name]['apiKey'] = api_key
                # Make this provider active by default when a key is configured
                settings['activeProvider'] = provider_name
                if 'model' in data:
                    settings['providers'][provider_name]['model'] = data['model']

        # Allow saving UI-level flags (humanizeLevel/debug) from the web UI
        if 'humanizeLevel' in data:
            hl = data.get('humanizeLevel')
            if hl in ('low', 'standard', 'aggressive'):
                settings['humanizeLevel'] = hl
        if 'debug' in data:
            settings['debug'] = bool(data.get('debug'))
        
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

        # Read humanize level and debug flags from request
        humanize_level = data.get('humanizeLevel', 'standard')
        if humanize_level not in ('low', 'standard', 'aggressive'):
            humanize_level = 'standard'
        debug = bool(data.get('debug', False))

        # Use the enhanced postprocessing function that can return a debug report
        processed = pp.postprocess_refined_text_full(refined_text, debug=debug, aggressiveness=humanize_level)

        if isinstance(processed, dict):
            post_text = processed.get('text', '').strip()
            report = processed.get('report', {})
        else:
            post_text = str(processed).strip()
            report = None

        # If post-processing stripped all usable content (e.g., output was only editorial notes),
        # fall back to returning the original model output but without editorial notes. If that is
        # still empty, return an error instructing the user to try again.
        if not post_text:
            fallback = remove_editorial_notes(refined_text).strip()
            if not fallback:
                return jsonify({'error': 'Model output contained no usable content after post-processing. Please try again with a different tone or input.'}), 500
            refined_text = fallback
            post_text = fallback
        else:
            refined_text = post_text

        resp = {
            'success': True,
            'original': text,
            'refined': refined_text,
            'tone': tone
        }
        if report is not None:
            resp['postprocessReport'] = report

        return jsonify(resp)
    except ModuleNotFoundError as e:
        # Provide a clearer message when the provider SDK is not installed
        name = getattr(e, 'name', None) or str(e)
        msg = f"AI provider dependency not installed: {name}. Please install the provider SDK (e.g. pip install {name}) or choose a different provider in settings."
        return jsonify({'error': msg}), 500
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
