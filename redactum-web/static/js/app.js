// Redactum Web App JavaScript

class RedactumApp {
    constructor() {
        this.tones = [];
        this.selectedTone = 'professional';
        this.settings = {};
        this.providers = {};
        this.theme = localStorage.getItem('theme') || 'dark';
        this.models = {
            'openai': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
            'groq': ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma-7b-it'],
            'anthropic': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
            'nvidia': ['llama-3.1-70b-instruct', 'llama-3.1-8b-instruct', 'mistral-7b-instruct'],
            'grok': ['grok-beta', 'grok-vision-beta'],
            'together': ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b', 'mistral-7b-instruct'],
            'openrouter': ['openai/gpt-4o', 'anthropic/claude-3-opus', 'meta-llama/llama-3.3-70b'],
            'ollama': ['llama3.1', 'llama3', 'mistral', 'codellama', 'phi3'],
            'custom': ['custom-model']
        };
        this.init();
    }

    async init() {
        this.applyTheme();
        await this.loadTones();
        await this.loadSettings();
        await this.loadProviders();
        this.setupEventListeners();
        this.renderTones();
        this.renderProviders();
        this.updateModelDropdown();
        this.setupCharacterCount();
    }

    async loadTones() {
        try {
            const response = await fetch('/api/tones');
            this.tones = await response.json();
        } catch (error) {
            console.error('Failed to load tones:', error);
        }
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            this.settings = await response.json();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async loadProviders() {
        try {
            const response = await fetch('/api/providers');
            this.providers = await response.json();
        } catch (error) {
            console.error('Failed to load providers:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('refineBtn').addEventListener('click', () => this.refineText());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('newBtn').addEventListener('click', () => this.reset());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('providerSelect').addEventListener('change', () => this.updateModelDropdown());
        
        // Close modals on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettings();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.refineText();
            }
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    setupCharacterCount() {
        const inputText = document.getElementById('inputText');
        inputText.addEventListener('input', () => {
            const count = inputText.value.length;
            document.getElementById('inputCharCount').textContent = `${count} character${count !== 1 ? 's' : ''}`;
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        
        if (this.theme === 'light') {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }

    renderTones() {
        const toneGrid = document.getElementById('toneGrid');
        toneGrid.innerHTML = this.tones.map(tone => `
            <div 
                class="tone-card ${tone.id === this.selectedTone ? 'selected' : ''}"
                data-tone="${tone.id}"
                onclick="app.selectTone('${tone.id}')"
            >
                <div class="font-medium text-sm">${tone.name}</div>
                <div class="text-xs opacity-70 mt-1">${tone.description}</div>
            </div>
        `).join('');
    }

    renderProviders() {
        const providerSelect = document.getElementById('providerSelect');
        providerSelect.innerHTML = Object.entries(this.providers).map(([key, info]) => `
            <option value="${key}">${info.name}</option>
        `).join('');

        if (this.settings.activeProvider) {
            providerSelect.value = this.settings.activeProvider;
        }
    }

    updateModelDropdown() {
        const provider = document.getElementById('providerSelect').value;
        const modelSelect = document.getElementById('modelSelect');
        const modelInput = document.getElementById('modelInput');
        const models = this.models[provider] || ['default-model'];
        const defaultModel = this.providers[provider]?.defaultModel || models[0];
        
        modelSelect.innerHTML = models.map(model => `
            <option value="${model}" ${model === defaultModel ? 'selected' : ''}>${model}</option>
        `).join('') + '<option value="other">Other (Custom)...</option>';
        
        modelSelect.value = defaultModel;
        modelInput.value = '';
        modelInput.classList.add('hidden');
        modelSelect.classList.remove('hidden');
        
        modelSelect.onchange = () => {
            if (modelSelect.value === 'other') {
                modelSelect.classList.add('hidden');
                modelInput.classList.remove('hidden');
                modelInput.focus();
            } else {
                modelInput.value = modelSelect.value;
            }
        };
        
        modelInput.onblur = () => {
            if (!modelInput.value) {
                modelInput.classList.add('hidden');
                modelSelect.classList.remove('hidden');
                modelSelect.value = defaultModel;
            }
        };
    }

    selectTone(toneId) {
        this.selectedTone = toneId;
        this.renderTones();
    }

    async refineText() {
        const inputText = document.getElementById('inputText').value.trim();
        
        if (!inputText) {
            this.showToast('Please enter some text to refine', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/refine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: inputText,
                    tone: this.selectedTone
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showOutput(data);
            } else {
                this.showToast(data.error || 'Failed to refine text', 'error');
                this.showLoading(false);
            }
        } catch (error) {
            console.error('Refinement error:', error);
            this.showToast('Failed to refine text. Please check your settings.', 'error');
            this.showLoading(false);
        }
    }

    showOutput(data) {
        // Hide loading and empty state
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        
        // Show output content
        const outputContent = document.getElementById('outputContent');
        outputContent.classList.remove('hidden');
        outputContent.classList.add('slide-in');
        
        // Set the content
        document.getElementById('outputText').textContent = data.refined;
        document.getElementById('originalText').textContent = data.original;
        document.getElementById('selectedTone').textContent = data.tone.name;
        document.getElementById('selectedTone').classList.remove('hidden');
        
        // Update character count
        const outputCount = data.refined.length;
        document.getElementById('outputCharCount').textContent = `${outputCount} character${outputCount !== 1 ? 's' : ''}`;
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const emptyState = document.getElementById('emptyState');
        const outputContent = document.getElementById('outputContent');
        
        if (show) {
            loadingSection.classList.remove('hidden');
            emptyState.classList.add('hidden');
            outputContent.classList.add('hidden');
        } else {
            loadingSection.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    }

    reset() {
        document.getElementById('inputText').value = '';
        document.getElementById('inputCharCount').textContent = '0 characters';
        document.getElementById('outputCharCount').textContent = '0 characters';
        document.getElementById('outputContent').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('selectedTone').classList.add('hidden');
        this.selectedTone = 'professional';
        this.renderTones();
    }

    async copyToClipboard() {
        const outputText = document.getElementById('outputText').textContent;
        try {
            await navigator.clipboard.writeText(outputText);
            this.showToast('Copied to clipboard!');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Failed to copy', 'error');
        }
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
        if (this.settings.activeProvider) {
            document.getElementById('providerSelect').value = this.settings.activeProvider;
        }
        this.updateModelDropdown();
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    async saveSettings() {
        const provider = document.getElementById('providerSelect').value;
        const apiKey = document.getElementById('apiKeyInput').value;
        const modelSelect = document.getElementById('modelSelect');
        const modelInput = document.getElementById('modelInput');
        const model = modelInput.classList.contains('hidden') ? modelSelect.value : modelInput.value;

        if (!apiKey) {
            this.showToast('Please enter an API key', 'error');
            return;
        }

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: provider,
                    apiKey: apiKey,
                    model: model,
                    activeProvider: provider
                })
            });

            if (response.ok) {
                this.showToast('Settings saved successfully!');
                this.closeSettings();
                await this.loadSettings();
            } else {
                this.showToast('Failed to save settings', 'error');
            }
        } catch (error) {
            console.error('Save settings error:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    showToast(message, type = 'success') {
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Trigger show
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide and remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize app
const app = new RedactumApp();
