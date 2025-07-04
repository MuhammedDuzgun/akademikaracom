document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('article-form');
    const sourceForm = document.getElementById('source-form');
    const resultsSection = document.getElementById('results-section');
    const resultsDiv = document.getElementById('results');
    const sourcesSection = document.getElementById('sources-section');
    const sourcesDiv = document.getElementById('sources');
    const loadingSection = document.getElementById('loading-section');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        resultsSection.style.display = 'none';
        errorSection.style.display = 'none';
        loadingSection.style.display = 'block';
        resultsDiv.innerHTML = '';

        const title = document.getElementById('title').value.trim();
        const articleAbstract = document.getElementById('abstract').value.trim();

        try {
            const response = await fetch('/api/v1/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, articleAbstract })
            });

            loadingSection.style.display = 'none';

            if (!response.ok) {
                throw new Error('Sunucudan beklenmeyen bir yanıt alındı.');
            }

            const articles = await response.json();

            if (!articles || articles.length === 0) {
                resultsDiv.innerHTML = '<p>Benzer makale bulunamadı.</p>';
            } else {
                articles.forEach(article => {
                    const card = document.createElement('div');
                    card.className = 'article-card';
                    card.innerHTML = `
                        <h3>${article.articleName}</h3>
                        <p><strong>Yazar:</strong> ${article.authorName}</p>
                        <p><strong>Yıl:</strong> ${article.year}</p>
                        <button class="source-button" onclick="showSources('${article.articleName}')">Kaynakları Göster</button>
                    `;
                    resultsDiv.appendChild(card);
                });
            }
            resultsSection.style.display = 'block';
        } catch (err) {
            loadingSection.style.display = 'none';
            errorMessage.textContent = err.message || 'Bir hata oluştu.';
            errorSection.style.display = 'block';
        }
    });

    // Sadece başlık ile kaynak arama formu
    sourceForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        resultsSection.style.display = 'none';
        errorSection.style.display = 'none';
        loadingSection.style.display = 'block';
        sourcesDiv.innerHTML = '';

        const articleTitle = document.getElementById('source-title').value.trim();

        try {
            const response = await fetch(`/api/v1/articles/sources?articleTitle=${encodeURIComponent(articleTitle)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            loadingSection.style.display = 'none';

            if (!response.ok) {
                throw new Error('Sunucudan beklenmeyen bir yanıt alındı.');
            }

            const sources = await response.json();

            if (!sources || sources.length === 0) {
                sourcesDiv.innerHTML = '<p>Bu makale için kaynak bulunamadı.</p>';
            } else {
                sources.forEach(source => {
                    const sourceItem = document.createElement('div');
                    sourceItem.className = 'source-item';
                    sourceItem.textContent = source.source;
                    sourcesDiv.appendChild(sourceItem);
                });
            }
            
            sourcesSection.style.display = 'block';
        } catch (err) {
            loadingSection.style.display = 'none';
            errorMessage.textContent = err.message || 'Bir hata oluştu.';
            errorSection.style.display = 'block';
        }
    });
});

// Makale kaynaklarını gösteren fonksiyon (benzer makaleler listesinden)
async function showSources(articleTitle) {
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    loadingSection.style.display = 'block';
    sourcesDiv.innerHTML = '';

    try {
        const response = await fetch(`/api/v1/articles/sources?articleTitle=${encodeURIComponent(articleTitle)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        loadingSection.style.display = 'none';

        if (!response.ok) {
            throw new Error('Sunucudan beklenmeyen bir yanıt alındı.');
        }

        const sources = await response.json();

        if (!sources || sources.length === 0) {
            sourcesDiv.innerHTML = '<p>Bu makale için kaynak bulunamadı.</p>';
        } else {
            sources.forEach(source => {
                const sourceItem = document.createElement('div');
                sourceItem.className = 'source-item';
                sourceItem.textContent = source.source;
                sourcesDiv.appendChild(sourceItem);
            });
        }
        
        sourcesSection.style.display = 'block';
    } catch (err) {
        loadingSection.style.display = 'none';
        errorMessage.textContent = err.message || 'Bir hata oluştu.';
        errorSection.style.display = 'block';
    }
}

// Makale listesine geri dönme fonksiyonu
function backToResults() {
    sourcesSection.style.display = 'none';
    resultsSection.style.display = 'block';
} 