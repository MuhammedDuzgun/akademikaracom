// Main application class
class AkademikaraApp {
    constructor() {
        this.initializeElements();
        this.initializeEventListeners();
        this.currentSection = 'similar-articles';
    }

    initializeElements() {
        // Form elements
        this.forms = {
            article: document.getElementById('article-form'),
            source: document.getElementById('source-form'),
            quotation: document.getElementById('quotation-form'),
            proscons: document.getElementById('proscons-form')
        };

        // Section elements
        this.sections = {
            similar: document.getElementById('similar-articles'),
            sources: document.getElementById('article-sources'),
            quotations: document.getElementById('article-quotations'),
            analysis: document.getElementById('article-analysis')
        };

        // Results sections
        this.resultsSections = {
            results: document.getElementById('results-section'),
            sources: document.getElementById('sources-section'),
            quotations: document.getElementById('quotations-section'),
            proscons: document.getElementById('proscons-section')
        };

        // Content containers
        this.containers = {
            results: document.getElementById('results'),
            sources: document.getElementById('sources'),
            quotations: document.getElementById('quotations'),
            prosList: document.getElementById('pros-list'),
            consList: document.getElementById('cons-list')
        };

        // UI elements
        this.loadingSection = document.getElementById('loading-section');
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.navTabs = document.querySelectorAll('.nav-tab');
    }

    initializeEventListeners() {
        // Tab navigation
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.currentTarget));
        });

        // Form submissions
        this.forms.article.addEventListener('submit', (e) => this.handleArticleSearch(e));
        this.forms.source.addEventListener('submit', (e) => this.handleSourceSearch(e));
        this.forms.quotation.addEventListener('submit', (e) => this.handleQuotationSearch(e));
        this.forms.proscons.addEventListener('submit', (e) => this.handleProsConsSearch(e));

        // Form validation
        Object.values(this.forms).forEach(form => {
            form.addEventListener('input', (e) => this.validateField(e.target));
            form.addEventListener('blur', (e) => this.validateField(e.target));
        });
    }

    // Tab navigation
    switchTab(clickedTab) {
        const targetId = clickedTab.dataset.target;
        
        // Update tab states
        this.navTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        clickedTab.classList.add('active');
        clickedTab.setAttribute('aria-selected', 'true');

        // Update section visibility
        Object.values(this.sections).forEach(section => {
            section.classList.remove('active');
        });
        
        // Correct section mapping
        const sectionMap = {
            'similar-articles': 'similar',
            'article-sources': 'sources',
            'article-quotations': 'quotations',
            'article-analysis': 'analysis'
        };
        
        const sectionKey = sectionMap[targetId];
        if (sectionKey && this.sections[sectionKey]) {
            this.sections[sectionKey].classList.add('active');
        }

        this.currentSection = targetId;
    }

    // Form validation
    validateField(field) {
        const errorElement = document.getElementById(`${field.id}-error`);
        const isValid = this.isFieldValid(field);
        
        if (errorElement) {
            if (!isValid && field.value.trim()) {
                errorElement.textContent = this.getFieldErrorMessage(field);
                errorElement.classList.add('show');
                field.classList.add('error');
            } else {
                errorElement.classList.remove('show');
                field.classList.remove('error');
            }
        }

        return isValid;
    }

    isFieldValid(field) {
        if (field.hasAttribute('required') && !field.value.trim()) {
            return false;
        }
        
        if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(field.value);
        }

        // Text input için minimum uzunluk kontrolü
        if (field.type === 'text' && field.value.trim().length < 3) {
            return false;
        }

        return true;
    }

    getFieldErrorMessage(field) {
        if (field.hasAttribute('required') && !field.value.trim()) {
            return 'Bu alan zorunludur.';
        }
        
        if (field.type === 'email' && field.value) {
            return 'Geçerli bir e-posta adresi girin.';
        }

        if (field.type === 'text' && field.value.trim().length < 3) {
            return 'En az 3 karakter girmelisiniz.';
        }

        return 'Geçersiz değer.';
    }

    // Loading states
    showLoading(button) {
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        }
        
        button.disabled = true;
        this.loadingSection.style.display = 'block';
    }

    hideLoading(button) {
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
        
        button.disabled = false;
        this.loadingSection.style.display = 'none';
    }

    // Error handling
    showError(message) {
        console.error('Hata gösteriliyor:', message);
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
        this.errorSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    // Hide all results sections
    hideAllResults() {
        Object.values(this.resultsSections).forEach(section => {
            section.style.display = 'none';
        });
        this.hideError();
    }

    // API calls
    async makeApiCall(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (e) {
                    // If response is not JSON, use the text as is
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
            }
            throw error;
        }
    }

    // Form handlers
    async handleArticleSearch(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        
        // Validate form
        const fields = form.querySelectorAll('input, textarea');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showError('Lütfen tüm zorunlu alanları doldurun.');
            return;
        }

        this.showLoading(button);
        this.hideAllResults();

        try {
            const formData = new FormData(form);
            const data = {
                title: formData.get('title').trim(),
                articleAbstract: formData.get('abstract').trim()
            };

            const articles = await this.makeApiCall('/api/v1/articles', data);
            this.displayArticles(articles, this.containers.results, 'results-count');
            this.resultsSections.results.style.display = 'block';
            
        } catch (error) {
            this.showError(`Arama sırasında hata oluştu: ${error.message}`);
        } finally {
            this.hideLoading(button);
        }
    }

    async handleSourceSearch(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        
        if (!this.validateField(form.querySelector('#source-title'))) {
            this.showError('Lütfen makale başlığını girin.');
            return;
        }

        this.showLoading(button);
        this.hideAllResults();

        try {
            const formData = new FormData(form);
            const data = {
                title: formData.get('source-title').trim(),
                sourceFormat: formData.get('source-format')
            };

            const sources = await this.makeApiCall('/api/v1/articles/sources', data);
            this.displaySources(sources);
            this.resultsSections.sources.style.display = 'block';
            
        } catch (error) {
            this.showError(`Kaynak arama sırasında hata oluştu: ${error.message}`);
        } finally {
            this.hideLoading(button);
        }
    }

    async handleQuotationSearch(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        
        if (!this.validateField(form.querySelector('#quotation-title'))) {
            this.showError('Lütfen makale başlığını girin.');
            return;
        }

        this.showLoading(button);
        this.hideAllResults();

        try {
            const formData = new FormData(form);
            const data = {
                articleTitle: formData.get('quotation-title').trim()
            };

            const quotations = await this.makeApiCall('/api/v1/articles/quotations', data);
            this.displayArticles(quotations, this.containers.quotations, 'quotations-count');
            this.resultsSections.quotations.style.display = 'block';
            
        } catch (error) {
            this.showError(`Atıf arama sırasında hata oluştu: ${error.message}`);
        } finally {
            this.hideLoading(button);
        }
    }

    async handleProsConsSearch(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        
        if (!this.validateField(form.querySelector('#proscons-title'))) {
            this.showError('Lütfen makale başlığını girin.');
            return;
        }

        this.showLoading(button);
        this.hideAllResults();

        try {
            const formData = new FormData(form);
            const data = {
                title: formData.get('proscons-title').trim()
            };

            console.log('ProsCons API çağrısı:', data); // Debug için

            const result = await this.makeApiCall('/api/v1/articles/abstract', data);
            
            console.log('ProsCons API sonucu:', result); // Debug için
            
            this.displayProsCons(result);
            this.resultsSections.proscons.style.display = 'block';
            
        } catch (error) {
            console.error('ProsCons API hatası:', error); // Debug için
            this.showError(`Analiz sırasında hata oluştu: ${error.message}`);
        } finally {
            this.hideLoading(button);
        }
    }

    // Display methods
    displayArticles(articles, container, countElementId) {
        container.innerHTML = '';
        
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p class="no-results">Sonuç bulunamadı.</p>';
            return;
        }

        const countElement = document.getElementById(countElementId);
        if (countElement) {
            countElement.textContent = `${articles.length} sonuç`;
        }

        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'article-card';
            card.innerHTML = `
                <h3>${this.escapeHtml(article.articleName)}</h3>
                <p><strong>Yazar:</strong> ${this.escapeHtml(article.authorName)}</p>
                <p><strong>Yıl:</strong> ${this.escapeHtml(article.year)}</p>
                ${article.publishingPlace ? `<p><strong>Yayın Yeri:</strong> ${this.escapeHtml(article.publishingPlace)}</p>` : ''}
                ${this.currentSection === 'similar-articles' ? 
                    `<button class="btn-secondary" onclick="showSources('${this.escapeHtml(article.articleName)}')">Kaynakları Göster</button>` : 
                    ''}
            `;
            container.appendChild(card);
        });
    }

    displaySources(sources) {
        this.containers.sources.innerHTML = '';
        
        if (!sources || sources.length === 0) {
            this.containers.sources.innerHTML = '<p class="no-results">Bu makale için kaynak bulunamadı.</p>';
            return;
        }

        const countElement = document.getElementById('sources-count');
        if (countElement) {
            countElement.textContent = `${sources.length} kaynak`;
        }

        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = source.source;
            this.containers.sources.appendChild(sourceItem);
        });
    }

    displayProsCons(result) {
        this.containers.prosList.innerHTML = '';
        this.containers.consList.innerHTML = '';

        // Result kontrolü
        if (!result) {
            this.containers.prosList.innerHTML = '<p class="no-results">Analiz sonucu alınamadı.</p>';
            return;
        }

        if ((!result.pros || result.pros.length === 0) && (!result.cons || result.cons.length === 0)) {
            this.containers.prosList.innerHTML = '<p class="no-results">Bu makale için iyi veya kötü yan bulunamadı.</p>';
            return;
        }

        let tableHtml = '<table class="proscons-table"><thead><tr><th>İyi Yanları</th><th>Kötü Yanları</th></tr></thead><tbody>';
        
        const maxLen = Math.max(result.pros ? result.pros.length : 0, result.cons ? result.cons.length : 0);
        
        for (let i = 0; i < maxLen; i++) {
            tableHtml += '<tr>';
            tableHtml += `<td>${result.pros && result.pros[i] ? this.escapeHtml(result.pros[i]) : ''}</td>`;
            tableHtml += `<td>${result.cons && result.cons[i] ? this.escapeHtml(result.cons[i]) : ''}</td>`;
            tableHtml += '</tr>';
        }
        
        tableHtml += '</tbody></table>';
        this.containers.prosList.innerHTML = tableHtml;
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods for global access
    async showSources(articleTitle) {
        this.hideAllResults();
        this.loadingSection.style.display = 'block';

        try {
            const data = { title: articleTitle, sourceFormat: 'IEEE' };
            const sources = await this.makeApiCall('/api/v1/articles/sources', data);
            this.displaySources(sources);
            this.resultsSections.sources.style.display = 'block';
        } catch (error) {
            this.showError(`Kaynak gösterme sırasında hata oluştu: ${error.message}`);
        } finally {
            this.loadingSection.style.display = 'none';
        }
    }

    backToResults() {
        this.resultsSections.sources.style.display = 'none';
        this.resultsSections.results.style.display = 'block';
    }
}

// Global functions for HTML onclick handlers
let app;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    app = new AkademikaraApp();
});

// Global functions for backward compatibility
function showSources(articleTitle) {
    if (app) {
        app.showSources(articleTitle);
    }
}

function backToResults() {
    if (app) {
        app.backToResults();
    }
}

function hideError() {
    if (app) {
        app.hideError();
    }
} 