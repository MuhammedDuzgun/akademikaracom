// Akademikara - Modern PDF Analiz & Atıf Bulucu

// HTML injection'a karşı güvenli metin için global fonksiyon
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Yıllara göre yayın/atıf tablosu fonksiyonu (GLOBAL)
function renderCountsByYearTable(counts) {
    if (!Array.isArray(counts) || counts.length === 0) {
        return `<div class='author-counts-table-wrap'><table class='author-counts-table'><thead><tr><th>Yıl</th><th>Yayın</th><th>Atıf</th></tr></thead><tbody><tr><td colspan='3' style='text-align:center;color:#888;'>Veri yok</td></tr></tbody></table></div>`;
    }
    let rows = counts.map(c => `<tr><td>${c.year}</td><td>${c.works_count}</td><td>${c.cited_by_count}</td></tr>`).join('');
    return `<div class='author-counts-table-wrap'><table class='author-counts-table'><thead><tr><th>Yıl</th><th>Yayın</th><th>Atıf</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

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
        const url = `https://api.openalex.org/works?filter=title_and_abstract.search:${encodeURIComponent(keyword)}&sort=cited_by_count:desc&per-page=5&select=id,title,authorships,publication_year,doi,cited_by_count,primary_location`;
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
            openalexResult.innerHTML = await renderOpenAlexResults(papersByKeyword);
            // Kaydet butonları için event listener'ları ekle
            await afterRenderPaperSearchResults();
            await afterRenderRemoveWorkBtns();
        } catch (err) {
            openalexResult.innerHTML = `<div class='error-message'>OpenAlex makaleleri alınırken hata oluştu: ${err.message}</div>`;
        }
    }

    async function renderOpenAlexResults(papersByKeyword) {
        // Giriş ve kaydedilen makaleler kontrolü
        const loggedIn = await isUserLoggedIn();
        const savedIds = loggedIn ? await getSavedWorkIds() : [];
        
        console.log('Literatür araştır - Giriş durumu:', loggedIn);
        console.log('Literatür araştır - Kaydedilen makale ID\'leri:', savedIds);
        
        const results = await Promise.all(papersByKeyword.map(async group => {
            const cards = await Promise.all(group.papers.map(p => renderPaperCardWithSave(p, savedIds, loggedIn)));
            return `
                <div class="keyword-group">
                    <h3>🔑 ${escapeHtml(group.keyword)}</h3>
                    <div class="papers-list">
                        ${cards.join('')}
                    </div>
                </div>
            `;
        }));
        
        return results.join('');
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

    // Yazar Ara
    const authorSearchForm = document.getElementById('author-search-form');
    const authorSearchInput = document.getElementById('author-search-input');
    const authorSearchResult = document.getElementById('author-search-result');
    const authorSearchLoading = document.getElementById('author-search-loading');
    const authorSearchError = document.getElementById('author-search-error');
    // Sayfalama değişkenleri
    let authorCurrentPage = 1;
    let authorTotalPages = 1;
    let authorTotalCount = 0;
    let authorLastQuery = '';
    let authorLastFilters = null;
    let authorLastSort = null;
    // Gelişmiş filtreler
    const authorCountryInput = document.getElementById('author-country');
    const authorOrcidInput = document.getElementById('author-orcid');
    const authorInstitutionInput = document.getElementById('author-institution');
    const authorCitedMinInput = document.getElementById('author-cited-min');
    const authorCitedMaxInput = document.getElementById('author-cited-max');
    const authorWorksMinInput = document.getElementById('author-works-min');
    const authorWorksMaxInput = document.getElementById('author-works-max');
    const authorHindexMinInput = document.getElementById('author-hindex-min');
    const authorHindexMaxInput = document.getElementById('author-hindex-max');
    const authorI10MinInput = document.getElementById('author-i10-min');
    const authorI10MaxInput = document.getElementById('author-i10-max');
    const authorConceptInput = document.getElementById('author-concept');
    const authorHasOrcidInput = document.getElementById('author-has-orcid');
    const authorSortInput = document.getElementById('author-sort');
    
    // Debug: Elementlerin bulunup bulunmadığını kontrol et
    console.log('Yazar filtre elementleri:', {
        authorCountryInput: !!authorCountryInput,
        authorOrcidInput: !!authorOrcidInput,
        authorInstitutionInput: !!authorInstitutionInput,
        authorCitedMinInput: !!authorCitedMinInput,
        authorCitedMaxInput: !!authorCitedMaxInput,
        authorWorksMinInput: !!authorWorksMinInput,
        authorWorksMaxInput: !!authorWorksMaxInput,
        authorHindexMinInput: !!authorHindexMinInput,
        authorHindexMaxInput: !!authorHindexMaxInput,
        authorI10MinInput: !!authorI10MinInput,
        authorI10MaxInput: !!authorI10MaxInput,
        authorConceptInput: !!authorConceptInput,
        authorHasOrcidInput: !!authorHasOrcidInput,
        authorSortInput: !!authorSortInput
    });

    function collectAuthorFilters() {
        const filters = [];
        
        // Ülke kodu - sadece geçerli değerler ekle
        if (authorCountryInput && authorCountryInput.value.trim()) {
            const countryCode = authorCountryInput.value.trim().toUpperCase();
            if (countryCode.length === 2) {
                filters.push(`last_known_institutions.country_code:${countryCode}`);
            }
        }
        
        // Kurum adı (OpenAlex institution search)
        if (authorInstitutionInput && authorInstitutionInput.value.trim()) {
            // Eğer autocomplete ile data-id atanmışsa, id ile filtrele, yoksa isimle arama
            const instId = authorInstitutionInput.getAttribute('data-id');
            if (instId && instId.startsWith('https://openalex.org/I')) {
                filters.push(`last_known_institutions.id:${instId}`);
            } else {
                // isimle arama desteği (OpenAlex API'de tam destek yok, ama raw_institution_name.search ile deneyelim)
                filters.push(`raw_institution_name.search:${authorInstitutionInput.value.trim()}`);
            }
        }
        
        // ORCID - dökümantasyona göre tam URL veya ID formatı
        if (authorOrcidInput && authorOrcidInput.value.trim()) {
            const orcid = authorOrcidInput.value.trim();
            // ORCID ID formatı: https://orcid.org/0000-0001-2345-6789
            if (orcid.includes('orcid.org/')) {
                filters.push(`orcid:${orcid}`);
            } else if (orcid.match(/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/)) {
                // Sadece ID formatı ise tam URL'ye çevir
                filters.push(`orcid:https://orcid.org/${orcid}`);
            }
        }
        
        // Atıf sayısı aralığı - OpenAlex API range query formatı
        const minCited = authorCitedMinInput && authorCitedMinInput.value.trim() ? parseInt(authorCitedMinInput.value.trim()) : null;
        const maxCited = authorCitedMaxInput && authorCitedMaxInput.value.trim() ? parseInt(authorCitedMaxInput.value.trim()) : null;
        
        if (minCited !== null && maxCited !== null && !isNaN(minCited) && !isNaN(maxCited) && minCited >= 0 && maxCited >= 0) {
            // Hem min hem max varsa: min-max formatı
            filters.push(`cited_by_count:${minCited}-${maxCited}`);
        } else if (minCited !== null && !isNaN(minCited) && minCited >= 0) {
            // Sadece min varsa: min- formatı
            filters.push(`cited_by_count:${minCited}-`);
        } else if (maxCited !== null && !isNaN(maxCited) && maxCited >= 0) {
            // Sadece max varsa: -max formatı
            filters.push(`cited_by_count:-${maxCited}`);
        }
        
        // Yayın sayısı aralığı - OpenAlex API range query formatı
        const minWorks = authorWorksMinInput && authorWorksMinInput.value.trim() ? parseInt(authorWorksMinInput.value.trim()) : null;
        const maxWorks = authorWorksMaxInput && authorWorksMaxInput.value.trim() ? parseInt(authorWorksMaxInput.value.trim()) : null;
        
        if (minWorks !== null && maxWorks !== null && !isNaN(minWorks) && !isNaN(maxWorks) && minWorks >= 0 && maxWorks >= 0) {
            filters.push(`works_count:${minWorks}-${maxWorks}`);
        } else if (minWorks !== null && !isNaN(minWorks) && minWorks >= 0) {
            filters.push(`works_count:${minWorks}-`);
        } else if (maxWorks !== null && !isNaN(maxWorks) && maxWorks >= 0) {
            filters.push(`works_count:-${maxWorks}`);
        }
        
        // h-index aralığı - OpenAlex API range query formatı
        const minHindex = authorHindexMinInput && authorHindexMinInput.value.trim() ? parseInt(authorHindexMinInput.value.trim()) : null;
        const maxHindex = authorHindexMaxInput && authorHindexMaxInput.value.trim() ? parseInt(authorHindexMaxInput.value.trim()) : null;
        
        if (minHindex !== null && maxHindex !== null && !isNaN(minHindex) && !isNaN(maxHindex) && minHindex >= 0 && maxHindex >= 0) {
            filters.push(`summary_stats.h_index:${minHindex}-${maxHindex}`);
        } else if (minHindex !== null && !isNaN(minHindex) && minHindex >= 0) {
            filters.push(`summary_stats.h_index:${minHindex}-`);
        } else if (maxHindex !== null && !isNaN(maxHindex) && maxHindex >= 0) {
            filters.push(`summary_stats.h_index:-${maxHindex}`);
        }
        
        // i10-index aralığı - OpenAlex API range query formatı
        const minI10 = authorI10MinInput && authorI10MinInput.value.trim() ? parseInt(authorI10MinInput.value.trim()) : null;
        const maxI10 = authorI10MaxInput && authorI10MaxInput.value.trim() ? parseInt(authorI10MaxInput.value.trim()) : null;
        
        if (minI10 !== null && maxI10 !== null && !isNaN(minI10) && !isNaN(maxI10) && minI10 >= 0 && maxI10 >= 0) {
            filters.push(`summary_stats.i10_index:${minI10}-${maxI10}`);
        } else if (minI10 !== null && !isNaN(minI10) && minI10 >= 0) {
            filters.push(`summary_stats.i10_index:${minI10}-`);
        } else if (maxI10 !== null && !isNaN(maxI10) && maxI10 >= 0) {
            filters.push(`summary_stats.i10_index:-${maxI10}`);
        }
        
        // Alan ID - dökümantasyona göre concepts.id kullan
        if (authorConceptInput && authorConceptInput.value.trim()) {
            const conceptId = authorConceptInput.value.trim();
            // OpenAlex concept ID formatı: C41008148
            if (conceptId.match(/^C\d+$/)) {
                filters.push(`concepts.id:${conceptId}`);
            }
        }
        
        // ORCID durumu - dökümantasyona göre boolean değer
        if (authorHasOrcidInput && authorHasOrcidInput.value !== '') {
            const hasOrcid = authorHasOrcidInput.value;
            if (hasOrcid === 'true' || hasOrcid === 'false') {
                filters.push(`has_orcid:${hasOrcid}`);
            }
        }
        
        console.log('Toplanan yazar filtreleri:', filters);
        console.log('Filtre değerleri:', {
            country: authorCountryInput?.value,
            orcid: authorOrcidInput?.value,
            institution: authorInstitutionInput?.value,
            citedMin: authorCitedMinInput?.value,
            citedMax: authorCitedMaxInput?.value,
            worksMin: authorWorksMinInput?.value,
            worksMax: authorWorksMaxInput?.value,
            hindexMin: authorHindexMinInput?.value,
            hindexMax: authorHindexMaxInput?.value,
            i10Min: authorI10MinInput?.value,
            i10Max: authorI10MaxInput?.value,
            concept: authorConceptInput?.value,
            hasOrcid: authorHasOrcidInput?.value,
            sort: authorSortInput?.value
        });
        console.log('Filtre string formatı:', filters.join(','));
        return filters;
    }

    function buildOpenAlexAuthorUrl(query, filters, sort, page = 1) {
        // per_page=12 olacak şekilde güncellendi
        let url = `https://api.openalex.org/authors?search=${encodeURIComponent(query)}&per_page=12&page=${page}&select=id,display_name,display_name_alternatives,orcid,works_count,cited_by_count,summary_stats,last_known_institutions,affiliations,x_concepts,ids,works_api_url,counts_by_year`;
        
        if (filters && filters.length > 0) {
            // Tüm filtreleri tek bir filter parametresinde birleştir
            const filterString = filters.join(',');
            url += `&filter=${filterString}`;
            console.log('Filtreler:', filters);
            console.log('Filtre string:', filterString);
        }
        
        if (sort && sort !== 'relevance') {
            url += `&sort=${sort}`;
            console.log('Sıralama:', sort);
        }
        
        console.log('Oluşturulan URL:', url);
        return url;
    }

    if (authorSearchForm) {
        authorSearchForm.addEventListener('submit', async (e) => {
            lastAuthorSearchSubmit = Date.now();
            e.preventDefault();
            if (!authorSearchInput.value.trim()) return;
            authorSearchError.textContent = '';
            authorSearchResult.innerHTML = '';
            // Filtreleri topla
            const filters = collectAuthorFilters();
            const sort = authorSortInput && authorSortInput.value ? authorSortInput.value : undefined;
            authorCurrentPage = 1;
            authorLastQuery = authorSearchInput.value.trim();
            authorLastFilters = filters;
            authorLastSort = sort;
            await fetchAndRenderAuthors(authorLastQuery, authorLastFilters, authorLastSort, authorCurrentPage);
        });
    }

    function renderAuthorPagination(current, total) {
        if (total <= 1) return '';
        let html = `<div class='paper-pagination'>`;
        if (current > 1) {
            html += `<button class='pagination-btn' data-page='${current - 1}'>&laquo; Önceki</button>`;
        }
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || Math.abs(i - current) <= 2) {
                html += `<button class='pagination-btn${i === current ? ' active' : ''}' data-page='${i}'>${i}</button>`;
            } else if (i === current - 3 || i === current + 3) {
                html += `<span class='pagination-ellipsis'>...</span>`;
            }
        }
        if (current < total) {
            html += `<button class='pagination-btn' data-page='${current + 1}'>Sonraki &raquo;</button>`;
        }
        html += `</div>`;
        return html;
    }

    async function fetchAndRenderAuthors(query, filters, sort, page) {
        authorSearchLoading.style.display = 'block';
        try {
            const url = buildOpenAlexAuthorUrl(query, filters, sort, page);
            console.log('API çağrısı yapılıyor:', url);
            const resp = await fetch(url);
            console.log('API yanıt durumu:', resp.status, resp.statusText);
            if (!resp.ok) {
                const errorText = await resp.text();
                console.error('API hata detayı:', errorText);
                throw new Error(`OpenAlex API hatası (${resp.status}): ${errorText}`);
            }
            const data = await resp.json();
            console.log('API yanıt verisi:', data);
            authorTotalCount = data.meta && data.meta.count ? data.meta.count : 0;
            authorTotalPages = Math.ceil(authorTotalCount / 12); // 12'ye güncellendi
            if (!data.results || data.results.length === 0) {
                authorSearchResult.innerHTML = '<div class="error-message">Yazar bulunamadı.</div>';
            } else {
                let paginationHtml = renderAuthorPagination(page, authorTotalPages);
                authorSearchResult.innerHTML =
                    paginationHtml +
                    renderAuthorSearchResults(data.results) +
                    paginationHtml;
            }
        } catch (err) {
            console.error('Yazar arama hatası:', err);
            let msg = err.message || '';
            if (msg.includes('raw_institution_name.search is not a valid field') || msg.includes('Invalid query parameters error')) {
                authorSearchResult.innerHTML = `<div class='error-message'>Kurum adı ile serbest metin araması desteklenmiyor, lütfen kurum adını listeden seçin.</div>`;
            } else {
                authorSearchResult.innerHTML = `<div class='error-message'>Yazarlar alınırken hata oluştu: ${msg}</div>`;
            }
        } finally {
            authorSearchLoading.style.display = 'none';
        }
    }

    function renderAuthorSearchResults(authors) {
        const count = authorTotalCount || (authors && authors.length ? authors.length : 0);
        const countHtml = `<span><b>${count}</b></span> <span>yazar bulundu</span>`;
        // Sonuç sayısını arama barının sağına yaz
        const countDiv = document.getElementById('author-search-result-count');
        if (countDiv) {
            if (authors && authors.length > 0) {
                countDiv.innerHTML = countHtml;
                countDiv.style.display = '';
            } else {
                countDiv.innerHTML = '';
                countDiv.style.display = 'none';
            }
        }
        if (!authors || authors.length === 0) {
            return `<div class="error-message">Yazar bulunamadı.</div>`;
        }
        return `<div class='papers-list'>${authors.map(renderAuthorCard).join('')}</div>`;
    }

    function renderAuthorCard(author) {
        const orcid = author.orcid ? `<a href='${author.orcid}' target='_blank' title='ORCID'><span style='font-size:1.1em;'>🆔</span> ORCID</a>` : '';
        const works = typeof author.works_count === 'number' && author.works_count > 0 ? `<a href="#" class="author-works-link" data-author-id="${author.id}" data-works-url="${author.works_api_url}">Tüm Yayınlar (${author.works_count})</a>` : '';
        const cited = typeof author.cited_by_count === 'number' ? `<span title='Toplam Atıf'>⭐ ${author.cited_by_count}</span>` : '';
        const hindex = author.summary_stats && typeof author.summary_stats.h_index === 'number' ? `<span title='h-index'>h-index: ${author.summary_stats.h_index}</span>` : '';
        const i10 = author.summary_stats && typeof author.summary_stats.i10_index === 'number' ? `<span title='i10-index'>i10: ${author.summary_stats.i10_index}</span>` : '';
        const meanCited = author.summary_stats && typeof author.summary_stats['2yr_mean_citedness'] === 'number' ? `<span title='2 Yıllık Ortalama Atıf'>2Y Atıf Ort: ${author.summary_stats['2yr_mean_citedness'].toFixed(2)}</span>` : '';
        const insts = (author.last_known_institutions || []).map(i => escapeHtml(i.display_name)).join(', ');
        const affiliations = (author.affiliations || []).map(a => {
            const years = a.years && a.years.length > 0 ? ` (${a.years[0]}-${a.years[a.years.length-1]})` : '';
            return a.institution && a.institution.display_name ? `${escapeHtml(a.institution.display_name)}${years}` : '';
        }).filter(Boolean).join(', ');
        // Alanlar (x_concepts) sade ve tek satırda, max 3 göster, fazlası için +N alan badge
        let concepts = '';
        if (author.x_concepts && author.x_concepts.length > 0) {
            const shown = author.x_concepts.slice(0, 3).map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`);
            const more = author.x_concepts.length > 3 ? `<span class='concept-badge concept-badge-more'>+${author.x_concepts.length - 3} alan</span>` : '';
            concepts = shown.join(' ') + more;
        }
        const ids = author.ids || {};
        const scopus = ids.scopus ? `<a href='${ids.scopus}' target='_blank' title='Scopus'><span style='font-size:1.1em;'>🔗</span> Scopus</a>` : '';
        const twitter = ids.twitter ? `<a href='https://twitter.com/${ids.twitter}' target='_blank' title='Twitter'><span style='font-size:1.1em;'>🐦</span> Twitter</a>` : '';
        const wikipedia = ids.wikipedia ? `<a href='${ids.wikipedia}' target='_blank' title='Wikipedia'><span style='font-size:1.1em;'>📖</span> Wikipedia</a>` : '';
        const altNames = (author.display_name_alternatives || []).length > 0 ? `<div class='author-alt-names'><strong>Alternatif İsimler:</strong> ${author.display_name_alternatives.map(escapeHtml).join(', ')}</div>` : '';
        return `
            <div class="paper-card author-card">
                <div class="paper-title"><a href="#" class="author-detail-link" data-author-id="${author.id}">${escapeHtml(author.display_name)}</a></div>
                ${altNames}
                <div class="paper-meta">
                    ${orcid}
                    ${works}
                    ${cited}
                    ${hindex}
                    ${i10}
                    ${meanCited}
                    ${scopus}
                    ${twitter}
                    ${wikipedia}
                </div>
                ${insts ? `<div class='paper-meta'><span>🏢 Son Kurum: ${insts}</span></div>` : ''}
                ${concepts ? `<div class='author-concepts-row'>${concepts}</div>` : ''}
            </div>
        `;
    }

    // Kurum Ara
    const institutionSearchForm = document.getElementById('institution-search-form');
    const institutionSearchInput = document.getElementById('institution-search-input');
    const institutionSearchResult = document.getElementById('institution-search-result');
    const institutionSearchLoading = document.getElementById('institution-search-loading');
    const institutionSearchError = document.getElementById('institution-search-error');
    // Sayfalama değişkenleri
    let institutionCurrentPage = 1;
    let institutionTotalPages = 1;
    let institutionTotalCount = 0;
    let institutionLastQuery = '';

    // --- AUTOCOMPLETE (KURUM) ---
    let institutionAutocompleteBox;
    let institutionAutocompleteResults = [];
    let institutionAutocompleteSelected = -1;

    function createInstitutionAutocompleteBox() {
        if (!institutionAutocompleteBox) {
            institutionAutocompleteBox = document.createElement('div');
            institutionAutocompleteBox.className = 'autocomplete-box';
            institutionAutocompleteBox.style.position = 'absolute';
            institutionAutocompleteBox.style.zIndex = 1000;
            institutionAutocompleteBox.style.minWidth = institutionSearchInput.offsetWidth + 'px';
            institutionSearchInput.parentNode.appendChild(institutionAutocompleteBox);
        }
        institutionAutocompleteBox.innerHTML = '';
        institutionAutocompleteBox.style.display = 'none';
    }

    function positionInstitutionAutocompleteBox() {
        if (!institutionAutocompleteBox) return;
        institutionAutocompleteBox.style.top = (institutionSearchInput.offsetTop + institutionSearchInput.offsetHeight) + 'px';
        institutionAutocompleteBox.style.left = institutionSearchInput.offsetLeft + 'px';
        institutionAutocompleteBox.style.minWidth = institutionSearchInput.offsetWidth + 'px';
    }

    async function fetchInstitutionAutocomplete(query) {
        const url = `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(query)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.results || [];
    }

    function renderInstitutionAutocomplete(results) {
        if (!institutionAutocompleteBox) createInstitutionAutocompleteBox();
        if (!results || results.length === 0) {
            institutionAutocompleteBox.style.display = 'none';
            return;
        }
        institutionAutocompleteBox.innerHTML = results.map((item, idx) => `
            <div class='autocomplete-item${idx === institutionAutocompleteSelected ? ' selected' : ''}' data-idx='${idx}'>
                <span class='autocomplete-name'>${escapeHtml(item.display_name)}</span>
                ${item.hint ? `<span class='autocomplete-hint'>${escapeHtml(item.hint)}</span>` : ''}
            </div>
        `).join('');
        institutionAutocompleteBox.style.display = 'block';
        positionInstitutionAutocompleteBox();
    }

    function clearInstitutionAutocomplete() {
        if (institutionAutocompleteBox) {
            institutionAutocompleteBox.innerHTML = '';
            institutionAutocompleteBox.style.display = 'none';
        }
        institutionAutocompleteResults = [];
        institutionAutocompleteSelected = -1;
    }

    if (institutionSearchInput) {
        createInstitutionAutocompleteBox();
        institutionSearchInput.addEventListener('input', async function(e) {
            const val = institutionSearchInput.value.trim();
            if (val.length < 2) {
                clearInstitutionAutocomplete();
                return;
            }
            try {
                const results = await fetchInstitutionAutocomplete(val);
                institutionAutocompleteResults = results;
                institutionAutocompleteSelected = -1;
                renderInstitutionAutocomplete(results);
            } catch {
                clearInstitutionAutocomplete();
            }
        });
        institutionSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                clearInstitutionAutocomplete();
            }
            if (!institutionAutocompleteResults.length || !institutionAutocompleteBox || institutionAutocompleteBox.style.display === 'none') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                institutionAutocompleteSelected = (institutionAutocompleteSelected + 1) % institutionAutocompleteResults.length;
                renderInstitutionAutocomplete(institutionAutocompleteResults);
                // Otomatik kaydırma
                const items = institutionAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[institutionAutocompleteSelected]) {
                    items[institutionAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                institutionAutocompleteSelected = (institutionAutocompleteSelected - 1 + institutionAutocompleteResults.length) % institutionAutocompleteResults.length;
                renderInstitutionAutocomplete(institutionAutocompleteResults);
                // Otomatik kaydırma
                const items = institutionAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[institutionAutocompleteSelected]) {
                    items[institutionAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Enter') {
                if (institutionAutocompleteSelected >= 0 && institutionAutocompleteResults[institutionAutocompleteSelected]) {
                    e.preventDefault();
                    institutionSearchInput.value = institutionAutocompleteResults[institutionAutocompleteSelected].display_name;
                    if (institutionSearchForm) institutionSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            } else if (e.key === 'Escape') {
                clearInstitutionAutocomplete();
            }
        });
        document.addEventListener('click', function(e) {
            if (e.target !== institutionSearchInput && (!institutionAutocompleteBox || !institutionAutocompleteBox.contains(e.target))) {
                clearInstitutionAutocomplete();
            }
        });
        institutionAutocompleteBox.addEventListener('mousedown', function(e) {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const idx = parseInt(item.getAttribute('data-idx'), 10);
                if (institutionAutocompleteResults[idx]) {
                    institutionSearchInput.value = institutionAutocompleteResults[idx].display_name;
                    clearInstitutionAutocomplete();
                    if (institutionSearchForm) institutionSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        });
    }

    if (institutionSearchForm) {
        institutionSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            institutionSearchError.textContent = '';
            institutionSearchResult.innerHTML = '';
            const query = institutionSearchInput.value.trim();
            if (!query) {
                institutionSearchError.textContent = 'Kurum adı zorunludur.';
                return;
            }
            institutionCurrentPage = 1;
            institutionLastQuery = query;
            await fetchAndRenderInstitutions(query, institutionCurrentPage);
        });
    }

    function renderInstitutionPagination(current, total) {
        if (total <= 1) return '';
        let html = `<div class='paper-pagination'>`;
        if (current > 1) {
            html += `<button class='pagination-btn' data-institution-page='${current - 1}'>&laquo; Önceki</button>`;
        }
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || Math.abs(i - current) <= 2) {
                html += `<button class='pagination-btn${i === current ? ' active' : ''}' data-institution-page='${i}'>${i}</button>`;
            } else if (i === current - 3 || i === current + 3) {
                html += `<span class='pagination-ellipsis'>...</span>`;
            }
        }
        if (current < total) {
            html += `<button class='pagination-btn' data-institution-page='${current + 1}'>Sonraki &raquo;</button>`;
        }
        html += `</div>`;
        return html;
    }

    async function fetchAndRenderInstitutions(query, page) {
        institutionSearchLoading.style.display = 'block';
        try {
            const url = `https://api.openalex.org/institutions?search=${encodeURIComponent(query)}&per_page=12&page=${page}&select=id,display_name,ror,country_code,type,works_count,cited_by_count,summary_stats,x_concepts,roles,repositories,works_api_url,lineage,updated_date,ids,image_thumbnail_url`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('OpenAlex API hatası');
            const data = await resp.json();
            institutionTotalCount = data.meta && data.meta.count ? data.meta.count : 0;
            institutionTotalPages = Math.ceil(institutionTotalCount / 12);
            if (!data.results || data.results.length === 0) {
                institutionSearchResult.innerHTML = '<div class="error-message">Kurum bulunamadı.</div>';
            } else {
                let paginationHtml = renderInstitutionPagination(page, institutionTotalPages);
                institutionSearchResult.innerHTML =
                    paginationHtml +
                    await renderInstitutionSearchResults(data.results) +
                    paginationHtml;
                await afterRenderInstitutionSearchResults();
            }
        } catch (err) {
            institutionSearchResult.innerHTML = `<div class='error-message'>Kurumlar alınırken hata oluştu: ${err.message}</div>`;
        } finally {
            institutionSearchLoading.style.display = 'none';
        }
    }

    // Sayfa değişimi için event delegation
    // (makale/yazar aramadaki gibi, ama data-institution-page ile)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('pagination-btn') && e.target.hasAttribute('data-institution-page')) {
            const page = parseInt(e.target.getAttribute('data-institution-page'), 10);
            if (!isNaN(page) && page !== institutionCurrentPage && institutionLastQuery) {
                institutionCurrentPage = page;
                fetchAndRenderInstitutions(institutionLastQuery, institutionCurrentPage);
            }
        }
    });

    async function renderInstitutionSearchResults(institutions) {
        const count = institutionTotalCount || (institutions && institutions.length ? institutions.length : 0);
        const countHtml = `<div class='search-result-count'><span><b>${count}</b></span> <span>kurum bulundu</span></div>`;
        const countDiv = document.getElementById('institution-search-result-count');
        if (countDiv) {
            if (institutions && institutions.length > 0) {
                countDiv.innerHTML = countHtml;
                countDiv.style.display = '';
            } else {
                countDiv.innerHTML = '';
                countDiv.style.display = 'none';
            }
        }
        if (!institutions || institutions.length === 0) {
            return `<div class="error-message">Kurum bulunamadı.</div>`;
        }
        
        // Kullanıcının giriş durumunu ve kaydedilen kurumları kontrol et
        const loggedIn = await isUserLoggedIn();
        const savedIds = loggedIn ? await getSavedInstitutionIds() : [];
        
        // Kurum kartlarını kaydetme butonları ile render et
        const cards = await Promise.all(institutions.map(inst => renderInstitutionCardWithSave(inst, savedIds, loggedIn)));
        return `<div class='papers-list'>${cards.join('')}</div>`;
    }

    function renderInstitutionCard(inst) {
        const country = inst.country_code ? `<span class='institution-meta-badge' title='Ülke'>🌍 Ülke: ${inst.country_code.toUpperCase()}</span>` : '';
        const type = inst.type ? `<span class='institution-meta-badge' title='Tür'>🏷️ Tür: ${escapeHtml(inst.type)}</span>` : '';
        const city = inst.city ? `<span class='institution-meta-badge' title='Şehir'>🏙️ Şehir: ${escapeHtml(inst.city)}</span>` : '';
        const region = inst.region ? `<span class='institution-meta-badge' title='Bölge'>🗺️ Bölge: ${escapeHtml(inst.region)}</span>` : '';
        const cited = typeof inst.cited_by_count === 'number' ? `<span class='institution-meta-badge' title='Toplam Atıf'>⭐ Toplam Atıf: ${inst.cited_by_count.toLocaleString()}</span>` : '';
        // h-index, i10-index, 2Y atıf ortalaması
        const hindex = inst.summary_stats && typeof inst.summary_stats.h_index === 'number' ? `<span class='institution-meta-badge' title='h-index'>h-index: ${inst.summary_stats.h_index}</span>` : '';
        const i10 = inst.summary_stats && typeof inst.summary_stats.i10_index === 'number' ? `<span class='institution-meta-badge' title='i10-index'>i10: ${inst.summary_stats.i10_index}</span>` : '';
        const meanCited = inst.summary_stats && typeof inst.summary_stats['2yr_mean_citedness'] === 'number' ? `<span class='institution-meta-badge' title='2 Yıllık Ortalama Atıf'>2Y Atıf Ort: ${inst.summary_stats['2yr_mean_citedness'].toFixed(2)}</span>` : '';
        // Alanlar (x_concepts)
        let concepts = '';
        if (inst.x_concepts && inst.x_concepts.length > 0) {
            const shown = inst.x_concepts.slice(0, 3).map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`);
            const more = inst.x_concepts.length > 3 ? `<span class='concept-badge concept-badge-more'>+${inst.x_concepts.length - 3} alan</span>` : '';
            concepts = shown.join(' ') + more;
        }
        // Wikipedia, Wikidata, ROR linkleri (ikon + metin)
        const ids = inst.ids || {};
        const wikipedia = ids.wikipedia ? `<a href='${ids.wikipedia}' target='_blank' title='Wikipedia' class='institution-link'><span style='font-size:1.1em;'>📖</span> Wikipedia</a>` : '';
        const wikidata = ids.wikidata ? `<a href='${ids.wikidata}' target='_blank' title='Wikidata' class='institution-link'><span style='font-size:1.1em;'>🗃️</span> Wikidata</a>` : '';
        const ror = inst.ror ? `<a href='${inst.ror}' target='_blank' title='ROR' class='institution-link'><span style='font-size:1.1em;'>🏢</span> ROR</a>` : '';
        // Roller (en çok yayına sahip ilk rol)
        let topRole = '';
        if (Array.isArray(inst.roles) && inst.roles.length > 0) {
            const sortedRoles = inst.roles.slice().sort((a, b) => (b.works_count || 0) - (a.works_count || 0));
            const role = sortedRoles[0];
            if (role && role.role) {
                topRole = `<span class='institution-meta-badge' title='Rol'>Rol: ${escapeHtml(role.role)} (${role.works_count})</span>`;
            }
        }
        const image = inst.image_thumbnail_url ? `<img src='${inst.image_thumbnail_url}' alt='Kurum Logosu' class='institution-logo' style='width:48px;height:48px;border-radius:50%;margin-bottom:0.7em;'>` : '';
        // Tüm Yayınlar butonu (yazar kartındaki gibi)
        const allWorksBtn = typeof inst.works_count === 'number' && inst.works_count > 0 && inst.works_api_url ? `<button class="btn-primary institution-works-btn" data-institution-id="${inst.id}" data-works-url="${inst.works_api_url}" data-initial-count="${inst.works_count}">Tüm Yayınlar (${inst.works_count})</button>` : '';
        return `
            <div class="paper-card institution-card" data-institution-id="${inst.id}">
                ${image}
                <div class="paper-title"><a href="#" class="institution-detail-link" data-institution-id="${inst.id}">${escapeHtml(inst.display_name)}</a></div>
                <div class="paper-meta">
                    ${country}
                    ${type}
                    ${city}
                    ${region}
                    ${topRole}
                </div>
                <div class="paper-meta">
                    ${concepts}
                </div>
                <div class="paper-meta">
                    ${hindex}
                    ${i10}
                    ${meanCited}
                </div>
                <div class="paper-meta">
                    ${cited}
                    ${wikipedia}
                    ${wikidata}
                    ${ror}
                </div>
                <div class="paper-meta" style="margin-top:0.7em;">
                    ${allWorksBtn}
                </div>
            </div>
        `;
    }

    // Makale Ara - Arama butonu ve otomatik arama
    const paperSearchForm = document.getElementById('paper-search-form');
    const paperSearchInput = document.getElementById('paper-search-input');
    const paperSearchResult = document.getElementById('paper-search-result');
    const paperSearchLoading = document.getElementById('paper-search-loading');
    const paperSearchError = document.getElementById('paper-search-error');
    let paperCurrentPage = 1;
    let paperTotalPages = 1;
    let paperTotalCount = 0;
    let paperLastQuery = '';
    let paperLastFilters = null;

    function renderPaperPagination(current, total) {
        if (total <= 1) return '';
        let html = `<div class='paper-pagination'>`;
        if (current > 1) {
            html += `<button class='pagination-btn' data-page='${current - 1}'>&laquo; Önceki</button>`;
        }
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || Math.abs(i - current) <= 2) {
                html += `<button class='pagination-btn${i === current ? ' active' : ''}' data-page='${i}'>${i}</button>`;
            } else if (i === current - 3 || i === current + 3) {
                html += `<span class='pagination-ellipsis'>...</span>`;
            }
        }
        if (current < total) {
            html += `<button class='pagination-btn' data-page='${current + 1}'>Sonraki &raquo;</button>`;
        }
        html += `</div>`;
        return html;
    }

    function buildOpenAlexUrlWithPage(query, filters, page) {
        let url = buildOpenAlexUrl(query, filters);
        url = url.replace(/&per_page=\d+/, `&per_page=12`);
        if (url.includes('&page=')) {
            url = url.replace(/&page=\d+/, `&page=${page}`);
        } else {
            url += `&page=${page}`;
        }
        return url;
    }

    if (paperSearchForm) {
        paperSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!paperSearchInput.value.trim()) return;
            if (paperSearchError) paperSearchError.textContent = '';
            // Kurum adı autocomplete ile seçilmezse arama yapılmasın, uyarı gösterilsin
            const institutionInput = document.getElementById('institution-name');
            if (institutionInput && institutionInput.value.trim() && !institutionInput.getAttribute('data-id')) {
                paperSearchError.textContent = 'Kurum adı ile serbest metin araması desteklenmiyor, lütfen kurum adını listeden seçin.';
                // Sonuçları ve sayaçları temizle
                const paperSearchResultDiv = document.getElementById('paper-search-result');
                if (paperSearchResultDiv) paperSearchResultDiv.innerHTML = '';
                const searchResultCountDiv = document.getElementById('search-result-count');
                if (searchResultCountDiv) searchResultCountDiv.innerHTML = '';
                return;
            }
            // Filtreleri topla
            const filters = collectFilters();
            paperCurrentPage = 1;
            paperLastQuery = paperSearchInput.value.trim();
            paperLastFilters = filters;
            await fetchAndRenderPapers(paperLastQuery, paperLastFilters, paperCurrentPage);
        });
    }

    async function fetchAndRenderPapers(query, filters, page) {
        paperSearchLoading.style.display = 'block';
        try {
            let url = buildOpenAlexUrlWithPage(query, filters, page);
            const resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'akademikara-app/1.0'
                }
            });
            if (!resp.ok) throw new Error(await resp.text());
            const data = await resp.json();
            paperTotalCount = data.meta && data.meta.count ? data.meta.count : 0;
            paperTotalPages = Math.ceil(paperTotalCount / 12);
            if (!data.results || data.results.length === 0) {
                paperSearchResult.innerHTML = '<div class="error-message">Makale bulunamadı.</div>';
            } else {
                let paginationHtml = renderPaperPagination(page, paperTotalPages);
                paperSearchResult.innerHTML =
                    paginationHtml +
                    await renderPaperSearchResults(data.results) +
                    paginationHtml;
                await afterRenderPaperSearchResults();
            }
        } catch (err) {
            let msg = err.message || '';
            if (
                msg.includes('raw_institution_name.search is not a valid field') ||
                msg.includes('Invalid query parameters error')
            ) {
                if (paperSearchError) paperSearchError.textContent = 'Kurum adı ile serbest metin araması desteklenmiyor, lütfen kurum adını listeden seçin.';
                return;
            }
        } finally {
            paperSearchLoading.style.display = 'none';
        }
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('pagination-btn')) {
            const page = parseInt(e.target.getAttribute('data-page'), 10);
            if (!isNaN(page)) {
                // Makale arama sayfalama
                if (page !== paperCurrentPage && paperLastQuery) {
                    paperCurrentPage = page;
                    fetchAndRenderPapers(paperLastQuery, paperLastFilters, paperCurrentPage);
                }
                // Yazar arama sayfalama
                if (page !== authorCurrentPage && authorLastQuery) {
                    authorCurrentPage = page;
                    fetchAndRenderAuthors(authorLastQuery, authorLastFilters, authorLastSort, authorCurrentPage);
                }
            }
        }
    });
    // Otomatik arama tetikleyici
    let lastAuthorSearchSubmit = 0;
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    function triggerAutoSearch(e) {
        // Son 500ms içinde submit olduysa tekrar tetikleme
        if (Date.now() - lastAuthorSearchSubmit < 500) return;
        if (paperSearchInput && paperSearchInput.value.trim().length > 0) {
            paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
        if (authorSearchInput && authorSearchInput.value.trim().length > 0) {
            authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    }
    const debouncedAutoSearch = debounce(triggerAutoSearch, 400);
    const autoSearchInputs = document.querySelectorAll('.auto-search');
    autoSearchInputs.forEach(el => {
        el.addEventListener('input', debouncedAutoSearch);
        el.addEventListener('change', debouncedAutoSearch);
    });
    // Form submit edildiğinde zaman damgası bırak
    if (authorSearchForm) {
        authorSearchForm.addEventListener('submit', async (e) => {
            lastAuthorSearchSubmit = Date.now();
            e.preventDefault();
            if (!authorSearchInput.value.trim()) return;
            authorSearchError.textContent = '';
            authorSearchResult.innerHTML = '';
            // Filtreleri topla
            const filters = collectAuthorFilters();
            const sort = authorSortInput && authorSortInput.value ? authorSortInput.value : undefined;
            authorCurrentPage = 1;
            authorLastQuery = authorSearchInput.value.trim();
            authorLastFilters = filters;
            authorLastSort = sort;
            await fetchAndRenderAuthors(authorLastQuery, authorLastFilters, authorLastSort, authorCurrentPage);
        });
    }

    // OpenAlex URL'ini oluşturan fonksiyon
    function buildOpenAlexUrl(query, filters) {
        // Sonuç sayısı seçicisini al
        const resultCountEl = document.getElementById('result-count');
        let perPage = 10;
        if (resultCountEl && resultCountEl.value) {
            perPage = parseInt(resultCountEl.value, 10);
            if (![10,20,50,100].includes(perPage)) perPage = 10;
        }
        let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${perPage}`;
        
        // CORS proxy kullan (gerekirse)
        const useProxy = false; // CORS sorunu olursa true yap
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        
        if (useProxy) {
            url = proxyUrl + url;
        }
        
        // Filtreleri topla
        const filterList = [];
        
        console.log('Building URL with filters:', filters);
        
        // Yayın yılı filtreleri
        if (filters.fromPublicationDate) {
            filterList.push(`from_publication_date:${filters.fromPublicationDate}`);
            console.log('Added from_publication_date filter:', filters.fromPublicationDate);
        }
        if (filters.toPublicationDate) {
            filterList.push(`to_publication_date:${filters.toPublicationDate}`);
            console.log('Added to_publication_date filter:', filters.toPublicationDate);
        }
        
        // Makale türü - OpenAlex API'de doğru değerler
        if (filters.workType) {
            filterList.push(`type:${filters.workType}`);
            console.log('Added type filter:', filters.workType);
        }
        
        // Dil
        if (filters.language) {
            filterList.push(`language:${filters.language}`);
            console.log('Added language filter:', filters.language);
        }
        
        // Açık erişim
        if (filters.isOa !== undefined && filters.isOa !== '') {
            filterList.push(`is_oa:${filters.isOa}`);
            console.log('Added is_oa filter:', filters.isOa);
        }
        
        // DOI durumu
        if (filters.hasDoi !== undefined && filters.hasDoi !== '') {
            filterList.push(`has_doi:${filters.hasDoi}`);
            console.log('Added has_doi filter:', filters.hasDoi);
        }
        
        // PMID durumu
        if (filters.hasPmid !== undefined && filters.hasPmid !== '') {
            filterList.push(`has_pmid:${filters.hasPmid}`);
            console.log('Added has_pmid filter:', filters.hasPmid);
        }
        
        // Referans durumu
        if (filters.hasReferences !== undefined && filters.hasReferences !== '') {
            filterList.push(`has_references:${filters.hasReferences}`);
            console.log('Added has_references filter:', filters.hasReferences);
        }
        
        // Özet durumu
        if (filters.hasAbstract !== undefined && filters.hasAbstract !== '') {
            filterList.push(`has_abstract:${filters.hasAbstract}`);
            console.log('Added has_abstract filter:', filters.hasAbstract);
        }
        
        // Geri çekilme durumu
        if (filters.isRetracted !== undefined && filters.isRetracted !== '') {
            filterList.push(`is_retracted:${filters.isRetracted}`);
            console.log('Added is_retracted filter:', filters.isRetracted);
        }
        
        // Paratext durumu
        if (filters.isParatext !== undefined && filters.isParatext !== '') {
            filterList.push(`is_paratext:${filters.isParatext}`);
            console.log('Added is_paratext filter:', filters.isParatext);
        }
        
        // Versiyon türü
        if (filters.version) {
            filterList.push(`version:${filters.version}`);
            console.log('Added version filter:', filters.version);
        }
        
        // Atıf sayısı aralığı - OpenAlex API range query formatı
        const minCited = filters.citedByCountMin !== undefined && filters.citedByCountMin !== '' ? parseInt(filters.citedByCountMin) : null;
        const maxCited = filters.citedByCountMax !== undefined && filters.citedByCountMax !== '' ? parseInt(filters.citedByCountMax) : null;
        
        if (minCited !== null && maxCited !== null && !isNaN(minCited) && !isNaN(maxCited) && minCited >= 0 && maxCited >= 0) {
            // Hem min hem max varsa: min-max formatı
            filterList.push(`cited_by_count:${minCited}-${maxCited}`);
            console.log('Added cited_by_count range filter:', `${minCited}-${maxCited}`);
        } else if (minCited !== null && !isNaN(minCited) && minCited >= 0) {
            // Sadece min varsa: min- formatı
            filterList.push(`cited_by_count:${minCited}-`);
            console.log('Added cited_by_count min filter:', `${minCited}-`);
        } else if (maxCited !== null && !isNaN(maxCited) && maxCited >= 0) {
            // Sadece max varsa: -max formatı
            filterList.push(`cited_by_count:-${maxCited}`);
            console.log('Added cited_by_count max filter:', `-${maxCited}`);
        }
        
        // Yazar adı/id filtresi
        if (filters.authorId) {
            filterList.push(`authorships.author.id:${filters.authorId}`);
        } else if (filters.authorName) {
            filterList.push(`raw_author_name.search:${filters.authorName}`);
        }
        // Kurum adı/id filtresi
        if (filters.institutionId && filters.institutionId.startsWith('https://openalex.org/I')) {
            filterList.push(`institutions.id:${filters.institutionId}`);
        }
        
        // Filtreleri ekle
        if (filterList.length > 0) {
            url += `&filter=${filterList.join(',')}`;
            console.log('Final filter string:', filterList.join(','));
        }
        
        // Sıralama
        if (filters.sort && filters.sort !== 'relevance') {
            url += `&sort=${filters.sort}`;
            console.log('Added sort:', filters.sort);
        }
        
        console.log('Final URL:', url);
        return url;
    }

    // Filtreleri toplayan fonksiyon
    function collectFilters() {
        const filters = {};
        
        // Yayın yılı filtreleri
        const yearFrom = document.getElementById('publication-year-from').value;
        const yearTo = document.getElementById('publication-year-to').value;
        
        if (yearFrom) {
            filters.fromPublicationDate = `${yearFrom}-01-01`;
        }
        if (yearTo) {
            filters.toPublicationDate = `${yearTo}-12-31`;
        }
        
        // Makale türü
        const workType = document.getElementById('work-type').value;
        if (workType) {
            filters.workType = workType;
        }
        
        // Dil
        const language = document.getElementById('language').value;
        if (language) {
            filters.language = language;
        }
        
        // Açık erişim
        const openAccess = document.getElementById('open-access').value;
        if (openAccess !== '') {
            filters.isOa = openAccess;
        }
        
        // DOI durumu
        const hasDoi = document.getElementById('has-doi').value;
        if (hasDoi !== '') {
            filters.hasDoi = hasDoi;
        }
        
        // PMID durumu
        const hasPmid = document.getElementById('has-pmid').value;
        if (hasPmid !== '') {
            filters.hasPmid = hasPmid;
        }
        
        // Referans durumu
        const hasReferences = document.getElementById('has-references').value;
        if (hasReferences !== '') {
            filters.hasReferences = hasReferences;
        }
        
        // Özet durumu
        const hasAbstract = document.getElementById('has-abstract').value;
        if (hasAbstract !== '') {
            filters.hasAbstract = hasAbstract;
        }
        
        // Geri çekilme durumu
        const isRetracted = document.getElementById('is-retracted').value;
        if (isRetracted !== '') {
            filters.isRetracted = isRetracted;
        }
        
        // Paratext durumu
        const isParatext = document.getElementById('is-paratext').value;
        if (isParatext !== '') {
            filters.isParatext = isParatext;
        }
        
        // Versiyon türü
        const version = document.getElementById('version').value;
        if (version) {
            filters.version = version;
        }
        
        // Atıf sayısı aralığı
        const citedByCountMin = document.getElementById('cited-by-count-min').value;
        if (citedByCountMin) {
            filters.citedByCountMin = citedByCountMin;
        }
        
        const citedByCountMax = document.getElementById('cited-by-count-max').value;
        if (citedByCountMax) {
            filters.citedByCountMax = citedByCountMax;
        }
        
        // Sıralama
        const sortBy = document.getElementById('sort-by').value;
        if (sortBy && sortBy !== 'relevance') {
            filters.sort = sortBy;
        }
        
        // Yazar adı
        const authorInput = document.getElementById('author-name');
        const authorName = authorInput.value;
        if (authorName) {
            filters.authorName = authorName;
            const authorId = authorInput.getAttribute('data-id');
            if (authorId && authorId.startsWith('https://openalex.org/A')) {
                filters.authorId = authorId;
            }
        }
        // Kurum adı
        const institutionInput = document.getElementById('institution-name');
        const institutionName = institutionInput.value;
        const institutionId = institutionInput.getAttribute('data-id');
        if (institutionName && institutionId && institutionId.startsWith('https://openalex.org/I')) {
            filters.institutionName = institutionName;
            filters.institutionId = institutionId;
        }
        
        return filters;
    }

    // Filtreleri temizleme fonksiyonu
    function clearFilters() {
        document.getElementById('publication-year-from').value = '';
        document.getElementById('publication-year-to').value = '';
        document.getElementById('work-type').value = '';
        document.getElementById('language').value = '';
        document.getElementById('open-access').value = '';
        document.getElementById('has-doi').value = '';
        document.getElementById('has-pmid').value = '';
        document.getElementById('has-references').value = '';
        document.getElementById('has-abstract').value = '';
        document.getElementById('is-retracted').value = '';
        document.getElementById('is-paratext').value = '';
        document.getElementById('version').value = '';
        document.getElementById('cited-by-count-min').value = '';
        document.getElementById('cited-by-count-max').value = '';
        document.getElementById('sort-by').value = 'relevance';
        // Yazar ve kurum adı filtrelerini de temizle
        var authorInput = document.getElementById('author-name');
        if (authorInput) { authorInput.value = ''; authorInput.removeAttribute('data-id'); }
        var instInput = document.getElementById('institution-name');
        if (instInput) { instInput.value = ''; instInput.removeAttribute('data-id'); }
    }

    // Filtreleri temizleme butonu
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            clearFilters();
            // Eğer arama kutusunda bir değer varsa otomatik arama tetikle
            if (paperSearchInput && paperSearchInput.value.trim().length > 0) {
                paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    }

    // Yazar filtrelerini temizleme fonksiyonu
    function clearAuthorFilters() {
        document.getElementById('author-country').value = '';
        document.getElementById('author-orcid').value = '';
        document.getElementById('author-institution').value = '';
        document.getElementById('author-institution').removeAttribute('data-id');
        document.getElementById('author-cited-min').value = '';
        document.getElementById('author-cited-max').value = '';
        document.getElementById('author-works-min').value = '';
        document.getElementById('author-works-max').value = '';
        document.getElementById('author-hindex-min').value = '';
        document.getElementById('author-hindex-max').value = '';
        document.getElementById('author-i10-min').value = '';
        document.getElementById('author-i10-max').value = '';
        document.getElementById('author-concept').value = '';
        document.getElementById('author-has-orcid').value = '';
        document.getElementById('author-sort').value = 'relevance';
    }

    // Yazar filtrelerini temizleme butonu
    const clearAuthorFiltersBtn = document.getElementById('clear-author-filters');
    if (clearAuthorFiltersBtn) {
        clearAuthorFiltersBtn.addEventListener('click', function() {
            clearAuthorFilters();
            // Eğer arama kutusunda bir değer varsa otomatik arama tetikle
            if (authorSearchInput && authorSearchInput.value.trim().length > 0) {
                authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    }

    // Gelişmiş filtreler aç/kapa (yeni panel için)
    const advancedFiltersBtn = document.getElementById('toggle-advanced-filters');
    const advancedFiltersPanel = document.getElementById('advanced-filters-panel');
    if (advancedFiltersBtn && advancedFiltersPanel) {
        advancedFiltersBtn.addEventListener('click', () => {
            advancedFiltersPanel.classList.toggle('active');
        });
        // Sayfa yüklendiğinde panel gizli olsun
        advancedFiltersPanel.classList.remove('active');
    }

    // Drawer aç/kapa işlevselliği
    const openDrawerBtn = document.getElementById('open-filters-drawer');
    const closeDrawerBtn = document.getElementById('close-filters-drawer');
    const filtersDrawer = document.getElementById('filters-drawer');
    const filtersDrawerOverlay = document.getElementById('filters-drawer-overlay');

    function openDrawer() {
        filtersDrawer.classList.add('active');
        filtersDrawerOverlay.classList.add('active');
    }
    function closeDrawer() {
        filtersDrawer.classList.remove('active');
        filtersDrawerOverlay.classList.remove('active');
    }
    if (openDrawerBtn && closeDrawerBtn && filtersDrawer && filtersDrawerOverlay) {
        openDrawerBtn.addEventListener('click', openDrawer);
        closeDrawerBtn.addEventListener('click', closeDrawer);
        filtersDrawerOverlay.addEventListener('click', closeDrawer);
    }

    // Yazar filtreleri drawer işlevselliği
    const openAuthorDrawerBtn = document.getElementById('open-author-filters-drawer');
    const closeAuthorDrawerBtn = document.getElementById('close-author-filters-drawer');
    const authorFiltersDrawer = document.getElementById('author-filters-drawer');
    const authorFiltersDrawerOverlay = document.getElementById('author-filters-drawer-overlay');

    function openAuthorDrawer() {
        authorFiltersDrawer.classList.add('active');
        authorFiltersDrawerOverlay.classList.add('active');
    }
    function closeAuthorDrawer() {
        authorFiltersDrawer.classList.remove('active');
        authorFiltersDrawerOverlay.classList.remove('active');
    }
    if (openAuthorDrawerBtn && closeAuthorDrawerBtn && authorFiltersDrawer && authorFiltersDrawerOverlay) {
        openAuthorDrawerBtn.addEventListener('click', openAuthorDrawer);
        closeAuthorDrawerBtn.addEventListener('click', closeAuthorDrawer);
        authorFiltersDrawerOverlay.addEventListener('click', closeAuthorDrawer);
    }

    // Profil yükleme fonksiyonu
    async function loadProfile() {
        const loading = document.getElementById('profile-loading');
        const result = document.getElementById('profile-result');
        loading.style.display = 'block';
        result.innerHTML = '';
        try {
            const resp = await fetch('/api/v1/users/profile', {
                credentials: 'include'
            });
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
        // Sadece sağ üstte, küçük ve yuvarlak profil fotoğrafı
        if (user.picture) {
            return `<img class='profile-avatar' src='${escapeHtml(user.picture)}' alt='Profil Fotoğrafı' style="width:40px;height:40px;border-radius:50%;object-fit:cover;position:fixed;top:18px;right:24px;z-index:1001;box-shadow:0 1px 4px 0 rgba(0,0,0,0.10);">`;
        }
        return '';
    }

    // Makale kartı render fonksiyonu (buton eklenmiş hali)
    async function renderPaperCardWithSave(paper, savedIds, loggedIn) {
        const allAuthors = (paper.authorships || []).map(a => escapeHtml(a.author.display_name));
        let authors = '';
        if (allAuthors.length > 0) {
            if (allAuthors.length <= 3) {
                authors = allAuthors.join(', ');
            } else {
                authors = allAuthors.slice(0, 3).join(', ') + ` ve ${allAuthors.length - 3} diğer`;
            }
        }
        const venue = paper.primary_location && paper.primary_location.source
            ? escapeHtml(paper.primary_location.source.display_name)
            : '';
        const pdf = paper.primary_location && paper.primary_location.pdf_url
            ? `<a href="${paper.primary_location.pdf_url}" target="_blank" title="PDF"><span style='font-size:1.1em;'>📄</span> PDF</a>` : '';
        const doi = paper.doi ? `<a href="${paper.doi}" target="_blank" title="DOI"><span style='font-size:1.1em;'>🔗</span> DOI</a>` : '';
        const year = paper.publication_year ? `<span title='Yayın Yılı'>📅 ${paper.publication_year}</span>` : '';
        const cited = typeof paper.cited_by_count === 'number' ? `<span title='Atıf Sayısı'>⭐ ${paper.cited_by_count}</span>` : '';
        
        // Kitaplığa kaydet butonu
        let saveBtn = '';
        let removeBtn = '';
        if (loggedIn) {
            const openAlexId = paper.id.startsWith('https://openalex.org/') ? paper.id.split('/').pop() : paper.id;
            if (savedIds.includes(openAlexId)) {
                saveBtn = `<button class="btn-primary save-work-btn" data-work-id="${openAlexId}" disabled>Kaydedildi</button>`;
                removeBtn = `<button class="btn-secondary remove-work-btn" data-work-id="${openAlexId}">Kaldır</button>`;
            } else {
                saveBtn = `<button class="btn-primary save-work-btn" data-work-id="${openAlexId}">Kitaplığa Kaydet</button>`;
            }
        }
        
        // Başlık tıklanabilir ve data-work-id ile
        return `
            <div class="paper-card">
                <div class="paper-title"><a href="#" class="work-detail-link" data-work-id="${paper.id}">${escapeHtml(paper.title)}</a></div>
                <div class="paper-meta">
                    ${authors ? `<span>👤 ${authors}</span>` : ''}
                    ${venue ? `<span>📚 ${venue}</span>` : ''}
                    ${year}
                    ${cited}
                    ${doi}
                    ${pdf}
                </div>
                ${(saveBtn || removeBtn) ? `<div class='paper-meta'>${saveBtn} ${removeBtn}</div>` : ''}
            </div>
        `;
    }

    function renderPaperCard(paper) {
        const allAuthors = (paper.authorships || []).map(a => escapeHtml(a.author.display_name));
        let authors = '';
        if (allAuthors.length > 0) {
            if (allAuthors.length <= 3) {
                authors = allAuthors.join(', ');
            } else {
                authors = allAuthors.slice(0, 3).join(', ') + ` ve ${allAuthors.length - 3} diğer`;
            }
        }
        const venue = paper.primary_location && paper.primary_location.source
            ? escapeHtml(paper.primary_location.source.display_name)
            : '';
        const pdf = paper.primary_location && paper.primary_location.pdf_url
            ? `<a href="${paper.primary_location.pdf_url}" target="_blank" title="PDF"><span style='font-size:1.1em;'>📄</span> PDF</a>` : '';
        const doi = paper.doi ? `<a href="${paper.doi}" target="_blank" title="DOI"><span style='font-size:1.1em;'>🔗</span> DOI</a>` : '';
        const year = paper.publication_year ? `<span title='Yayın Yılı'>📅 ${paper.publication_year}</span>` : '';
        const cited = typeof paper.cited_by_count === 'number' ? `<span title='Atıf Sayısı'>⭐ ${paper.cited_by_count}</span>` : '';
        // Başlık tıklanabilir ve data-work-id ile
        return `
            <div class="paper-card">
                <div class="paper-title"><a href="#" class="work-detail-link" data-work-id="${paper.id}">${escapeHtml(paper.title)}</a></div>
                <div class="paper-meta">
                    ${authors ? `<span>👤 ${authors}</span>` : ''}
                    ${venue ? `<span>📚 ${venue}</span>` : ''}
                    ${year}
                    ${cited}
                    ${doi}
                    ${pdf}
                </div>
            </div>
        `;
    }

    // Makale arama sonuçlarını render eden fonksiyonu güncelle
    async function renderPaperSearchResults(papers) {
        const count = paperTotalCount || (papers && papers.length ? papers.length : 0);
        const countHtml = `<div class='search-result-count'><span><b>${count}</b></span> <span>makale bulundu</span></div>`;
        // Sonuç sayısını arama barının altındaki kutuya yaz
        const countDiv = document.getElementById('search-result-count');
        if (countDiv) countDiv.innerHTML = countHtml;
        if (!papers || papers.length === 0) {
            return `<div class="error-message">Makale bulunamadı.</div>`;
        }
        // Giriş ve kaydedilen makaleler kontrolü
        const loggedIn = await isUserLoggedIn();
        const savedIds = loggedIn ? await getSavedWorkIds() : [];
        // Her kartı async render et
        const cards = await Promise.all(papers.map(p => renderPaperCardWithSave(p, savedIds, loggedIn)));
        return `<div class='papers-list'>${cards.join('')}</div>`;
    }

    // --- AUTOCOMPLETE ---
    let authorAutocompleteBox;
    let authorAutocompleteResults = [];
    let authorAutocompleteSelected = -1;

    function createAuthorAutocompleteBox() {
        if (!authorAutocompleteBox) {
            authorAutocompleteBox = document.createElement('div');
            authorAutocompleteBox.className = 'autocomplete-box';
            authorAutocompleteBox.style.position = 'absolute';
            authorAutocompleteBox.style.zIndex = 1000;
            authorAutocompleteBox.style.minWidth = authorSearchInput.offsetWidth + 'px';
            authorSearchInput.parentNode.appendChild(authorAutocompleteBox);
        }
        authorAutocompleteBox.innerHTML = '';
        authorAutocompleteBox.style.display = 'none';
    }

    function positionAuthorAutocompleteBox() {
        if (!authorAutocompleteBox) return;
        const rect = authorSearchInput.getBoundingClientRect();
        authorAutocompleteBox.style.top = (authorSearchInput.offsetTop + authorSearchInput.offsetHeight) + 'px';
        authorAutocompleteBox.style.left = authorSearchInput.offsetLeft + 'px';
        authorAutocompleteBox.style.minWidth = authorSearchInput.offsetWidth + 'px';
    }

    async function fetchAuthorAutocomplete(query) {
        const url = `https://api.openalex.org/autocomplete/authors?q=${encodeURIComponent(query)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.results || [];
    }

    function renderAuthorAutocomplete(results) {
        if (!authorAutocompleteBox) createAuthorAutocompleteBox();
        if (!results || results.length === 0) {
            authorAutocompleteBox.style.display = 'none';
            return;
        }
        authorAutocompleteBox.innerHTML = results.map((item, idx) => `
            <div class='autocomplete-item${idx === authorAutocompleteSelected ? ' selected' : ''}' data-idx='${idx}'>
                <span class='autocomplete-name'>${escapeHtml(item.display_name)}</span>
                ${item.hint ? `<span class='autocomplete-hint'>${escapeHtml(item.hint)}</span>` : ''}
            </div>
        `).join('');
        authorAutocompleteBox.style.display = 'block';
        positionAuthorAutocompleteBox();
    }

    function clearAuthorAutocomplete() {
        if (authorAutocompleteBox) {
            authorAutocompleteBox.innerHTML = '';
            authorAutocompleteBox.style.display = 'none';
        }
        authorAutocompleteResults = [];
        authorAutocompleteSelected = -1;
    }

    let autocompleteSelectedByMouse = false;

    if (authorSearchInput) {
        createAuthorAutocompleteBox();
        authorSearchInput.addEventListener('input', async function(e) {
            const val = authorSearchInput.value.trim();
            if (val.length < 2) {
                clearAuthorAutocomplete();
                return;
            }
            try {
                const results = await fetchAuthorAutocomplete(val);
                authorAutocompleteResults = results;
                authorAutocompleteSelected = -1;
                renderAuthorAutocomplete(results);
            } catch {
                clearAuthorAutocomplete();
            }
        });
        authorSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                clearAuthorAutocomplete();
            }
            if (!authorAutocompleteResults.length || !authorAutocompleteBox || authorAutocompleteBox.style.display === 'none') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                authorAutocompleteSelected = (authorAutocompleteSelected + 1) % authorAutocompleteResults.length;
                renderAuthorAutocomplete(authorAutocompleteResults);
                // Otomatik kaydırma
                const items = authorAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[authorAutocompleteSelected]) {
                    items[authorAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                authorAutocompleteSelected = (authorAutocompleteSelected - 1 + authorAutocompleteResults.length) % authorAutocompleteResults.length;
                renderAuthorAutocomplete(authorAutocompleteResults);
                // Otomatik kaydırma
                const items = authorAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[authorAutocompleteSelected]) {
                    items[authorAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Enter') {
                if (authorAutocompleteSelected >= 0 && authorAutocompleteResults[authorAutocompleteSelected]) {
                    e.preventDefault();
                    authorSearchInput.value = authorAutocompleteResults[authorAutocompleteSelected].display_name;
                    clearAuthorAutocomplete();
                    // Submit tetiklenmeyecek! Sadece input'a yazacak.
                }
            } else if (e.key === 'Escape') {
                clearAuthorAutocomplete();
            }
        });
        document.addEventListener('click', function(e) {
            if (e.target !== authorSearchInput && (!authorAutocompleteBox || !authorAutocompleteBox.contains(e.target))) {
                clearAuthorAutocomplete();
            }
        });
        authorAutocompleteBox.addEventListener('mousedown', function(e) {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const idx = parseInt(item.getAttribute('data-idx'), 10);
                if (authorAutocompleteResults[idx]) {
                    authorSearchInput.value = authorAutocompleteResults[idx].display_name;
                    clearAuthorAutocomplete();
                    if (authorSearchForm) authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        });
    }

    // Sayfa yüklendiğinde ve arama kutusu boşken kutuyu gizle
    const authorSearchResultCount = document.getElementById('author-search-result-count');
    if (authorSearchResultCount) {
        authorSearchResultCount.style.display = 'none';
        authorSearchResultCount.innerHTML = '';
    }
    if (authorSearchInput) {
        authorSearchInput.addEventListener('input', function() {
            if (authorSearchInput.value.trim() === '' && authorSearchResultCount) {
                authorSearchResultCount.style.display = 'none';
                authorSearchResultCount.innerHTML = '';
            }
        });
    }

    // Modal açma/kapama
    const workModal = document.getElementById('work-modal');
    const workModalBody = document.getElementById('work-modal-body');
    const workModalClose = document.getElementById('work-modal-close');
    function openWorkModal() {
        workModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeWorkModal() {
        workModal.style.display = 'none';
        document.body.style.overflow = '';
        workModalBody.innerHTML = '';
    }
    if (workModalClose) workModalClose.addEventListener('click', closeWorkModal);
    if (workModal) workModal.addEventListener('click', function(e) {
        if (e.target === workModal) closeWorkModal();
    });
    // Makale başlığına tıklama
    document.body.addEventListener('click', async function(e) {
        const link = e.target.closest('.work-detail-link');
        if (link) {
            // Eğer link "Tüm yayınlar" modalı içindeyse, ana sayfadaki event'i çalıştırma
            if (link.closest('#author-works-modal')) {
                return;
            }
            e.preventDefault();
            const workId = link.getAttribute('data-work-id');
            if (!workId) return;
            workModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
            openWorkModal();
            try {
                // OpenAlex ID genelde https://openalex.org/Wxxxx formatında, sadece ID kısmını al
                let id = workId;
                if (id.startsWith('https://openalex.org/')) id = id.split('/').pop();
                const resp = await fetch(`https://api.openalex.org/works/${id}`);
                if (!resp.ok) throw new Error('Detaylar alınamadı');
                const work = await resp.json();
                workModalBody.innerHTML = renderWorkDetailModal(work);
            } catch (err) {
                workModalBody.innerHTML = `<div class='error-message'>Detaylar alınırken hata oluştu: ${err.message}</div>`;
            }
        }
    });

    // Yazar detay modalı açma/kapama ve detay çekme
    const authorModal = document.getElementById('author-modal');
    const authorModalBody = document.getElementById('author-modal-body');
    const authorModalClose = document.getElementById('author-modal-close');
    function openAuthorModal() {
        authorModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeAuthorModal() {
        authorModal.style.display = 'none';
        document.body.style.overflow = '';
        authorModalBody.innerHTML = '';
    }
    if (authorModalClose) authorModalClose.addEventListener('click', closeAuthorModal);
    if (authorModal) authorModal.addEventListener('click', function(e) {
        if (e.target === authorModal) closeAuthorModal();
    });
    // Yazar ismine tıklama
    document.body.addEventListener('click', async function(e) {
        const link = e.target.closest('.author-detail-link');
        if (link) {
            e.preventDefault();
            const authorId = link.getAttribute('data-author-id');
            if (!authorId) return;
            authorModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
            openAuthorModal();
            try {
                let id = authorId;
                if (id.startsWith('https://openalex.org/')) id = id.split('/').pop();
                const resp = await fetch(`https://api.openalex.org/authors/${id}`);
                if (!resp.ok) throw new Error('Detaylar alınamadı');
                const author = await resp.json();
                authorModalBody.innerHTML = renderAuthorDetailModal(author);
            } catch (err) {
                authorModalBody.innerHTML = `<div class='error-message'>Detaylar alınırken hata oluştu: ${err.message}</div>`;
            }
        }
    });

    // Kurum detay modalı açma/kapama ve detay çekme
    const institutionModal = document.getElementById('institution-modal');
    const institutionModalBody = document.getElementById('institution-modal-body');
    const institutionModalClose = document.getElementById('institution-modal-close');
    function openInstitutionModal() {
        institutionModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeInstitutionModal() {
        institutionModal.style.display = 'none';
        document.body.style.overflow = '';
        institutionModalBody.innerHTML = '';
    }
    if (institutionModalClose) institutionModalClose.addEventListener('click', closeInstitutionModal);
    if (institutionModal) institutionModal.addEventListener('click', function(e) {
        if (e.target === institutionModal) closeInstitutionModal();
    });
    // Kurum ismine tıklama
    document.body.addEventListener('click', async function(e) {
        const link = e.target.closest('.institution-detail-link');
        if (link) {
            e.preventDefault();
            const institutionId = link.getAttribute('data-institution-id');
            if (!institutionId) return;
            institutionModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
            openInstitutionModal();
            try {
                let id = institutionId;
                if (id.startsWith('https://openalex.org/')) id = id.split('/').pop();
                const resp = await fetch(`https://api.openalex.org/institutions/${id}`);
                if (!resp.ok) throw new Error('Detaylar alınamadı');
                const institution = await resp.json();
                institutionModalBody.innerHTML = renderInstitutionDetailModal(institution);
            } catch (err) {
                institutionModalBody.innerHTML = `<div class='error-message'>Detaylar alınırken hata oluştu: ${err.message}</div>`;
            }
        }
    });

    // Kurum arama sonuç sayısı kutusunu başta gizle
    const institutionCountDiv = document.getElementById('institution-search-result-count');
    if (institutionCountDiv) {
        institutionCountDiv.style.display = 'none';
        institutionCountDiv.innerHTML = '';
    }

    // --- Yazar Tüm Yayınlar Modalı ---
    const authorWorksModal = document.getElementById('author-works-modal');
    const authorWorksModalBody = document.getElementById('author-works-modal-body');
    const authorWorksModalClose = document.getElementById('author-works-modal-close');

    function openAuthorWorksModal() {
        authorWorksModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeAuthorWorksModal() {
        authorWorksModal.style.display = 'none';
        document.body.style.overflow = '';
        authorWorksModalBody.innerHTML = '';
    }
    if (authorWorksModalClose) authorWorksModalClose.addEventListener('click', closeAuthorWorksModal);
    const authorWorksBackdrop = authorWorksModal ? authorWorksModal.querySelector('.modal-backdrop') : null;
    if (authorWorksBackdrop) {
        authorWorksBackdrop.addEventListener('click', closeAuthorWorksModal);
    }
    // Detay için tam modalı kaplayan bir yapı ekle
    let authorWorksFullDetailModal = null;
    function createAuthorWorksFullDetailModal() {
        if (!authorWorksFullDetailModal) {
            authorWorksFullDetailModal = document.createElement('div');
            authorWorksFullDetailModal.className = 'author-works-full-detail-modal';
            authorWorksFullDetailModal.innerHTML = `
                <div class="author-works-full-detail-backdrop"></div>
                <div class="author-works-full-detail-content">
                    <button class="author-works-full-detail-close" aria-label="Kapat">×</button>
                    <div class="author-works-full-detail-body"></div>
                </div>
            `;
            authorWorksModal.appendChild(authorWorksFullDetailModal);
            authorWorksFullDetailModal.querySelector('.author-works-full-detail-close').onclick = closeAuthorWorksFullDetailModal;
            authorWorksFullDetailModal.querySelector('.author-works-full-detail-backdrop').onclick = closeAuthorWorksFullDetailModal;
        }
    }
    function openAuthorWorksFullDetailModal(html) {
        createAuthorWorksFullDetailModal();
        authorWorksFullDetailModal.style.display = 'flex';
        authorWorksFullDetailModal.querySelector('.author-works-full-detail-body').innerHTML = html;
        setTimeout(() => authorWorksFullDetailModal.classList.add('active'), 10);
    }
    function closeAuthorWorksFullDetailModal() {
        if (authorWorksFullDetailModal) {
            authorWorksFullDetailModal.classList.remove('active');
            setTimeout(() => {
                authorWorksFullDetailModal.style.display = 'none';
                authorWorksFullDetailModal.querySelector('.author-works-full-detail-body').innerHTML = '';
            }, 200);
        }
    }
    // Tüm Yayınlar linkine tıklama (delegasyon ile body'ye ekle)
    document.body.addEventListener('click', async function(e) {
        const link = e.target.closest('.author-works-link');
        if (link) {
            e.preventDefault();
            const authorId = link.getAttribute('data-author-id');
            const worksUrl = link.getAttribute('data-works-url');
            if (!authorId || !worksUrl) return;
            authorWorksModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
            openAuthorWorksModal();
            let currentPage = 1;
            let perPage = 25;
            let totalWorks = 0;
            let totalPages = 1;
            let searchValue = '';
            async function fetchWorksPage(page, search = '') {
                let url = worksUrl + `?per_page=${perPage}&page=${page}`;
                if (search && search.trim().length > 0) {
                    url += `&search=${encodeURIComponent(search.trim())}`;
                }
                    const resp = await fetch(url);
                if (!resp.ok) throw new Error('Yayınlar alınamadı');
                    const data = await resp.json();
                return data;
            }
            async function loadWorksPage(page, search = '') {
                authorWorksModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
                try {
                    const data = await fetchWorksPage(page, search);
                    const works = data.results || [];
                    totalWorks = data.meta && data.meta.count ? data.meta.count : 0;
                    const maxPage = Math.ceil(10000 / perPage);
                    let calculatedTotalPages = Math.ceil(totalWorks / perPage);
                    totalPages = Math.min(calculatedTotalPages, maxPage);
                    if (page > totalPages) {
                        authorWorksModalBody.innerHTML = renderSplitWorksModal([], 0, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                        const listContent = document.getElementById('author-works-list-content');
                        if (listContent) {
                            listContent.innerHTML = `<div class='error-message'>Yayın bulunamadı.</div>`;
                        }
                        // Arama barını yeniden ayarla
                        const searchInput = document.getElementById('author-works-search-input');
                        if (searchInput) {
                            searchInput.value = search;
                            let searchTimeout;
                            searchInput.addEventListener('input', function() {
                                clearTimeout(searchTimeout);
                                searchTimeout = setTimeout(() => {
                                    searchValue = searchInput.value;
                                    loadWorksPage(1, searchValue);
                                }, 1000);
                            });
                        }
                        return;
                    }
                currentPage = page;
                    authorWorksModalBody.innerHTML = renderSplitWorksModal(works, totalWorks, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                const listContent = document.getElementById('author-works-list-content');
                if (listContent) {
                    if (!works.length) {
                        listContent.innerHTML = `<div class="error-message">Yayın bulunamadı.</div>`;
                    } else {
                        listContent.innerHTML = `<div class='papers-list'>${works.map(renderPaperCard).join('')}</div>`;
                        listContent.addEventListener('click', async function(ev) {
                            const link = ev.target.closest('.work-detail-link');
                            if (link) {
                                ev.preventDefault();
                                    ev.stopPropagation();
                                const workId = link.getAttribute('data-work-id');
                                if (!workId) return;
                                openAuthorWorksFullDetailModal('<div class="loading">Yükleniyor...</div>');
                                try {
                                    let id = workId;
                                    if (id.startsWith('https://openalex.org/')) id = id.split('/').pop();
                                    const resp = await fetch(`https://api.openalex.org/works/${id}`);
                                    if (!resp.ok) throw new Error('Detaylar alınamadı');
                                    const work = await resp.json();
                                    openAuthorWorksFullDetailModal(renderWorkDetailModal(work));
                                } catch (err) {
                                    openAuthorWorksFullDetailModal(`<div class='error-message'>Detaylar alınırken hata oluştu: ${err.message}</div>`);
                                }
                            }
                        });
                    }
                }
                const pagWrap = document.getElementById('author-works-pagination-wrap');
                if (pagWrap) {
                        pagWrap.innerHTML = renderWorksPagination(currentPage, totalPages, 'author');
                }
                const searchInput = document.getElementById('author-works-search-input');
                if (searchInput) {
                    searchInput.value = search;
                    searchInput.focus();
                        let searchTimeout;
                    searchInput.addEventListener('input', function() {
                            clearTimeout(searchTimeout);
                            searchTimeout = setTimeout(() => {
                        searchValue = searchInput.value;
                        loadWorksPage(1, searchValue);
                            }, 1000);
                    });
                }
                const detailCloseBtn = document.getElementById('author-works-detail-close');
                if (detailCloseBtn) {
                    detailCloseBtn.addEventListener('click', function() {
                        document.getElementById('author-works-detail-panel').style.display = 'none';
                    });
                }
                } catch (err) {
                    console.error('Yayınlar alınırken hata:', err);
                    if (currentPage > 1) {
                        authorWorksModalBody.innerHTML = renderSplitWorksModal([], 0, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                        const listContent = document.getElementById('author-works-list-content');
                        if (listContent) {
                            listContent.innerHTML = `<div class='error-message'>Bu sayfada yayın bulunamadı, bir önceki sayfa yükleniyor...</div>`;
                        }
                        setTimeout(() => loadWorksPage(currentPage - 1, search), 1000);
                    } else {
                        authorWorksModalBody.innerHTML = renderSplitWorksModal([], 0, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                        const listContent = document.getElementById('author-works-list-content');
                        if (listContent) {
                            listContent.innerHTML = `<div class='error-message'>Yayın bulunamadı.</div>`;
                        }
                        // Arama barını yeniden ayarla
                        const searchInput = document.getElementById('author-works-search-input');
                        if (searchInput) {
                            searchInput.value = search;
                            let searchTimeout;
                            searchInput.addEventListener('input', function() {
                                clearTimeout(searchTimeout);
                                searchTimeout = setTimeout(() => {
                                    searchValue = searchInput.value;
                                    loadWorksPage(1, searchValue);
                                }, 1000);
                            });
                        }
                    }
                }
            }
            authorWorksModalBody.onclick = function(ev) {
                const btn = ev.target.closest('.pagination-btn[data-works-page]');
                if (btn) {
                    const page = parseInt(btn.getAttribute('data-works-page'), 10);
                    if (!isNaN(page) && page !== currentPage) {
                        currentPage = page;
                        loadWorksPage(currentPage, searchValue);
                    }
                }
            };
            const resizeObserver = new ResizeObserver(() => {
                    totalPages = Math.max(1, Math.ceil(totalWorks / perPage));
                    if (currentPage > totalPages) currentPage = totalPages;
                    loadWorksPage(currentPage, searchValue);
            });
            resizeObserver.observe(authorWorksModal);
            authorWorksModalClose.addEventListener('click', () => resizeObserver.disconnect(), { once: true });
            loadWorksPage(currentPage);
        }
    });
    // Modal genişliğine göre sayfa başına yayın sayısı
    function calcWorksPerPage() {
        const w = authorWorksModal ? authorWorksModal.offsetWidth : 700;
        if (w > 1000) return 12;
        if (w > 700) return 8;
        if (w > 500) return 6;
        return 4;
    }

    // Pagination fonksiyonunu modal için modernleştir
    function renderWorksPagination(current, total, type = 'author') {
        if (total <= 1) return '';
        let html = `<div class='paper-pagination'>`;
        if (current > 1) {
            html += `<button class='pagination-btn' data-works-page='${current - 1}'>&laquo;</button>`;
        }
        let start = Math.max(1, current - 2);
        let end = Math.min(total, current + 2);
        if (start > 1) {
            html += `<button class='pagination-btn' data-works-page='1'>1</button>`;
            if (start > 2) html += `<span class='pagination-ellipsis'>...</span>`;
        }
        for (let i = start; i <= end; i++) {
            html += `<button class='pagination-btn${i === current ? ' active' : ''}' data-works-page='${i}'>${i}</button>`;
        }
        if (end < total) {
            if (end < total - 1) html += `<span class='pagination-ellipsis'>...</span>`;
            html += `<button class='pagination-btn' data-works-page='${total}'>${total}</button>`;
        }
        if (current < total) {
            html += `<button class='pagination-btn' data-works-page='${current + 1}'>&raquo;</button>`;
        }
        html += `</div>`;
        return html;
    }

    // --- KURUM TÜM YAYINLAR MODALI ---
    // Kurum kartındaki "Tüm Yayınlar" butonuna tıklama
    document.body.addEventListener('click', async function(e) {
        const btn = e.target.closest('.institution-works-btn');
        if (btn) {
            e.preventDefault();
            const institutionId = btn.getAttribute('data-institution-id');
            const worksUrl = btn.getAttribute('data-works-url');
            if (!institutionId || !worksUrl) return;
            
            // Yazar modalını kurum için kullan
            authorWorksModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
            openAuthorWorksModal();
            
            let currentPage = 1;
            let perPage = 25;
            let totalWorks = 0;
            let totalPages = 1;
            let searchValue = '';
            
            async function fetchWorksPage(page, search = '') {
                let url = worksUrl + `?per_page=${perPage}&page=${page}`;
                if (search && search.trim().length > 0) {
                    url += `&search=${encodeURIComponent(search.trim())}`;
                }
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Yayınlar alınamadı');
                const data = await resp.json();
                return data;
            }
            
            async function loadWorksPage(page, search = '') {
                authorWorksModalBody.innerHTML = '<div class="loading">Yükleniyor...</div>';
                try {
                    const data = await fetchWorksPage(page, search);
                    const works = data.results || [];
                    totalWorks = data.meta && data.meta.count ? data.meta.count : 0;
                    const maxPage = Math.ceil(10000 / perPage);
                    let calculatedTotalPages = Math.ceil(totalWorks / perPage);
                    totalPages = Math.min(calculatedTotalPages, maxPage);
                    
                    if (page > totalPages) {
                        authorWorksModalBody.innerHTML = renderSplitWorksModal([], 0, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                        const listContent = document.getElementById('author-works-list-content');
                        if (listContent) {
                            listContent.innerHTML = `<div class='error-message'>Yayın bulunamadı.</div>`;
                        }
                        // Arama barını yeniden ayarla
                        const searchInput = document.getElementById('author-works-search-input');
                        if (searchInput) {
                            searchInput.value = search;
                            let searchTimeout;
                            searchInput.addEventListener('input', function() {
                                clearTimeout(searchTimeout);
                                searchTimeout = setTimeout(() => {
                                    searchValue = searchInput.value;
                                    loadWorksPage(1, searchValue);
                                }, 1000);
                            });
                        }
                        return;
                    }
                    
                    currentPage = page;
                    authorWorksModalBody.innerHTML = renderSplitWorksModal(works, totalWorks, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                    
                    const listContent = document.getElementById('author-works-list-content');
                    if (listContent) {
                        if (!works.length) {
                            listContent.innerHTML = `<div class="error-message">Yayın bulunamadı.</div>`;
                        } else {
                            listContent.innerHTML = `<div class='papers-list'>${works.map(renderPaperCard).join('')}</div>`;
                            listContent.addEventListener('click', async function(ev) {
                                const link = ev.target.closest('.work-detail-link');
                                if (link) {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    const workId = link.getAttribute('data-work-id');
                                    if (!workId) return;
                                    openAuthorWorksFullDetailModal('<div class="loading">Yükleniyor...</div>');
                                    try {
                                        let id = workId;
                                        if (id.startsWith('https://openalex.org/')) id = id.split('/').pop();
                                        const resp = await fetch(`https://api.openalex.org/works/${id}`);
                                        if (!resp.ok) throw new Error('Detaylar alınamadı');
                                        const work = await resp.json();
                                        openAuthorWorksFullDetailModal(renderWorkDetailModal(work));
                                    } catch (err) {
                                        openAuthorWorksFullDetailModal(`<div class='error-message'>Detaylar alınırken hata oluştu: ${err.message}</div>`);
                                    }
                                }
                            });
                        }
                    }
                    
                    const pagWrap = document.getElementById('author-works-pagination-wrap');
                    if (pagWrap) {
                        pagWrap.innerHTML = renderWorksPagination(currentPage, totalPages, 'author');
                    }
                    
                    const searchInput = document.getElementById('author-works-search-input');
                    if (searchInput) {
                        searchInput.value = search;
                        searchInput.focus();
                        let searchTimeout;
                        searchInput.addEventListener('input', function() {
                            clearTimeout(searchTimeout);
                            searchTimeout = setTimeout(() => {
                                searchValue = searchInput.value;
                                loadWorksPage(1, searchValue);
                            }, 1000);
                        });
                    }
                    
                    const detailCloseBtn = document.getElementById('author-works-detail-close');
                    if (detailCloseBtn) {
                        detailCloseBtn.addEventListener('click', function() {
                            document.getElementById('author-works-detail-panel').style.display = 'none';
                        });
                    }
                } catch (err) {
                    console.error('Yayınlar alınırken hata:', err);
                    if (currentPage > 1) {
                        authorWorksModalBody.innerHTML = renderSplitWorksModal([], 0, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                        const listContent = document.getElementById('author-works-list-content');
                        if (listContent) {
                            listContent.innerHTML = `<div class='error-message'>Bu sayfada yayın bulunamadı, bir önceki sayfa yükleniyor...</div>`;
                        }
                        setTimeout(() => loadWorksPage(currentPage - 1, search), 1000);
                    } else {
                        authorWorksModalBody.innerHTML = renderSplitWorksModal([], 0, currentPage, totalPages, search, 'author-works-search-input', 'Yayınlarda ara...');
                        const listContent = document.getElementById('author-works-list-content');
                        if (listContent) {
                            listContent.innerHTML = `<div class='error-message'>Yayın bulunamadı.</div>`;
                        }
                        // Arama barını yeniden ayarla
                        const searchInput = document.getElementById('author-works-search-input');
                        if (searchInput) {
                            searchInput.value = search;
                            let searchTimeout;
                            searchInput.addEventListener('input', function() {
                                clearTimeout(searchTimeout);
                                searchTimeout = setTimeout(() => {
                                    searchValue = searchInput.value;
                                    loadWorksPage(1, searchValue);
                                }, 1000);
                            });
                        }
                    }
                }
            }
            
            authorWorksModalBody.onclick = function(ev) {
                const btn = ev.target.closest('.pagination-btn[data-works-page]');
                if (btn) {
                    const page = parseInt(btn.getAttribute('data-works-page'), 10);
                    if (!isNaN(page) && page !== currentPage) {
                        currentPage = page;
                        loadWorksPage(currentPage, searchValue);
                    }
                }
            };
            
            const resizeObserver = new ResizeObserver(() => {
                totalPages = Math.max(1, Math.ceil(totalWorks / perPage));
                if (currentPage > totalPages) currentPage = totalPages;
                loadWorksPage(currentPage, searchValue);
            });
            resizeObserver.observe(authorWorksModal);
            authorWorksModalClose.addEventListener('click', () => resizeObserver.disconnect(), { once: true });
            
            loadWorksPage(currentPage);
        }
    });
    function renderWorksPagination(current, total, type = 'author') {
        if (total <= 1) return '';
        let html = `<div class='paper-pagination'>`;
        if (current > 1) {
            html += `<button class='pagination-btn' data-works-page='${current - 1}'>&laquo;</button>`;
        }
        let start = Math.max(1, current - 2);
        let end = Math.min(total, current + 2);
        if (start > 1) {
            html += `<button class='pagination-btn' data-works-page='1'>1</button>`;
            if (start > 2) html += `<span class='pagination-ellipsis'>...</span>`;
        }
        for (let i = start; i <= end; i++) {
            html += `<button class='pagination-btn${i === current ? ' active' : ''}' data-works-page='${i}'>${i}</button>`;
        }
        if (end < total) {
            if (end < total - 1) html += `<span class='pagination-ellipsis'>...</span>`;
            html += `<button class='pagination-btn' data-works-page='${total}'>${total}</button>`;
        }
        if (current < total) {
            html += `<button class='pagination-btn' data-works-page='${current + 1}'>&raquo;</button>`;
        }
        html += `</div>`;
        return html;
    }

    // --- GLOBAL: Tüm Yayınlar modalı için ortak fonksiyonlar ---
    function renderWorksSearchBar(inputId = 'author-works-search-input', placeholder = 'Yayınlarda ara...') {
        return `<div class="author-works-search-bar" style="margin-bottom:1rem;display:flex;gap:0.7rem;align-items:center;">
            <input type="text" id="${inputId}" placeholder="${placeholder}" style="flex:1;padding:0.6rem 1rem;font-size:1.05rem;border-radius:8px;border:1px solid #444;outline:none;" autocomplete="off">
        </div>`;
    }
    function renderSplitWorksModal(works, allWorksCount, currentPage, totalPages, search, inputId = 'author-works-search-input', placeholder = 'Yayınlarda ara...') {
        return `
        <div class="author-works-modal-split" style="display:flex;flex-direction:row;gap:2.2rem;min-height:400px;">
          <div class="author-works-list-col" style="flex:1 1 0;min-width:0;">
            <h2>Tüm Yayınlar (${allWorksCount})</h2>
            ${renderWorksSearchBar(inputId, placeholder)}
            <div id="${inputId === 'author-works-search-input' ? 'author-works-list-content' : 'institution-works-list-content'}"></div>
          </div>
          <div class="author-works-detail-col" id="${inputId === 'author-works-search-input' ? 'author-works-detail-panel' : 'institution-works-detail-panel'}" style="flex:1 1 0;min-width:0;max-width:520px;display:none;position:relative;background:#181f2a;border-radius:1.2em;padding:1.2em 1.2em 1.2em 1.2em;box-shadow:0 2px 12px 0 rgba(37,99,235,0.13);">
            <button id="${inputId === 'author-works-search-input' ? 'author-works-detail-close' : 'institution-works-detail-close'}" style="position:absolute;top:1.1em;right:1.1em;font-size:2em;background:none;border:none;color:#3b82f6;cursor:pointer;z-index:2;">×</button>
            <div id="${inputId === 'author-works-search-input' ? 'author-works-detail-body' : 'institution-works-detail-body'}"></div>
          </div>
        </div>
        <div id="${inputId === 'author-works-search-input' ? 'author-works-pagination-wrap' : 'institution-works-pagination-wrap'}"></div>
        `;
    }

    // Yazar adı
    const authorName = document.getElementById('author-name').value;
    if (authorName) {
        filters.authorName = authorName;
    }
    // Kurum adı
    const institutionInput = document.getElementById('institution-name');
    const institutionName = institutionInput.value;
    const institutionId = institutionInput.getAttribute('data-id');
    if (institutionName && institutionId && institutionId.startsWith('https://openalex.org/I')) {
        filters.institutionName = institutionName;
        filters.institutionId = institutionId;
    }

    // --- AUTOCOMPLETE (YAZAR ADI) ---
    let authorNameAutocompleteBox;
    let authorNameAutocompleteResults = [];
    let authorNameAutocompleteSelected = -1;
    function createAuthorNameAutocompleteBox() {
        if (!authorNameAutocompleteBox) {
            const input = document.getElementById('author-name');
            authorNameAutocompleteBox = document.createElement('div');
            authorNameAutocompleteBox.className = 'autocomplete-box';
            authorNameAutocompleteBox.style.position = 'absolute';
            authorNameAutocompleteBox.style.zIndex = 1000;
            authorNameAutocompleteBox.style.minWidth = input.offsetWidth + 'px';
            input.parentNode.appendChild(authorNameAutocompleteBox);
        }
        authorNameAutocompleteBox.innerHTML = '';
        authorNameAutocompleteBox.style.display = 'none';
    }
    function positionAuthorNameAutocompleteBox() {
        if (!authorNameAutocompleteBox) return;
        const input = document.getElementById('author-name');
        authorNameAutocompleteBox.style.top = (input.offsetTop + input.offsetHeight) + 'px';
        authorNameAutocompleteBox.style.left = input.offsetLeft + 'px';
        authorNameAutocompleteBox.style.minWidth = input.offsetWidth + 'px';
    }
    async function fetchAuthorNameAutocomplete(query) {
        const url = `https://api.openalex.org/autocomplete/authors?q=${encodeURIComponent(query)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.results || [];
    }
    function renderAuthorNameAutocomplete(results) {
        if (!authorNameAutocompleteBox) createAuthorNameAutocompleteBox();
        if (!results || results.length === 0) {
            authorNameAutocompleteBox.style.display = 'none';
            return;
        }
        authorNameAutocompleteBox.innerHTML = results.map((item, idx) => `
            <div class='autocomplete-item${idx === authorNameAutocompleteSelected ? ' selected' : ''}' data-idx='${idx}'>
                <span class='autocomplete-name'>${escapeHtml(item.display_name)}</span>
                ${item.hint ? `<span class='autocomplete-hint'>${escapeHtml(item.hint)}</span>` : ''}
            </div>
        `).join('');
        authorNameAutocompleteBox.style.display = 'block';
        positionAuthorNameAutocompleteBox();
    }
    function clearAuthorNameAutocomplete() {
        if (authorNameAutocompleteBox) {
            authorNameAutocompleteBox.innerHTML = '';
            authorNameAutocompleteBox.style.display = 'none';
        }
        authorNameAutocompleteResults = [];
        authorNameAutocompleteSelected = -1;
    }
    if (document.getElementById('author-name')) {
        createAuthorNameAutocompleteBox();
        const input = document.getElementById('author-name');
        input.addEventListener('input', async function(e) {
            const val = input.value.trim();
            if (val.length < 2) {
                clearAuthorNameAutocomplete();
                return;
            }
            try {
                const results = await fetchAuthorNameAutocomplete(val);
                authorNameAutocompleteResults = results;
                authorNameAutocompleteSelected = -1;
                renderAuthorNameAutocomplete(results);
            } catch {
                clearAuthorNameAutocomplete();
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (authorNameAutocompleteResults.length && authorNameAutocompleteBox && authorNameAutocompleteBox.style.display !== 'none') {
                    if (authorNameAutocompleteSelected >= 0 && authorNameAutocompleteResults[authorNameAutocompleteSelected]) {
                        e.preventDefault();
                        input.value = authorNameAutocompleteResults[authorNameAutocompleteSelected].display_name;
                        input.setAttribute('data-id', authorNameAutocompleteResults[authorNameAutocompleteSelected].id);
                        clearAuthorNameAutocomplete();
                        // Otomatik arama formunu submit et
                        const paperSearchForm = document.getElementById('paper-search-form');
                        if (paperSearchForm) paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    } else {
                        // Seçili öğe yoksa sadece autocomplete'i kapat
                        clearAuthorNameAutocomplete();
                    }
                }
                return;
            }
            
            if (!authorNameAutocompleteResults.length || !authorNameAutocompleteBox || authorNameAutocompleteBox.style.display === 'none') return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                authorNameAutocompleteSelected = (authorNameAutocompleteSelected + 1) % authorNameAutocompleteResults.length;
                renderAuthorNameAutocomplete(authorNameAutocompleteResults);
                const items = authorNameAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[authorNameAutocompleteSelected]) {
                    items[authorNameAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                authorNameAutocompleteSelected = (authorNameAutocompleteSelected - 1 + authorNameAutocompleteResults.length) % authorNameAutocompleteResults.length;
                renderAuthorNameAutocomplete(authorNameAutocompleteResults);
                const items = authorNameAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[authorNameAutocompleteSelected]) {
                    items[authorNameAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Escape') {
                clearAuthorNameAutocomplete();
            }
        });
        authorNameAutocompleteBox.addEventListener('mousedown', function(e) {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const idx = parseInt(item.getAttribute('data-idx'), 10);
                if (authorNameAutocompleteResults[idx]) {
                    input.value = authorNameAutocompleteResults[idx].display_name;
                    input.setAttribute('data-id', authorNameAutocompleteResults[idx].id);
                    clearAuthorNameAutocomplete();
                    // Otomatik arama formunu submit et
                    const paperSearchForm = document.getElementById('paper-search-form');
                    if (paperSearchForm) paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        });
        document.addEventListener('click', function(e) {
            if (e.target !== input && (!authorNameAutocompleteBox || !authorNameAutocompleteBox.contains(e.target))) {
                clearAuthorNameAutocomplete();
            }
        });
    }
    // --- AUTOCOMPLETE (KURUM ADI) ---
    let institutionNameAutocompleteBox;
    let institutionNameAutocompleteResults = [];
    let institutionNameAutocompleteSelected = -1;
    function createInstitutionNameAutocompleteBox() {
        if (!institutionNameAutocompleteBox) {
            const input = document.getElementById('institution-name');
            institutionNameAutocompleteBox = document.createElement('div');
            institutionNameAutocompleteBox.className = 'autocomplete-box';
            institutionNameAutocompleteBox.style.position = 'absolute';
            institutionNameAutocompleteBox.style.zIndex = 1000;
            institutionNameAutocompleteBox.style.minWidth = input.offsetWidth + 'px';
            input.parentNode.appendChild(institutionNameAutocompleteBox);
        }
        institutionNameAutocompleteBox.innerHTML = '';
        institutionNameAutocompleteBox.style.display = 'none';
    }
    function positionInstitutionNameAutocompleteBox() {
        if (!institutionNameAutocompleteBox) return;
        const input = document.getElementById('institution-name');
        institutionNameAutocompleteBox.style.top = (input.offsetTop + input.offsetHeight) + 'px';
        institutionNameAutocompleteBox.style.left = input.offsetLeft + 'px';
        institutionNameAutocompleteBox.style.minWidth = input.offsetWidth + 'px';
    }
    async function fetchInstitutionNameAutocomplete(query) {
        const url = `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(query)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.results || [];
    }
    function renderInstitutionNameAutocomplete(results) {
        if (!institutionNameAutocompleteBox) createInstitutionNameAutocompleteBox();
        if (!results || results.length === 0) {
            institutionNameAutocompleteBox.style.display = 'none';
            return;
        }
        institutionNameAutocompleteBox.innerHTML = results.map((item, idx) => `
            <div class='autocomplete-item${idx === institutionNameAutocompleteSelected ? ' selected' : ''}' data-idx='${idx}'>
                <span class='autocomplete-name'>${escapeHtml(item.display_name)}</span>
                ${item.hint ? `<span class='autocomplete-hint'>${escapeHtml(item.hint)}</span>` : ''}
            </div>
        `).join('');
        institutionNameAutocompleteBox.style.display = 'block';
        positionInstitutionNameAutocompleteBox();
    }
    function clearInstitutionNameAutocomplete() {
        if (institutionNameAutocompleteBox) {
            institutionNameAutocompleteBox.innerHTML = '';
            institutionNameAutocompleteBox.style.display = 'none';
        }
        institutionNameAutocompleteResults = [];
        institutionNameAutocompleteSelected = -1;
    }
    if (document.getElementById('institution-name')) {
        createInstitutionNameAutocompleteBox();
        const input = document.getElementById('institution-name');
        input.addEventListener('input', async function(e) {
            const val = input.value.trim();
            if (val.length < 2) {
                clearInstitutionNameAutocomplete();
                return;
            }
            try {
                const results = await fetchInstitutionNameAutocomplete(val);
                institutionNameAutocompleteResults = results;
                institutionNameAutocompleteSelected = -1;
                renderInstitutionNameAutocomplete(results);
            } catch {
                clearInstitutionNameAutocomplete();
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (institutionNameAutocompleteResults.length && institutionNameAutocompleteBox && institutionNameAutocompleteBox.style.display !== 'none') {
                    if (institutionNameAutocompleteSelected >= 0 && institutionNameAutocompleteResults[institutionNameAutocompleteSelected]) {
                        e.preventDefault();
                        input.value = institutionNameAutocompleteResults[institutionNameAutocompleteSelected].display_name;
                        input.setAttribute('data-id', institutionNameAutocompleteResults[institutionNameAutocompleteSelected].id);
                        clearInstitutionNameAutocomplete();
                        // Otomatik arama formunu submit et
                        const paperSearchForm = document.getElementById('paper-search-form');
                        if (paperSearchForm) paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    } else {
                        // Seçili öğe yoksa sadece autocomplete'i kapat
                        clearInstitutionNameAutocomplete();
                    }
                }
                return;
            }
            
            if (!institutionNameAutocompleteResults.length || !institutionNameAutocompleteBox || institutionNameAutocompleteBox.style.display === 'none') return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                institutionNameAutocompleteSelected = (institutionNameAutocompleteSelected + 1) % institutionNameAutocompleteResults.length;
                renderInstitutionNameAutocomplete(institutionNameAutocompleteResults);
                const items = institutionNameAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[institutionNameAutocompleteSelected]) {
                    items[institutionNameAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                institutionNameAutocompleteSelected = (institutionNameAutocompleteSelected - 1 + institutionNameAutocompleteResults.length) % institutionNameAutocompleteResults.length;
                renderInstitutionNameAutocomplete(institutionNameAutocompleteResults);
                const items = institutionNameAutocompleteBox.querySelectorAll('.autocomplete-item');
                if (items[institutionNameAutocompleteSelected]) {
                    items[institutionNameAutocompleteSelected].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Escape') {
                clearInstitutionNameAutocomplete();
            }
        });
        document.addEventListener('click', function(e) {
            if (e.target !== input && (!institutionNameAutocompleteBox || !institutionNameAutocompleteBox.contains(e.target))) {
                clearInstitutionNameAutocomplete();
            }
        });
        institutionNameAutocompleteBox.addEventListener('mousedown', function(e) {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const idx = parseInt(item.getAttribute('data-idx'), 10);
                if (institutionNameAutocompleteResults[idx]) {
                    input.value = institutionNameAutocompleteResults[idx].display_name;
                    input.setAttribute('data-id', institutionNameAutocompleteResults[idx].id);
                    clearInstitutionNameAutocomplete();
                }
            }
        });
    }

    // Kurum autocomplete fonksiyonu (güncelleme)
    (function() {
        const input = document.getElementById('institution-name');
        if (!input) return;
        let box, results = [], selected = -1;
        function createBox() {
            if (!box) {
                box = document.createElement('div');
                box.className = 'autocomplete-box';
                box.style.position = 'absolute';
                box.style.zIndex = 1000;
                box.style.minWidth = input.offsetWidth + 'px';
                input.parentNode.appendChild(box);
            }
            box.innerHTML = '';
            box.style.display = 'none';
        }
        function positionBox() {
            if (!box) return;
            box.style.top = (input.offsetTop + input.offsetHeight) + 'px';
            box.style.left = input.offsetLeft + 'px';
            box.style.minWidth = input.offsetWidth + 'px';
        }
        async function fetchInstitutions(q) {
            const url = `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(q)}`;
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.results || [];
        }
        function renderBox(items) {
            if (!box) createBox();
            if (!items || items.length === 0) { box.style.display = 'none'; return; }
            box.innerHTML = items.map((item, idx) => `
                <div class='autocomplete-item${idx === selected ? ' selected' : ''}' data-idx='${idx}'>
                    <span class='autocomplete-name'>${escapeHtml(item.display_name)}</span>
                    ${item.hint ? `<span class='autocomplete-hint'>${escapeHtml(item.hint)}</span>` : ''}
                </div>
            `).join('');
            box.style.display = 'block';
            positionBox();
            // Her render sonrası event ekle
            const itemsEls = box.querySelectorAll('.autocomplete-item');
            itemsEls.forEach((el, idx) => {
                el.onmousedown = function(e) {
                    e.preventDefault();
                    input.value = items[idx].display_name;
                    input.setAttribute('data-id', items[idx].id);
                    clearBox();
                    // Otomatik arama formunu submit et
                    const authorSearchInput = document.getElementById('author-search-input');
                    const authorSearchForm = document.getElementById('author-search-form');
                    if (authorSearchForm && authorSearchInput && authorSearchInput.value.trim().length > 0) {
                        authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                };
            });
        }
        function clearBox() {
            if (box) { box.innerHTML = ''; box.style.display = 'none'; }
            results = []; selected = -1;
        }
        input.addEventListener('input', async function() {
            input.removeAttribute('data-id');
            const val = input.value.trim();
            if (val.length < 2) { clearBox(); return; }
            try {
                const items = await fetchInstitutions(val);
                results = items; selected = -1;
                renderBox(items);
            } catch { clearBox(); }
        });
        input.addEventListener('keydown', function(e) {
            if (!results.length || !box || box.style.display === 'none') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selected = (selected + 1) % results.length;
                renderBox(results);
                const items = box.querySelectorAll('.autocomplete-item');
                if (items[selected]) items[selected].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selected = (selected - 1 + results.length) % results.length;
                renderBox(results);
                const items = box.querySelectorAll('.autocomplete-item');
                if (items[selected]) items[selected].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (selected >= 0 && results[selected]) {
                    e.preventDefault();
                    input.value = results[selected].display_name;
                    input.setAttribute('data-id', results[selected].id);
                    clearBox();
                    // Otomatik arama formunu submit et
                    const authorSearchInput = document.getElementById('author-search-input');
                    const authorSearchForm = document.getElementById('author-search-form');
                    if (authorSearchForm && authorSearchInput && authorSearchInput.value.trim().length > 0) {
                        authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                } else {
                    clearBox();
                }
            } else if (e.key === 'Escape') {
                clearBox();
            }
        });
        document.addEventListener('click', function(e) {
            if (e.target !== input && (!box || !box.contains(e.target))) clearBox();
        });
    })();

    // --- AUTOCOMPLETE (KURUM ADI, YAZAR FİLTRESİ) ---
    // Yazar filtrelerinde kurum adı autocomplete
    if (document.getElementById('author-institution')) {
        let box, results = [], selected = -1;
        const input = document.getElementById('author-institution');
        function createBox() {
            if (!box) {
                box = document.createElement('div');
                box.className = 'autocomplete-box';
                box.style.position = 'absolute';
                box.style.zIndex = 1000;
                box.style.minWidth = input.offsetWidth + 'px';
                input.parentNode.appendChild(box);
            }
            box.innerHTML = '';
            box.style.display = 'none';
        }
        function positionBox() {
            if (!box) return;
            box.style.top = (input.offsetTop + input.offsetHeight) + 'px';
            box.style.left = input.offsetLeft + 'px';
            box.style.minWidth = input.offsetWidth + 'px';
        }
        async function fetchInstitutions(q) {
            const url = `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(q)}`;
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.results || [];
        }
        function renderBox(items) {
            if (!box) createBox();
            if (!items || items.length === 0) { box.style.display = 'none'; return; }
            box.innerHTML = items.map((item, idx) => `
                <div class='autocomplete-item${idx === selected ? ' selected' : ''}' data-idx='${idx}'>
                    <span class='autocomplete-name'>${escapeHtml(item.display_name)}</span>
                    ${item.hint ? `<span class='autocomplete-hint'>${escapeHtml(item.hint)}</span>` : ''}
                </div>
            `).join('');
            box.style.display = 'block';
            positionBox();
            // Her render sonrası event ekle
            const itemsEls = box.querySelectorAll('.autocomplete-item');
            itemsEls.forEach((el, idx) => {
                el.onmousedown = function(e) {
                    e.preventDefault();
                    input.value = items[idx].display_name;
                    input.setAttribute('data-id', items[idx].id);
                    clearBox();
                    // Otomatik arama formunu submit et
                    const authorSearchInput = document.getElementById('author-search-input');
                    const authorSearchForm = document.getElementById('author-search-form');
                    if (authorSearchForm && authorSearchInput && authorSearchInput.value.trim().length > 0) {
                        authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                };
            });
        }
        function clearBox() {
            if (box) { box.innerHTML = ''; box.style.display = 'none'; }
            results = []; selected = -1;
        }
        input.addEventListener('input', async function() {
            input.removeAttribute('data-id');
            const val = input.value.trim();
            if (val.length < 2) { clearBox(); return; }
            try {
                const items = await fetchInstitutions(val);
                results = items; selected = -1;
                renderBox(items);
            } catch { clearBox(); }
        });
        input.addEventListener('keydown', function(e) {
            if (!results.length || !box || box.style.display === 'none') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selected = (selected + 1) % results.length;
                renderBox(results);
                const items = box.querySelectorAll('.autocomplete-item');
                if (items[selected]) items[selected].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selected = (selected - 1 + results.length) % results.length;
                renderBox(results);
                const items = box.querySelectorAll('.autocomplete-item');
                if (items[selected]) items[selected].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (selected >= 0 && results[selected]) {
                    e.preventDefault();
                    input.value = results[selected].display_name;
                    input.setAttribute('data-id', results[selected].id);
                    clearBox();
                    // Otomatik arama formunu submit et
                    const authorSearchInput = document.getElementById('author-search-input');
                    const authorSearchForm = document.getElementById('author-search-form');
                    if (authorSearchForm && authorSearchInput && authorSearchInput.value.trim().length > 0) {
                        authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                } else {
                    clearBox();
                }
            } else if (e.key === 'Escape') {
                clearBox();
            }
        });
        document.addEventListener('click', function(e) {
            if (e.target !== input && (!box || !box.contains(e.target))) clearBox();
        });
    }

    // --- Kurum Adı Otomatik Arama (Makale Bul) ---
    const institutionNameInput = document.getElementById('institution-name');
    if (institutionNameInput) {
        // input veya change eventinde otomatik arama tetikle
        institutionNameInput.addEventListener('input', function() {
            // data-id sıfırlanırsa da arama tetiklenmeli
            institutionNameInput.removeAttribute('data-id');
            if (paperSearchInput && paperSearchInput.value.trim().length > 0) {
                debouncedAutoSearch();
            }
        });
        // autocomplete seçiminde (mousedown) otomatik arama tetikle
        // (autocomplete kutusu zaten var, event ekle)
        setTimeout(() => {
            const autocompleteBox = document.querySelector('#institution-name ~ .autocomplete-box');
            if (autocompleteBox) {
                autocompleteBox.addEventListener('mousedown', function(e) {
                    const item = e.target.closest('.autocomplete-item');
                    if (item) {
                        // Seçimden hemen sonra arama tetikle
                        setTimeout(() => {
                            if (paperSearchInput && paperSearchInput.value.trim().length > 0) {
                                paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                            }
                        }, 10);
                    }
                });
            }
        }, 500); // autocomplete kutusu oluştuğunda ekle
    }

    // Profil sekmesi sekme tıklama ve içerik yönetimi
    if (document.getElementById('profile-section')) {
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', async function() {
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabName = tab.getAttribute('data-tab');
                const tabContent = document.getElementById('profile-tab-content');
                if (tabName === 'articles') {
                    tabContent.innerHTML = '<div class="loading">Kaydedilen makaleler yükleniyor...</div>';
                    try {
                        const ids = await getSavedWorkIds();
                        console.log('Kaydedilen makale ID\'leri:', ids);
                        if (!ids.length) {
                            tabContent.innerHTML = '<div class="error-message">Makale kaydetmediniz.</div>';
                            return;
                        }
                        // OpenAlex API'den toplu makale çek (max 50 id birleştirilebilir)
                        const chunks = [];
                        for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
                        let works = [];
                        for (const chunk of chunks) {
                            const url = `https://api.openalex.org/works?filter=openalex_id:${chunk.join('|')}`;
                            console.log('OpenAlex API URL:', url);
                            const resp = await fetch(url);
                            if (!resp.ok) {
                                const errorText = await resp.text();
                                console.error('OpenAlex API Error:', resp.status, errorText);
                                throw new Error(`OpenAlex API hatası (${resp.status}): ${errorText}`);
                            }
                            const data = await resp.json();
                            console.log('OpenAlex API Response:', data);
                            if (Array.isArray(data.results)) works = works.concat(data.results);
                        }
                        if (!works.length) {
                            tabContent.innerHTML = '<div class="error-message">Makale detayları alınamadı.</div>';
                            return;
                        }
                        // Giriş kontrolü ve kartları oluştur
                        const loggedIn = await isUserLoggedIn();
                        const cards = await Promise.all(works.map(w => renderPaperCardWithSave(w, ids, loggedIn)));
                        tabContent.innerHTML = `<div class='papers-list'>${cards.join('')}</div>`;
                        await afterRenderRemoveWorkBtns();
                    } catch (err) {
                        tabContent.innerHTML = `<div class='error-message'>Makaleler alınırken hata oluştu: ${err.message}</div>`;
                    }
                } else if (tabName === 'authors') {
                    tabContent.innerHTML = '<div class="loading">Kaydedilen yazarlar yükleniyor...</div>';
                    try {
                        const ids = await getSavedAuthorIds();
                        if (!ids.length) {
                            tabContent.innerHTML = '<div class="error-message">Yazar kaydetmediniz.</div>';
                            return;
                        }
                        // OpenAlex API'den toplu yazar çek (max 50 id birleştirilebilir)
                        const chunks = [];
                        for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
                        let authors = [];
                        for (const chunk of chunks) {
                            const url = `https://api.openalex.org/authors?filter=openalex_id:${chunk.join('|')}`;
                            console.log('OpenAlex Authors API URL:', url);
                            const resp = await fetch(url);
                            if (!resp.ok) {
                                const errorText = await resp.text();
                                console.error('OpenAlex Authors API Error:', resp.status, errorText);
                                throw new Error(`OpenAlex API hatası (${resp.status}): ${errorText}`);
                            }
                            const data = await resp.json();
                            console.log('OpenAlex Authors API Response:', data);
                            if (Array.isArray(data.results)) authors = authors.concat(data.results);
                        }
                        if (!authors.length) {
                            tabContent.innerHTML = '<div class="error-message">Yazar detayları alınamadı.</div>';
                            return;
                        }
                        // Giriş kontrolü ve kartları oluştur
                        const loggedIn = await isUserLoggedIn();
                        const cards = await Promise.all(authors.map(a => renderAuthorCardWithSave(a, ids, loggedIn)));
                        tabContent.innerHTML = `<div class='papers-list'>${cards.join('')}</div>`;
                        await afterRenderRemoveAuthorBtns();
                    } catch (err) {
                        tabContent.innerHTML = `<div class='error-message'>Yazarlar alınırken hata oluştu: ${err.message}</div>`;
                    }
                } else if (tabName === 'institutions') {
                    tabContent.innerHTML = '<div class="loading">Kaydedilen kurumlar yükleniyor...</div>';
                    try {
                        const ids = await getSavedInstitutionIds();
                        if (!ids.length) {
                            tabContent.innerHTML = '<div class="error-message">Kurum kaydetmediniz.</div>';
                            return;
                        }
                        // OpenAlex API'den toplu kurum çek (max 50 id birleştirilebilir)
                        const chunks = [];
                        for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
                        let institutions = [];
                        for (const chunk of chunks) {
                            const url = `https://api.openalex.org/institutions?filter=openalex_id:${chunk.join('|')}`;
                            console.log('OpenAlex Institutions API URL:', url);
                            const resp = await fetch(url);
                            if (!resp.ok) {
                                const errorText = await resp.text();
                                console.error('OpenAlex Institutions API Error:', resp.status, errorText);
                                throw new Error(`OpenAlex API hatası (${resp.status}): ${errorText}`);
                            }
                            const data = await resp.json();
                            console.log('OpenAlex Institutions API Response:', data);
                            if (Array.isArray(data.results)) institutions = institutions.concat(data.results);
                        }
                        if (!institutions.length) {
                            tabContent.innerHTML = '<div class="error-message">Kurum detayları alınamadı.</div>';
                            return;
                        }
                        // Giriş kontrolü ve kartları oluştur
                        const loggedIn = await isUserLoggedIn();
                        const cards = await Promise.all(institutions.map(inst => renderInstitutionCardWithSave(inst, ids, loggedIn)));
                        tabContent.innerHTML = `<div class='papers-list'>${cards.join('')}</div>`;
                        await afterRenderRemoveInstitutionBtns();
                    } catch (err) {
                        tabContent.innerHTML = `<div class='error-message'>Kurumlar alınırken hata oluştu: ${err.message}</div>`;
                    }
                }
            });
        });
        // Sayfa ilk açıldığında Makale Analizlerim sekmesi aktif
        const tabContent = document.getElementById('profile-tab-content');
        if (tabContent) {
            tabContent.innerHTML = '<div style="padding:2em 0 0 0;text-align:center;color:#888;">Henüz analiz kaydetmediniz.</div>';
        }
        // Sayfa ilk açıldığında Makaleler sekmesini otomatik olarak yükle
        const firstTab = document.querySelector('.profile-tab[data-tab="articles"]');
        if (firstTab) {
            firstTab.click();
        }
    }

    // Kullanıcının kitaplığındaki yazar id'lerini almak için fonksiyon
    async function getSavedAuthorIds() {
        try {
            const resp = await fetch('/api/v1/libraries/authors', { credentials: 'include' });
            if (!resp.ok) return [];
            const authors = await resp.json();
            return Array.isArray(authors) ? authors.map(a => a.openAlexId) : [];
        } catch { return []; }
    }

    // Kullanıcının kitaplığındaki kurum id'lerini almak için fonksiyon
    async function getSavedInstitutionIds() {
        try {
            const resp = await fetch('/api/v1/libraries/institutions', { credentials: 'include' });
            if (!resp.ok) return [];
            const institutions = await resp.json();
            return Array.isArray(institutions) ? institutions.map(i => i.openAlexId) : [];
        } catch { return []; }
    }

    // Kurum kartı render fonksiyonu (buton eklenmiş hali)
    async function renderInstitutionCardWithSave(inst, savedIds, loggedIn) {
        const country = inst.country_code ? `<span class='institution-meta-badge' title='Ülke'>🌍 Ülke: ${inst.country_code.toUpperCase()}</span>` : '';
        const type = inst.type ? `<span class='institution-meta-badge' title='Tür'>🏷️ Tür: ${escapeHtml(inst.type)}</span>` : '';
        const city = inst.city ? `<span class='institution-meta-badge' title='Şehir'>🏙️ Şehir: ${escapeHtml(inst.city)}</span>` : '';
        const region = inst.region ? `<span class='institution-meta-badge' title='Bölge'>🗺️ Bölge: ${escapeHtml(inst.region)}</span>` : '';
        const cited = typeof inst.cited_by_count === 'number' ? `<span class='institution-meta-badge' title='Toplam Atıf'>⭐ Toplam Atıf: ${inst.cited_by_count.toLocaleString()}</span>` : '';
        // h-index, i10-index, 2Y atıf ortalaması
        const hindex = inst.summary_stats && typeof inst.summary_stats.h_index === 'number' ? `<span class='institution-meta-badge' title='h-index'>h-index: ${inst.summary_stats.h_index}</span>` : '';
        const i10 = inst.summary_stats && typeof inst.summary_stats.i10_index === 'number' ? `<span class='institution-meta-badge' title='i10-index'>i10: ${inst.summary_stats.i10_index}</span>` : '';
        const meanCited = inst.summary_stats && typeof inst.summary_stats['2yr_mean_citedness'] === 'number' ? `<span class='institution-meta-badge' title='2 Yıllık Ortalama Atıf'>2Y Atıf Ort: ${inst.summary_stats['2yr_mean_citedness'].toFixed(2)}</span>` : '';
        // Alanlar (x_concepts)
        let concepts = '';
        if (inst.x_concepts && inst.x_concepts.length > 0) {
            const shown = inst.x_concepts.slice(0, 3).map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`);
            const more = inst.x_concepts.length > 3 ? `<span class='concept-badge concept-badge-more'>+${inst.x_concepts.length - 3} alan</span>` : '';
            concepts = shown.join(' ') + more;
        }
        // Wikipedia, Wikidata, ROR linkleri (ikon + metin)
        const ids = inst.ids || {};
        const wikipedia = ids.wikipedia ? `<a href='${ids.wikipedia}' target='_blank' title='Wikipedia' class='institution-link'><span style='font-size:1.1em;'>📖</span> Wikipedia</a>` : '';
        const wikidata = ids.wikidata ? `<a href='${ids.wikidata}' target='_blank' title='Wikidata' class='institution-link'><span style='font-size:1.1em;'>🗃️</span> Wikidata</a>` : '';
        const ror = inst.ror ? `<a href='${inst.ror}' target='_blank' title='ROR' class='institution-link'><span style='font-size:1.1em;'>🏢</span> ROR</a>` : '';
        // Roller (en çok yayına sahip ilk rol)
        let topRole = '';
        if (Array.isArray(inst.roles) && inst.roles.length > 0) {
            const sortedRoles = inst.roles.slice().sort((a, b) => (b.works_count || 0) - (a.works_count || 0));
            const role = sortedRoles[0];
            if (role && role.role) {
                topRole = `<span class='institution-meta-badge' title='Rol'>Rol: ${escapeHtml(role.role)} (${role.works_count})</span>`;
            }
        }
        const image = inst.image_thumbnail_url ? `<img src='${inst.image_thumbnail_url}' alt='Kurum Logosu' class='institution-logo' style='width:48px;height:48px;border-radius:50%;margin-bottom:0.7em;'>` : '';
        // Tüm Yayınlar butonu (yazar kartındaki gibi)
        const allWorksBtn = typeof inst.works_count === 'number' && inst.works_count > 0 && inst.works_api_url ? `<button class="btn-primary institution-works-btn" data-institution-id="${inst.id}" data-works-url="${inst.works_api_url}" data-initial-count="${inst.works_count}">Tüm Yayınlar (${inst.works_count})</button>` : '';
        
        // Kaydetme ve kaldırma butonları
        const openAlexId = inst.id.startsWith('https://openalex.org/') ? inst.id.split('/').pop() : inst.id;
        const isSaved = savedIds.includes(openAlexId);
        let saveBtn = '';
        let removeBtn = '';
        if (loggedIn) {
            if (isSaved) {
                saveBtn = `<button class="btn-primary save-institution-btn saved" data-institution-id="${openAlexId}" disabled>Kaydedildi</button>`;
                removeBtn = `<button class="btn-secondary remove-institution-btn" data-institution-id="${openAlexId}">Kaldır</button>`;
            } else {
                saveBtn = `<button class="btn-primary save-institution-btn" data-institution-id="${openAlexId}">Kitaplığa Kaydet</button>`;
            }
        }

        return `
            <div class="paper-card institution-card" data-institution-id="${openAlexId}">
                ${image}
                <div class="paper-title"><a href="#" class="institution-detail-link" data-institution-id="${inst.id}">${escapeHtml(inst.display_name)}</a></div>
                <div class="paper-meta">
                    ${country}
                    ${type}
                    ${city}
                    ${region}
                    ${topRole}
                </div>
                <div class="paper-meta">
                    ${concepts}
                </div>
                <div class="paper-meta">
                    ${hindex}
                    ${i10}
                    ${meanCited}
                </div>
                <div class="paper-meta">
                    ${cited}
                    ${wikipedia}
                    ${wikidata}
                    ${ror}
                </div>
                <div class="paper-meta" style="margin-top:0.7em;">
                    ${allWorksBtn}
                    ${saveBtn}
                    ${removeBtn}
                </div>
            </div>
        `;
    }

    // Yazar kartı render fonksiyonu (buton eklenmiş hali)
    async function renderAuthorCardWithSave(author, savedIds, loggedIn) {
        const orcid = author.orcid ? `<a href='${author.orcid}' target='_blank' title='ORCID'><span style='font-size:1.1em;'>🆔</span> ORCID</a>` : '';
        const works = typeof author.works_count === 'number' && author.works_count > 0 ? `<a href="#" class="author-works-link" data-author-id="${author.id}" data-works-url="${author.works_api_url}">Tüm Yayınlar (${author.works_count})</a>` : '';
        const cited = typeof author.cited_by_count === 'number' ? `<span title='Toplam Atıf'>⭐ ${author.cited_by_count}</span>` : '';
        const hindex = author.summary_stats && typeof author.summary_stats.h_index === 'number' ? `<span title='h-index'>h-index: ${author.summary_stats.h_index}</span>` : '';
        const i10 = author.summary_stats && typeof author.summary_stats.i10_index === 'number' ? `<span title='i10-index'>i10: ${author.summary_stats.i10_index}</span>` : '';
        const meanCited = author.summary_stats && typeof author.summary_stats['2yr_mean_citedness'] === 'number' ? `<span title='2 Yıllık Ortalama Atıf'>2Y Atıf Ort: ${author.summary_stats['2yr_mean_citedness'].toFixed(2)}</span>` : '';
        const insts = (author.last_known_institutions || []).map(i => escapeHtml(i.display_name)).join(', ');
        const affiliations = (author.affiliations || []).map(a => {
            const years = a.years && a.years.length > 0 ? ` (${a.years[0]}-${a.years[a.years.length-1]})` : '';
            return a.institution && a.institution.display_name ? `${escapeHtml(a.institution.display_name)}${years}` : '';
        }).filter(Boolean).join(', ');
        let concepts = '';
        if (author.x_concepts && author.x_concepts.length > 0) {
            const shown = author.x_concepts.slice(0, 3).map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`);
            const more = author.x_concepts.length > 3 ? `<span class='concept-badge concept-badge-more'>+${author.x_concepts.length - 3} alan</span>` : '';
            concepts = shown.join(' ') + more;
        }
        const ids = author.ids || {};
        const scopus = ids.scopus ? `<a href='${ids.scopus}' target='_blank' title='Scopus'><span style='font-size:1.1em;'>🔗</span> Scopus</a>` : '';
        const twitter = ids.twitter ? `<a href='https://twitter.com/${ids.twitter}' target='_blank' title='Twitter'><span style='font-size:1.1em;'>🐦</span> Twitter</a>` : '';
        const wikipedia = ids.wikipedia ? `<a href='${ids.wikipedia}' target='_blank' title='Wikipedia'><span style='font-size:1.1em;'>📖</span> Wikipedia</a>` : '';
        const altNames = (author.display_name_alternatives || []).length > 0 ? `<div class='author-alt-names'><strong>Alternatif İsimler:</strong> ${author.display_name_alternatives.map(escapeHtml).join(', ')}</div>` : '';
        // Kitaplığa kaydet butonu
        let saveBtn = '';
        let removeBtn = '';
        if (loggedIn) {
            const openAlexId = author.id.startsWith('https://openalex.org/') ? author.id.split('/').pop() : author.id;
            if (savedIds.includes(openAlexId)) {
                saveBtn = `<button class="btn-primary save-author-btn" data-author-id="${openAlexId}" disabled>Kaydedildi</button>`;
                removeBtn = `<button class="btn-secondary remove-author-btn" data-author-id="${openAlexId}">Kaldır</button>`;
            } else {
                saveBtn = `<button class="btn-primary save-author-btn" data-author-id="${openAlexId}">Kitaplığa Kaydet</button>`;
            }
        }
        return `
            <div class="paper-card author-card">
                <div class="paper-title"><a href="#" class="author-detail-link" data-author-id="${author.id}">${escapeHtml(author.display_name)}</a></div>
                ${altNames}
                <div class="paper-meta">
                    ${orcid}
                    ${works}
                    ${cited}
                    ${hindex}
                    ${i10}
                    ${meanCited}
                    ${scopus}
                    ${twitter}
                    ${wikipedia}
                </div>
                ${insts ? `<div class='paper-meta'><span>🏢 Son Kurum: ${insts}</span></div>` : ''}
                ${concepts ? `<div class='author-concepts-row'>${concepts}</div>` : ''}
                ${(saveBtn || removeBtn) ? `<div class='paper-meta'>${saveBtn} ${removeBtn}</div>` : ''}
            </div>
        `;
    }

    // Yazar arama sonuçlarını render eden fonksiyonu güncelle
    async function renderAuthorSearchResults(authors) {
        const count = authorTotalCount || (authors && authors.length ? authors.length : 0);
        const countHtml = `<span><b>${count}</b></span> <span>yazar bulundu</span>`;
        const countDiv = document.getElementById('author-search-result-count');
        if (countDiv) {
            if (authors && authors.length > 0) {
                countDiv.innerHTML = countHtml;
                countDiv.style.display = '';
            } else {
                countDiv.innerHTML = '';
                countDiv.style.display = 'none';
            }
        }
        if (!authors || authors.length === 0) {
            return `<div class="error-message">Yazar bulunamadı.</div>`;
        }
        // Giriş ve kaydedilen yazarlar kontrolü
        const loggedIn = await isUserLoggedIn();
        const savedIds = loggedIn ? await getSavedAuthorIds() : [];
        // Her kartı async render et
        const cards = await Promise.all(authors.map(a => renderAuthorCardWithSave(a, savedIds, loggedIn)));
        return `<div class='papers-list'>${cards.join('')}</div>`;
    }

    // Yazar arama sonuçları DOM'a basılırken butonlara event ekle
    async function afterRenderAuthorSearchResults() {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) return;
        document.querySelectorAll('.save-author-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const authorId = btn.getAttribute('data-author-id');
                btn.disabled = true;
                btn.textContent = 'Kaydediliyor...';
                try {
                    const resp = await fetch('/api/v1/libraries/authors', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ authorsOpenAlexID: authorId })
                    });
                    if (resp.ok) {
                        btn.textContent = 'Kaydedildi';
                    } else {
                        const err = await resp.text();
                        btn.textContent = 'Hata';
                        setTimeout(() => { btn.textContent = 'Kitaplığa Kaydet'; btn.disabled = false; }, 2000);
                        alert('Kaydedilemedi: ' + err);
                    }
                } catch (err) {
                    btn.textContent = 'Hata';
                    setTimeout(() => { btn.textContent = 'Kitaplığa Kaydet'; btn.disabled = false; }, 2000);
                    alert('Kaydedilemedi: ' + err.message);
                }
            });
        });
    }

    // fetchAndRenderAuthors fonksiyonunu güncelle: render sonrası afterRenderAuthorSearchResults çağrılacak
    async function fetchAndRenderAuthors(query, filters, sort, page) {
        authorSearchLoading.style.display = 'block';
        try {
            const url = buildOpenAlexAuthorUrl(query, filters, sort, page);
            const resp = await fetch(url);
            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`OpenAlex API hatası (${resp.status}): ${errorText}`);
            }
            const data = await resp.json();
            authorTotalCount = data.meta && data.meta.count ? data.meta.count : 0;
            authorTotalPages = Math.ceil(authorTotalCount / 12);
            if (!data.results || data.results.length === 0) {
                authorSearchResult.innerHTML = '<div class="error-message">Yazar bulunamadı.</div>';
            } else {
                let paginationHtml = renderAuthorPagination(page, authorTotalPages);
                authorSearchResult.innerHTML =
                    paginationHtml +
                    await renderAuthorSearchResults(data.results) +
                    paginationHtml;
                await afterRenderAuthorSearchResults();
            }
        } catch (err) {
            let msg = err.message || '';
            if (msg.includes('raw_institution_name.search is not a valid field') || msg.includes('Invalid query parameters error')) {
                authorSearchResult.innerHTML = `<div class='error-message'>Kurum adı ile serbest metin araması desteklenmiyor, lütfen kurum adını listeden seçin.</div>`;
            } else {
                authorSearchResult.innerHTML = `<div class='error-message'>Yazarlar alınırken hata oluştu: ${msg}</div>`;
            }
        }
        authorSearchLoading.style.display = 'none';
    }

    // afterRenderAuthorSearchResults fonksiyonunun hemen altına, remove-author-btn için event handler ekle
    async function afterRenderRemoveAuthorBtns() {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) return;
        document.querySelectorAll('.remove-author-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const authorId = btn.getAttribute('data-author-id');
                btn.disabled = true;
                btn.textContent = 'Kaldırılıyor...';
                try {
                    const resp = await fetch(`/api/v1/libraries/authors/${authorId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    if (resp.ok) {
                        // Kartı DOM'dan kaldır
                        const card = btn.closest('.author-card');
                        if (card) card.remove();
                    } else {
                        const err = await resp.text();
                        btn.textContent = 'Hata';
                        setTimeout(() => { btn.textContent = 'Kaldır'; btn.disabled = false; }, 2000);
                        alert('Kaldırılamadı: ' + err);
                    }
                } catch (err) {
                    btn.textContent = 'Hata';
                    setTimeout(() => { btn.textContent = 'Kaldır'; btn.disabled = false; }, 2000);
                    alert('Kaldırılamadı: ' + err.message);
                }
            });
        });
    }

    // Makale arama sonuçları DOM'a basılırken butonlara event ekle
    async function afterRenderPaperSearchResults() {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) return;
        document.querySelectorAll('.save-work-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const workId = btn.getAttribute('data-work-id');
                btn.disabled = true;
                btn.textContent = 'Kaydediliyor...';
                try {
                    const resp = await fetch('/api/v1/libraries/works', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ openAlexId: workId })
                    });
                    if (resp.ok) {
                        btn.textContent = 'Kaydedildi';
                    } else {
                        const err = await resp.text();
                        btn.textContent = 'Hata';
                        setTimeout(() => { btn.textContent = 'Kitaplığa Kaydet'; btn.disabled = false; }, 2000);
                        alert('Kaydedilemedi: ' + err);
                    }
                } catch (err) {
                    btn.textContent = 'Hata';
                    setTimeout(() => { btn.textContent = 'Kitaplığa Kaydet'; btn.disabled = false; }, 2000);
                    alert('Kaydedilemedi: ' + err.message);
                }
            });
        });
    }

    // afterRenderPaperSearchResults fonksiyonunun hemen altına, remove-work-btn için event handler ekle
    async function afterRenderRemoveWorkBtns() {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) return;
        document.querySelectorAll('.remove-work-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const workId = btn.getAttribute('data-work-id');
                btn.disabled = true;
                btn.textContent = 'Kaldırılıyor...';
                try {
                    const resp = await fetch(`/api/v1/libraries/works/${workId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    if (resp.ok) {
                        // Kartı DOM'dan kaldır
                        const card = btn.closest('.paper-card');
                        if (card) card.remove();
                    } else {
                        const err = await resp.text();
                        btn.textContent = 'Hata';
                        setTimeout(() => { btn.textContent = 'Kaldır'; btn.disabled = false; }, 2000);
                        alert('Kaldırılamadı: ' + err);
                    }
                } catch (err) {
                    btn.textContent = 'Hata';
                    setTimeout(() => { btn.textContent = 'Kaldır'; btn.disabled = false; }, 2000);
                    alert('Kaldırılamadı: ' + err.message);
                }
            });
        });
    }

    async function afterRenderInstitutionSearchResults() {
        // Kurum kaydetme butonları için event listener'ları ekle
        document.querySelectorAll('.save-institution-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const institutionId = btn.getAttribute('data-institution-id');
                const isSaved = btn.classList.contains('saved');
                
                try {
                    if (isSaved) {
                        // Kurumdan çıkar
                        const resp = await fetch(`/api/v1/libraries/institutions/${institutionId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        if (resp.ok) {
                            btn.textContent = 'Kitaplığa Kaydet';
                            btn.classList.remove('saved');
                        }
                    } else {
                        // Kuruma ekle
                        const resp = await fetch('/api/v1/libraries/institutions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ openAlexId: institutionId })
                        });
                        if (resp.ok) {
                            btn.textContent = 'Kaydedildi';
                            btn.classList.add('saved');
                        }
                    }
                } catch (err) {
                    console.error('Kurum kaydetme hatası:', err);
                }
            });
        });
    }

    async function afterRenderRemoveInstitutionBtns() {
        // Kurum kaldırma butonları için event listener'ları ekle
        document.querySelectorAll('.remove-institution-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const institutionId = btn.getAttribute('data-institution-id');
                btn.disabled = true;
                btn.textContent = 'Kaldırılıyor...';
                try {
                    const resp = await fetch(`/api/v1/libraries/institutions/${institutionId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    if (resp.ok) {
                        // Kartı DOM'dan kaldır
                        const card = btn.closest('.paper-card');
                        if (card) card.remove();
                    } else {
                        const err = await resp.text();
                        btn.textContent = 'Hata';
                        setTimeout(() => { btn.textContent = 'Kaldır'; btn.disabled = false; }, 2000);
                        alert('Kaldırılamadı: ' + err);
                    }
                } catch (err) {
                    btn.textContent = 'Hata';
                    setTimeout(() => { btn.textContent = 'Kaldır'; btn.disabled = false; }, 2000);
                    alert('Kaldırılamadı: ' + err.message);
                }
            });
        });
    }

    // Profil sekmesinde yazarlar tabı render edildikten sonra afterRenderRemoveAuthorBtns fonksiyonunu çağır
    // (tabName === 'authors') bloğunda, tabContent.innerHTML doldurulduktan hemen sonra ekle:
    // await afterRenderRemoveAuthorBtns();
}); 

// Kullanıcı giriş kontrolü için global fonksiyon
async function isUserLoggedIn() {
    try {
        const resp = await fetch('/api/v1/users/profile', { credentials: 'include' });
        return resp.ok;
    } catch { return false; }
}

// Kullanıcının kitaplığındaki makale id'lerini almak için global fonksiyon
async function getSavedWorkIds() {
    try {
        const resp = await fetch('/api/v1/libraries/works', { credentials: 'include' });
        if (!resp.ok) return [];
        const works = await resp.json();
        return Array.isArray(works) ? works.map(w => w.openAlexId) : [];
    } catch { return []; }
}

// Makale detay modalı render fonksiyonu
function renderWorkDetailModal(work) {
    let html = `<h2>${escapeHtml(work.title || work.display_name || '')}</h2>`;
    // Yazarlar
    if (Array.isArray(work.authorships) && work.authorships.length > 0) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Yazarlar:</span> <span class='work-modal-value'>` +
            work.authorships.map(a => {
                let author = escapeHtml(a.author?.display_name || a.raw_author_name || '');
                if (a.author?.orcid) author += ` <a href='${a.author.orcid}' target='_blank' title='ORCID' style='font-size:1.1em;vertical-align:middle;'>🆔</a>`;
                if (Array.isArray(a.institutions) && a.institutions.length > 0) {
                    author += ` <span class='author-institution'>(${a.institutions.map(i => escapeHtml(i.display_name)).join(', ')}`;
                    if (a.institutions.some(i => i.country_code)) {
                        const countries = a.institutions.map(i => i.country_code).filter(Boolean).join(', ');
                        author += countries ? `, ${countries}` : '';
                    }
                    author += ")</span>";
                }
                return author;
            }).join(', ') + `</span></div>`;
    }
    // Makale türü
    if (work.type) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Tür:</span> <span class='work-modal-value'>${escapeHtml(work.type)}</span></div>`;
    }
    // Dergi/kitap/proceedings ve yayıncı
    if (work.primary_location && work.primary_location.source) {
        if (work.primary_location.source.display_name) {
            html += `<div class='work-modal-section'><span class='work-modal-label'>Kaynak:</span> <span class='work-modal-value'>${escapeHtml(work.primary_location.source.display_name)}</span></div>`;
        }
        if (work.primary_location.source.publisher) {
            html += `<div class='work-modal-section'><span class='work-modal-label'>Yayıncı:</span> <span class='work-modal-value'>${escapeHtml(work.primary_location.source.publisher)}</span></div>`;
        }
        if (work.primary_location.source.country_code) {
            html += `<div class='work-modal-section'><span class='work-modal-label'>Yayıncı Ülke:</span> <span class='work-modal-value'>${escapeHtml(work.primary_location.source.country_code)}</span></div>`;
        }
        if (work.primary_location.source.issn_l || (work.primary_location.source.issn && work.primary_location.source.issn.length > 0)) {
            html += `<div class='work-modal-section'><span class='work-modal-label'>ISSN:</span> <span class='work-modal-value'>${escapeHtml(work.primary_location.source.issn_l || (work.primary_location.source.issn || []).join(', '))}</span></div>`;
        }
        if (work.primary_location.source.isbn && work.primary_location.source.isbn.length > 0) {
            html += `<div class='work-modal-section'><span class='work-modal-label'>ISBN:</span> <span class='work-modal-value'>${escapeHtml(work.primary_location.source.isbn.join(', '))}</span></div>`;
        }
    }
    // Dil
    if (work.language) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Dil:</span> <span class='work-modal-value'>${escapeHtml(work.language)}</span></div>`;
    }
    // Yayın tarihi (hem yıl hem tam tarih)
    if (work.publication_year || work.publication_date) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Yayın:</span> <span class='work-modal-value'>${work.publication_year ? work.publication_year : ''}${work.publication_date ? ' - ' + escapeHtml(work.publication_date) : ''}</span></div>`;
    }
    // Versiyon
    if (work.version) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Versiyon:</span> <span class='work-modal-value'>${escapeHtml(work.version)}</span></div>`;
    }
    // Güncellenme tarihi
    if (work.updated_date) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Güncellenme:</span> <span class='work-modal-value'>${escapeHtml(work.updated_date)}</span></div>`;
    }
    // DOI
    if (work.doi) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>DOI:</span> <a href='${work.doi}' target='_blank'>${work.doi}</a></div>`;
    }
    // Açık erişim
    if (work.open_access && work.open_access.is_oa) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Açık Erişim:</span> <a href='${work.open_access.oa_url}' target='_blank'>${work.open_access.oa_url}</a></div>`;
    }
    // Tam metin erişim kaynakları
    if (work.open_access && Array.isArray(work.open_access.locations) && work.open_access.locations.length > 0) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Tam Metin Kaynakları:</span> <span class='work-modal-value'>` +
            work.open_access.locations.map(loc => {
                let label = loc.type ? escapeHtml(loc.type) : 'Kaynak';
                let url = loc.url || loc.landing_page_url;
                if (url) {
                    return `<a href='${url}' target='_blank'>${label}</a>`;
                } else {
                    return label;
                }
            }).join(', ') + `</span></div>`;
    }
    // Atıf sayısı
    if (typeof work.cited_by_count === 'number') {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Atıf:</span> <span class='work-modal-value'>${work.cited_by_count}</span></div>`;
    }
    // Referans verilen makale sayısı
    if (Array.isArray(work.referenced_works)) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Referans:</span> <span class='work-modal-value'>${work.referenced_works.length}</span></div>`;
    }
    // Anahtar kelimeler ve skorları
    if (Array.isArray(work.concepts) && work.concepts.length > 0) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Anahtar Kelimeler:</span></div><div class='work-modal-keywords'>` +
            work.concepts.map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`).join('') + `</div>`;
    }
    // Özet (plain veya inverted index)
    if (work.abstract) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Özet:</span><div class='work-modal-abstract'>${escapeHtml(work.abstract)}</div></div>`;
    } else if (work.abstract_inverted_index) {
        html += `<div class='work-modal-section'><span class='work-modal-label'>Özet:</span><div class='work-modal-abstract'>${renderOpenAlexAbstract(work.abstract_inverted_index)}</div></div>`;
    }
    // PDF veya tam metin
    if (work.primary_location && work.primary_location.pdf_url) {
        html += `<a href='${work.primary_location.pdf_url}' target='_blank' class='btn-primary'>PDF'yi Aç</a>`;
    }
    return html;
}
// OpenAlex abstract_inverted_index'i düz metne çeviren fonksiyon
function renderOpenAlexAbstract(abstract_inverted_index) {
    // Pozisyonlara göre kelimeleri sırala
    const arr = [];
    for (const [word, positions] of Object.entries(abstract_inverted_index)) {
        positions.forEach(pos => { arr[pos] = word; });
    }
    return arr.join(' ');
}
// Yazar detay modalı render fonksiyonu
function renderAuthorDetailModal(author) {
    let html = `<h2>${escapeHtml(author.display_name || '')}</h2>`;
    // ORCID
    if (author.orcid) {
        html += `<div class='author-modal-section'><span class='author-modal-label'>ORCID:</span> <a href='${author.orcid}' target='_blank'>${author.orcid}</a></div>`;
    }
    // Alternatif isimler
    if (Array.isArray(author.display_name_alternatives) && author.display_name_alternatives.length > 0) {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Alternatif İsimler:</span> <span class='author-modal-value'>${author.display_name_alternatives.map(escapeHtml).join(', ')}</span></div>`;
    }
    // Son kurum
    if (Array.isArray(author.last_known_institutions) && author.last_known_institutions.length > 0) {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Son Kurum:</span> <span class='author-modal-value'>${author.last_known_institutions.map(i => escapeHtml(i.display_name)).join(', ')}</span></div>`;
    }
    // Ülke
    if (Array.isArray(author.last_known_institutions) && author.last_known_institutions.length > 0) {
        const countries = author.last_known_institutions.map(i => i.country_code).filter(Boolean).join(', ');
        if (countries) {
            html += `<div class='author-modal-section'><span class='author-modal-label'>Ülke:</span> <span class='author-modal-value'>${countries}</span></div>`;
        }
    }
    // Yayın/atıf istatistikleri
    if (typeof author.works_count === 'number') {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Toplam Yayın:</span> <span class='author-modal-value'>${author.works_count}</span></div>`;
    }
    if (typeof author.cited_by_count === 'number') {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Toplam Atıf:</span> <span class='author-modal-value'>${author.cited_by_count}</span></div>`;
    }
    if (author.summary_stats && typeof author.summary_stats.h_index === 'number') {
        html += `<div class='author-modal-section'><span class='author-modal-label'>h-index:</span> <span class='author-modal-value'>${author.summary_stats.h_index}</span></div>`;
    }
    if (author.summary_stats && typeof author.summary_stats.i10_index === 'number') {
        html += `<div class='author-modal-section'><span class='author-modal-label'>i10-index:</span> <span class='author-modal-value'>${author.summary_stats.i10_index}</span></div>`;
    }
    if (author.summary_stats && typeof author.summary_stats['2yr_mean_citedness'] === 'number') {
        html += `<div class='author-modal-section'><span class='author-modal-label'>2Y Atıf Ort:</span> <span class='author-modal-value'>${author.summary_stats['2yr_mean_citedness'].toFixed(2)}</span></div>`;
    }
    // Alanlar (konseptler)
    if (Array.isArray(author.x_concepts) && author.x_concepts.length > 0) {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Alanlar:</span></div><div class='author-modal-keywords'>` +
            author.x_concepts.map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`).join('') + `</div>`;
    }
    // Kurum geçmişi (yıllara göre tablo öncesine alındı)
    if (Array.isArray(author.affiliations) && author.affiliations.length > 0) {
        const affiliations = author.affiliations.map(a => {
            const years = a.years && a.years.length > 0 ? ` (${a.years[0]}-${a.years[a.years.length-1]})` : '';
            return a.institution && a.institution.display_name ? `${escapeHtml(a.institution.display_name)}${years}` : '';
        }).filter(Boolean).join(', ');
        if (affiliations) {
            html += `<div class='author-modal-section'><span class='author-modal-label'>Kurum Geçmişi:</span> <span class='author-modal-value'>${affiliations}</span></div>`;
        }
    }
    // Yıllara göre yayın/atıf tablosu
    if (Array.isArray(author.counts_by_year) && author.counts_by_year.length > 0) {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Yıllara Göre Yayın/Atıf:</span></div>` + renderCountsByYearTable(author.counts_by_year);
    }
    // Sosyal/linkler
    if (author.ids) {
        let links = [];
        if (author.ids.scopus) links.push(`<a href='${author.ids.scopus}' target='_blank'>Scopus</a>`);
        if (author.ids.twitter) links.push(`<a href='https://twitter.com/${author.ids.twitter}' target='_blank'>Twitter</a>`);
        if (author.ids.wikipedia) links.push(`<a href='${author.ids.wikipedia}' target='_blank'>Wikipedia</a>`);
        if (links.length > 0) {
            html += `<div class='author-modal-section'><span class='author-modal-label'>Linkler:</span> <span class='author-modal-value'>${links.join(' | ')}</span></div>`;
        }
    }
    // Biyografi
    if (author.bio) {
        html += `<div class='author-modal-section'><span class='author-modal-label'>Biyografi:</span> <span class='author-modal-value'>${escapeHtml(author.bio)}</span></div>`;
    }
    return html;
}

// Kurum detay modalı render fonksiyonu
function renderInstitutionDetailModal(institution) {
    let html = `<h2>${escapeHtml(institution.display_name || '')}</h2>`;
    
    // Kurum logosu
    if (institution.image_thumbnail_url) {
        html += `<div class='institution-modal-logo'><img src='${institution.image_thumbnail_url}' alt='Kurum Logosu' style='width:80px;height:80px;border-radius:50%;margin-bottom:1rem;'></div>`;
    }
    
    // ROR ID
    if (institution.ror) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>ROR ID:</span> <a href='${institution.ror}' target='_blank'>${institution.ror}</a></div>`;
    }
    
    // Alternatif isimler
    if (Array.isArray(institution.display_name_alternatives) && institution.display_name_alternatives.length > 0) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Alternatif İsimler:</span> <span class='institution-modal-value'>${institution.display_name_alternatives.map(escapeHtml).join(', ')}</span></div>`;
    }
    
    // Kurum türü
    if (institution.type) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Tür:</span> <span class='institution-modal-value'>${escapeHtml(institution.type)}</span></div>`;
    }
    
    // Ülke
    if (institution.country_code) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Ülke:</span> <span class='institution-modal-value'>${institution.country_code.toUpperCase()}</span></div>`;
    }
    
    // Şehir
    if (institution.city) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Şehir:</span> <span class='institution-modal-value'>${escapeHtml(institution.city)}</span></div>`;
    }
    
    // Bölge
    if (institution.region) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Bölge:</span> <span class='institution-modal-value'>${escapeHtml(institution.region)}</span></div>`;
    }
    
    // Yayın/atıf istatistikleri
    if (typeof institution.works_count === 'number') {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Toplam Yayın:</span> <span class='institution-modal-value'>${institution.works_count.toLocaleString()}</span></div>`;
    }
    if (typeof institution.cited_by_count === 'number') {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Toplam Atıf:</span> <span class='institution-modal-value'>${institution.cited_by_count.toLocaleString()}</span></div>`;
    }
    if (institution.summary_stats && typeof institution.summary_stats.h_index === 'number') {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>h-index:</span> <span class='institution-modal-value'>${institution.summary_stats.h_index}</span></div>`;
    }
    if (institution.summary_stats && typeof institution.summary_stats.i10_index === 'number') {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>i10-index:</span> <span class='institution-modal-value'>${institution.summary_stats.i10_index}</span></div>`;
    }
    if (institution.summary_stats && typeof institution.summary_stats['2yr_mean_citedness'] === 'number') {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>2Y Atıf Ort:</span> <span class='institution-modal-value'>${institution.summary_stats['2yr_mean_citedness'].toFixed(2)}</span></div>`;
    }
    
    // Alanlar (konseptler)
    if (Array.isArray(institution.x_concepts) && institution.x_concepts.length > 0) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Alanlar:</span></div><div class='institution-modal-keywords'>` +
            institution.x_concepts.map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`).join('') + `</div>`;
    }
    
    // Roller (her biri ayrı div içinde badge)
    if (Array.isArray(institution.roles) && institution.roles.length > 0) {
        html += `<div class='institution-modal-section' style='display:flex;align-items:center;gap:1.1em;flex-wrap:wrap;'>` +
            `<span class='institution-modal-label' style='margin-bottom:0;'>Roller:</span>` +
            `<div class='institution-modal-roles'>` +
            institution.roles.map(r =>
                `<span class='role-badge'>${escapeHtml(r.role)} <span class='role-badge-count'>(${r.works_count})</span></span>`
            ).join(' ') +
            `</div></div>`;
    }
    
    // Hiyerarşi (sadece doluysa göster)
    if (Array.isArray(institution.lineage) && institution.lineage.length > 0) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Hiyerarşi:</span></div><div class='institution-modal-lineage'>` +
            institution.lineage.map(l => `<div class='lineage-item'>${escapeHtml(l.display_name)}</div>`).join('') + `</div>`;
    }
    
    // Sosyal/linkler
    if (institution.ids) {
        let links = [];
        if (institution.ids.wikipedia) links.push(`<a href='${institution.ids.wikipedia}' target='_blank'>Wikipedia</a>`);
        if (institution.ids.wikidata) links.push(`<a href='${institution.ids.wikidata}' target='_blank'>Wikidata</a>`);
        if (institution.ids.mag) links.push(`<a href='https://www.microsoft.com/en-us/research/project/microsoft-academic-graph/' target='_blank'>MAG</a>`);
        if (links.length > 0) {
            html += `<div class='institution-modal-section'><span class='institution-modal-label'>Linkler:</span> <span class='institution-modal-value'>${links.join(' | ')}</span></div>`;
        }
    }
    
    // Güncellenme tarihi
    if (institution.updated_date) {
        html += `<div class='institution-modal-section'><span class='institution-modal-label'>Güncellenme:</span> <span class='institution-modal-value'>${escapeHtml(institution.updated_date)}</span></div>`;
    }
    
    return html;
} 