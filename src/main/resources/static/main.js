// Akademikara - Modern PDF Analiz & Atıf Bulucu

document.addEventListener('DOMContentLoaded', () => {
    // Sekme geçişi
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.main-section');

    function activateSection(sectionName) {
        navBtns.forEach(b => {
            if (b.dataset.section === sectionName) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        sections.forEach(sec => {
            if (sec.id === sectionName + '-section') {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });
        // Profil sekmesi seçildiyse profili yükle
        if (sectionName === 'profile') {
            loadProfile();
        }
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activateSection(btn.dataset.section);
        });
    });

    // İlk açılışta PDF Analiz sekmesini aktif yap
    activateSection('pdf-analysis');

    // PDF Analiz
    const pdfForm = document.getElementById('pdf-form');
    const pdfFileInput = document.getElementById('pdf-file');
    const pdfResult = document.getElementById('pdf-result');
    const pdfLoading = document.getElementById('pdf-loading');
    const pdfError = document.getElementById('pdf-file-error');

    pdfForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        pdfError.textContent = '';
        pdfResult.innerHTML = '';
        if (!pdfFileInput.files || pdfFileInput.files.length === 0) {
            pdfError.textContent = 'Lütfen bir PDF dosyası seçin.';
            return;
        }
        const file = pdfFileInput.files[0];
        if (file.type !== 'application/pdf') {
            pdfError.textContent = 'Yalnızca PDF dosyası yükleyebilirsiniz.';
            return;
        }
        pdfLoading.style.display = 'block';
        try {
            const formData = new FormData();
            formData.append('file', file);
            const resp = await fetch('/api/v1/articles/analyze-article', {
                method: 'POST',
                body: formData
            });
            if (!resp.ok) throw new Error(await resp.text());
            const result = await resp.json();
            pdfResult.innerHTML = renderPdfResult(result);
        } catch (err) {
            pdfResult.innerHTML = `<div class='error-message'>${err.message || 'Analiz sırasında hata oluştu.'}</div>`;
        } finally {
            pdfLoading.style.display = 'none';
        }
    });

    // Özetten Anahtar Kelime
    const keywordsForm = document.getElementById('keywords-form');
    const keywordsInput = document.getElementById('keywords-abstract');
    const keywordsResult = document.getElementById('keywords-result');
    const keywordsLoading = document.getElementById('keywords-loading');
    const keywordsError = document.getElementById('keywords-abstract-error');

    if (keywordsForm) {
        keywordsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            keywordsError.textContent = '';
            keywordsResult.innerHTML = '';
            document.getElementById('openalex-result').innerHTML = '';
            const content = keywordsInput.value.trim();
            if (!content) {
                keywordsError.textContent = 'Makale özeti zorunludur.';
                return;
            }
            keywordsLoading.style.display = 'block';
            try {
                const resp = await fetch('/api/v1/articles/keywords', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                if (!resp.ok) throw new Error(await resp.text());
                const result = await resp.json();
                keywordsResult.innerHTML = renderKeywordsResult(result);
                if (result.keywords && result.keywords.length > 0) {
                    await handleKeywordsAndPapers(result.keywords);
                }
            } catch (err) {
                keywordsResult.innerHTML = `<div class='error-message'>${err.message || 'Anahtar kelimeler alınırken hata oluştu.'}</div>`;
                document.getElementById('openalex-result').innerHTML = '';
            } finally {
                keywordsLoading.style.display = 'none';
            }
        });
    }

    async function fetchOpenAlexPapers(keyword) {
        const url = `https://api.openalex.org/works?filter=title_and_abstract.search:${encodeURIComponent(keyword)}&sort=cited_by_count:desc&per-page=5&select=id,title,authorships,publication_year,doi,cited_by_count,primary_location,abstract_inverted_index`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('OpenAlex API hatası');
        const data = await resp.json();
        return data.results;
    }

    async function fetchAllKeywordsPapers(keywords) {
        const results = await Promise.all(keywords.map(fetchOpenAlexPapers));
        return keywords.map((keyword, i) => ({
            keyword,
            papers: results[i]
        }));
    }

    async function handleKeywordsAndPapers(keywords) {
        const openalexResult = document.getElementById('openalex-result');
        openalexResult.innerHTML = '<div class="loading">OpenAlex makaleleri yükleniyor...</div>';
        try {
            const papersByKeyword = await fetchAllKeywordsPapers(keywords);
            openalexResult.innerHTML = renderOpenAlexResults(papersByKeyword);
        } catch (err) {
            openalexResult.innerHTML = `<div class='error-message'>OpenAlex makaleleri alınırken hata oluştu: ${err.message}</div>`;
        }
    }

    function renderOpenAlexResults(papersByKeyword) {
        return papersByKeyword.map(group => `
            <div class="keyword-group">
                <h3>🔑 ${escapeHtml(group.keyword)}</h3>
                <div class="papers-list">
                    ${group.papers.map(renderOpenAlexPaper).join('')}
                </div>
            </div>
        `).join('');
    }

    function renderOpenAlexPaper(paper) {
        const authors = (paper.authorships || []).map(a => escapeHtml(a.author.display_name)).join(', ');
        const venue = paper.primary_location && paper.primary_location.source
            ? escapeHtml(paper.primary_location.source.display_name)
            : '';
        const pdf = paper.primary_location && paper.primary_location.pdf_url
            ? `<a href="${paper.primary_location.pdf_url}" target="_blank" title="PDF"><span style='font-size:1.1em;'>📄</span> PDF</a>` : '';
        const doi = paper.doi ? `<a href="${paper.doi}" target="_blank" title="DOI"><span style='font-size:1.1em;'>🔗</span> DOI</a>` : '';
        const year = paper.publication_year ? `<span title='Yayın Yılı'>📅 ${paper.publication_year}</span>` : '';
        const cited = typeof paper.cited_by_count === 'number' ? `<span title='Atıf Sayısı'>⭐ ${paper.cited_by_count}</span>` : '';
        const abs = paper.abstract_inverted_index
            ? `<div class="paper-abstract">${escapeHtml(abstractFromInvertedIndex(paper.abstract_inverted_index))}</div>`
            : '';
        return `
            <div class="paper-card">
                <div class="paper-title">${escapeHtml(paper.title)}</div>
                <div class="paper-meta">
                    ${authors ? `<span>👤 ${authors}</span>` : ''}
                    ${venue ? `<span>📚 ${venue}</span>` : ''}
                    ${year}
                    ${cited}
                    ${doi}
                    ${pdf}
                </div>
                ${abs}
            </div>
        `;
    }

    // OpenAlex abstract_inverted_index'i düz metne çeviren yardımcı fonksiyon
    function abstractFromInvertedIndex(index) {
        if (!index) return '';
        const words = [];
        Object.entries(index).forEach(([word, positions]) => {
            positions.forEach(pos => words[pos] = word);
        });
        return words.join(' ');
    }

    // PDF analiz sonucu render fonksiyonu
    function renderPdfResult(result) {
        if (!result) return '<div class="error-message">Analiz sonucu alınamadı.</div>';
        let html = `<div class='pdf-result-card'>`;
        if (result.title) html += `<div class='pdf-result-field'><span class='pdf-result-title'>📄 Makale Başlığı</span><div>${escapeHtml(result.title)}</div></div>`;
        if (result.authors && result.authors.length > 0) html += `<div class='pdf-result-field'><span class='pdf-result-title'>👤 Yazarlar</span><div>${result.authors.map(escapeHtml).join(', ')}</div></div>`;
        if (result.institutions && result.institutions.length > 0) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🏢 Kurumlar</span><div>${result.institutions.map(escapeHtml).join(', ')}</div></div>`;
        if (result.emails && result.emails.length > 0) html += `<div class='pdf-result-field'><span class='pdf-result-title'>✉️ E-posta</span><div>${result.emails.map(escapeHtml).join(', ')}</div></div>`;
        if (result.journalName) html += `<div class='pdf-result-field'><span class='pdf-result-title'>📚 Dergi</span><div>${escapeHtml(result.journalName)}</div></div>`;
        if (result.publicationDate) html += `<div class='pdf-result-field'><span class='pdf-result-title'>📅 Yayın Tarihi</span><div>${escapeHtml(result.publicationDate)}</div></div>`;
        if (result.doi) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🔗 DOI</span><div>${escapeHtml(result.doi)}</div></div>`;
        if (result.keywords && result.keywords.length > 0) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🏷️ Anahtar Kelimeler</span><div>${result.keywords.map(k=>`<span class='pdf-keyword'>${escapeHtml(k)}</span>`).join(' ')}</div></div>`;
        if (result.summary) html += `<div class='pdf-result-field'><span class='pdf-result-title'>📝 Makale Özeti</span><div>${escapeHtml(result.summary)}</div></div>`;
        if (result.sections && Object.keys(result.sections).length > 0) {
            html += `<div class='pdf-result-field'><span class='pdf-result-title'>📑 Bölümler</span><ul class='pdf-section-list'>`;
            for (const [section, content] of Object.entries(result.sections)) {
                html += `<li><strong>${escapeHtml(section)}:</strong> ${escapeHtml(content)}</li>`;
            }
            html += `</ul></div>`;
        }
        if (result.strengths) html += `<div class='pdf-result-field'><span class='pdf-result-title'>💪 Güçlü Yönler</span><div>${escapeHtml(result.strengths)}</div></div>`;
        if (result.weaknesses) html += `<div class='pdf-result-field'><span class='pdf-result-title'>⚠️ Zayıf Yönler</span><div>${escapeHtml(result.weaknesses)}</div></div>`;
        if (result.contribution) html += `<div class='pdf-result-field'><span class='pdf-result-title'>✨ Katkı</span><div>${escapeHtml(result.contribution)}</div></div>`;
        if (result.missingPoints) html += `<div class='pdf-result-field'><span class='pdf-result-title'>❓ Eksik Noktalar</span><div>${escapeHtml(result.missingPoints)}</div></div>`;
        if (result.methodology) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🔬 Metodoloji</span><div>${escapeHtml(result.methodology)}</div></div>`;
        if (result.researchQuestion) html += `<div class='pdf-result-field'><span class='pdf-result-title'>❔ Araştırma Sorusu</span><div>${escapeHtml(result.researchQuestion)}</div></div>`;
        if (result.mainFindings) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🔎 Temel Bulgular</span><div>${escapeHtml(result.mainFindings)}</div></div>`;
        if (result.discussionSummary) html += `<div class='pdf-result-field'><span class='pdf-result-title'>💬 Tartışma Özeti</span><div>${escapeHtml(result.discussionSummary)}</div></div>`;
        if (result.mostCitedSources && result.mostCitedSources.length > 0) {
            html += `<div class='pdf-result-field'><span class='pdf-result-title'>📖 En Çok Atıf Yapılan Kaynaklar</span><ol class='pdf-source-list'>`;
            result.mostCitedSources.forEach(src => {
                html += `<li>${escapeHtml(src)}</li>`;
            });
            html += `</ol></div>`;
        }
        if (typeof result.totalSourcesCount === 'number') html += `<div class='pdf-result-field'><span class='pdf-result-title'>🔢 Toplam Kaynak Sayısı</span><div>${result.totalSourcesCount}</div></div>`;
        if (result.sourceDiversityAndRecency) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🌐 Kaynak Çeşitliliği ve Güncelliği</span><div>${escapeHtml(result.sourceDiversityAndRecency)}</div></div>`;
        if (result.writingQuality) html += `<div class='pdf-result-field'><span class='pdf-result-title'>✍️ Yazım Kalitesi</span><div>${escapeHtml(result.writingQuality)}</div></div>`;
        if (result.fluencyAndClarity) html += `<div class='pdf-result-field'><span class='pdf-result-title'>💡 Akıcılık ve Anlaşılırlık</span><div>${escapeHtml(result.fluencyAndClarity)}</div></div>`;
        if (result.scientificTerminologySuitability) html += `<div class='pdf-result-field'><span class='pdf-result-title'>🔬 Bilimsel Terminoloji Uygunluğu</span><div>${escapeHtml(result.scientificTerminologySuitability)}</div></div>`;
        html += `</div>`;
        return html;
    }

    function renderKeywordsResult(result) {
        if (!result || !result.keywords || result.keywords.length === 0) {
            return '<div class="error-message">Anahtar kelime bulunamadı.</div>';
        }
        return `<div class='pdf-result-field'><span class='pdf-result-title'>🏷️ Anahtar Kelimeler</span><div>${result.keywords.map(k=>`<span class='pdf-keyword'>${escapeHtml(k)}</span>`).join(' ')}</div></div>`;
    }

    // Profil yükleme fonksiyonu
    async function loadProfile() {
        const loading = document.getElementById('profile-loading');
        const result = document.getElementById('profile-result');
        loading.style.display = 'block';
        result.innerHTML = '';
        try {
            const resp = await fetch('/api/v1/users/profile');
            if (resp.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            if (!resp.ok) throw new Error(await resp.text());
            const user = await resp.json();
            result.innerHTML = renderProfile(user);
        } catch (err) {
            result.innerHTML = `<div class='error-message'>${err.message || 'Profil alınırken hata oluştu.'}</div>`;
        } finally {
            loading.style.display = 'none';
        }
    }

    function renderProfile(user) {
        let html = `<div class='profile-card'>`;
        if (user.picture) html += `<img class='profile-avatar' src='${escapeHtml(user.picture)}' alt='Profil Fotoğrafı'>`;
        html += `<div class='profile-name'>${escapeHtml(user.firstName || '')} ${escapeHtml(user.lastName || '')}</div>`;
        html += `<div class='profile-email'>${escapeHtml(user.email || '')}</div>`;
        html += `</div>`;
        return html;
    }

    // HTML escape
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}); 