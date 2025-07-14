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
        // Yazar listesini kısalt (ilk 3 yazar + "ve diğerleri")
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
            </div>
        `;
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
        let url = `https://api.openalex.org/authors?search=${encodeURIComponent(query)}&per_page=10&page=${page}&select=id,display_name,display_name_alternatives,orcid,works_count,cited_by_count,summary_stats,last_known_institutions,affiliations,x_concepts,ids,works_api_url,counts_by_year`;
        
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
            authorTotalPages = Math.ceil(authorTotalCount / 10);
            
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
            authorSearchResult.innerHTML = `<div class='error-message'>Yazarlar alınırken hata oluştu: ${err.message}</div>`;
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
        const works = typeof author.works_count === 'number' ? `<span title='Toplam Yayın'>📄 ${author.works_count}</span>` : '';
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
        const worksApi = author.works_api_url ? `<a href='${author.works_api_url}' target='_blank' class='author-works-link'>Tüm yayınlarını OpenAlex'te gör</a>` : '';
        const countsByYear = Array.isArray(author.counts_by_year) && author.counts_by_year.length > 0 ? renderCountsByYearTable(author.counts_by_year) : '';
        return `
            <div class="paper-card author-card">
                <div class="paper-title">${escapeHtml(author.display_name)}</div>
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
                ${affiliations ? `<div class='paper-meta'><span>🏢 Kurum Geçmişi: ${affiliations}</span></div>` : ''}
                ${concepts ? `<div class='author-concepts-row'>${concepts}</div>` : ''}
                ${countsByYear}
                ${worksApi ? `<div class='paper-meta'>${worksApi}</div>` : ''}
            </div>
        `;
    }

    function renderCountsByYearTable(counts) {
        if (!Array.isArray(counts) || counts.length === 0) {
            return `<div class='author-counts-table-wrap'><table class='author-counts-table'><thead><tr><th>Yıl</th><th>Yayın</th><th>Atıf</th></tr></thead><tbody><tr><td colspan='3' style='text-align:center;color:#888;'>Veri yok</td></tr></tbody></table></div>`;
        }
        let rows = counts.map(c => `<tr><td>${c.year}</td><td>${c.works_count}</td><td>${c.cited_by_count}</td></tr>`).join('');
        return `<div class='author-counts-table-wrap'><table class='author-counts-table'><thead><tr><th>Yıl</th><th>Yayın</th><th>Atıf</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    // Kurum Ara
    const institutionSearchForm = document.getElementById('institution-search-form');
    const institutionSearchInput = document.getElementById('institution-search-input');
    const institutionSearchResult = document.getElementById('institution-search-result');
    const institutionSearchLoading = document.getElementById('institution-search-loading');
    const institutionSearchError = document.getElementById('institution-search-error');

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
            if (!institutionAutocompleteResults.length || !institutionAutocompleteBox || institutionAutocompleteBox.style.display === 'none') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                institutionAutocompleteSelected = (institutionAutocompleteSelected + 1) % institutionAutocompleteResults.length;
                renderInstitutionAutocomplete(institutionAutocompleteResults);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                institutionAutocompleteSelected = (institutionAutocompleteSelected - 1 + institutionAutocompleteResults.length) % institutionAutocompleteResults.length;
                renderInstitutionAutocomplete(institutionAutocompleteResults);
            } else if (e.key === 'Enter') {
                if (institutionAutocompleteSelected >= 0 && institutionAutocompleteResults[institutionAutocompleteSelected]) {
                    e.preventDefault();
                    institutionSearchInput.value = institutionAutocompleteResults[institutionAutocompleteSelected].display_name;
                    clearInstitutionAutocomplete();
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
            institutionSearchLoading.style.display = 'block';
            try {
                const url = `https://api.openalex.org/institutions?search=${encodeURIComponent(query)}&per_page=10&select=id,display_name,ror,country_code,type,works_count,cited_by_count,summary_stats,x_concepts,roles,repositories,works_api_url,lineage,updated_date,ids,image_thumbnail_url`;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('OpenAlex API hatası');
                const data = await resp.json();
                if (!data.results || data.results.length === 0) {
                    institutionSearchResult.innerHTML = '<div class="error-message">Kurum bulunamadı.</div>';
                } else {
                    institutionSearchResult.innerHTML = renderInstitutionSearchResults(data.results);
                }
            } catch (err) {
                institutionSearchResult.innerHTML = `<div class='error-message'>Kurumlar alınırken hata oluştu: ${err.message}</div>`;
            } finally {
                institutionSearchLoading.style.display = 'none';
            }
        });
    }

    function renderInstitutionSearchResults(institutions) {
        return `<div class='papers-list'>${institutions.map(renderInstitutionCard).join('')}</div>`;
    }

    function renderInstitutionCard(inst) {
        const ror = inst.ror ? `<a href='${inst.ror}' target='_blank' title='ROR'><span style='font-size:1.1em;'>🏢</span> ROR</a>` : '';
        const works = typeof inst.works_count === 'number' ? `<span title='Toplam Yayın'>📄 ${inst.works_count}</span>` : '';
        const cited = typeof inst.cited_by_count === 'number' ? `<span title='Toplam Atıf'>⭐ ${inst.cited_by_count}</span>` : '';
        const hindex = inst.summary_stats && typeof inst.summary_stats.h_index === 'number' ? `<span title='h-index'>h-index: ${inst.summary_stats.h_index}</span>` : '';
        const i10 = inst.summary_stats && typeof inst.summary_stats.i10_index === 'number' ? `<span title='i10-index'>i10: ${inst.summary_stats.i10_index}</span>` : '';
        const meanCited = inst.summary_stats && typeof inst.summary_stats['2yr_mean_citedness'] === 'number' ? `<span title='2Y Atıf Ort.'>2Y Atıf Ort: ${inst.summary_stats['2yr_mean_citedness'].toFixed(2)}</span>` : '';
        const type = inst.type ? `<span title='Tür'>🏷️ ${inst.type}</span>` : '';
        const country = inst.country_code ? `<span title='Ülke'>🌍 ${inst.country_code.toUpperCase()}</span>` : '';
        // Alanlar (x_concepts) sade ve tek satırda, max 3 göster, fazlası için +N alan badge
        let concepts = '';
        if (inst.x_concepts && inst.x_concepts.length > 0) {
            const shown = inst.x_concepts.slice(0, 3).map(c => `<span class='concept-badge' title='Skor: ${c.score}'>${escapeHtml(c.display_name)}</span>`);
            const more = inst.x_concepts.length > 3 ? `<span class='concept-badge concept-badge-more'>+${inst.x_concepts.length - 3} alan</span>` : '';
            concepts = shown.join(' ') + more;
        }
        const roles = (inst.roles || []).map(r => `<span class='pdf-keyword' title='Rol: ${r.role}'>${escapeHtml(r.role)} (${r.works_count})</span>`).join(' ');
        const repos = (inst.repositories || []).map(r => `<a href='${r.id}' target='_blank'>${escapeHtml(r.display_name)}</a>`).join(', ');
        const worksApi = inst.works_api_url ? `<a href='${inst.works_api_url}' target='_blank' class='author-works-link'>Tüm yayınlarını OpenAlex'te gör</a>` : '';
        const ids = inst.ids || {};
        const wikipedia = ids.wikipedia ? `<a href='${ids.wikipedia}' target='_blank' title='Wikipedia'><span style='font-size:1.1em;'>📖</span> Wikipedia</a>` : '';
        const wikidata = ids.wikidata ? `<a href='${ids.wikidata}' target='_blank' title='Wikidata'><span style='font-size:1.1em;'>🗂️</span> Wikidata</a>` : '';
        const mag = ids.mag ? `<a href='https://www.microsoft.com/en-us/research/project/microsoft-academic-graph/' target='_blank' title='MAG'><span style='font-size:1.1em;'>🧩</span> MAG</a>` : '';
        const image = inst.image_thumbnail_url ? `<img src='${inst.image_thumbnail_url}' alt='Kurum Logosu' class='institution-logo' style='width:48px;height:48px;border-radius:50%;margin-bottom:0.7em;'>` : '';
        return `
            <div class="paper-card institution-card">
                ${image}
                <div class="paper-title">${escapeHtml(inst.display_name)}</div>
                <div class="paper-meta">
                    ${ror}
                    ${type}
                    ${country}
                    ${works}
                    ${cited}
                    ${hindex}
                    ${i10}
                    ${meanCited}
                    ${wikipedia}
                    ${wikidata}
                    ${mag}
                </div>
                ${concepts ? `<div class='author-concepts-row'>${concepts}</div>` : ''}
                ${roles ? `<div class='paper-meta'><strong>Roller:</strong> ${roles}</div>` : ''}
                ${repos ? `<div class='paper-meta'><strong>Repository:</strong> ${repos}</div>` : ''}
                ${worksApi ? `<div class='paper-meta'>${worksApi}</div>` : ''}
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
        url = url.replace(/&per_page=\d+/, `&per_page=10`);
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
            paperSearchResult.innerHTML = '';
            if (paperSearchError) paperSearchError.textContent = '';
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
            paperTotalPages = Math.ceil(paperTotalCount / 10);
            if (!data.results || data.results.length === 0) {
                paperSearchResult.innerHTML = '<div class="error-message">Makale bulunamadı.</div>';
            } else {
                let paginationHtml = renderPaperPagination(page, paperTotalPages);
                paperSearchResult.innerHTML =
                    paginationHtml +
                    renderPaperSearchResults(data.results) +
                    paginationHtml;
            }
        } catch (err) {
            paperSearchResult.innerHTML = `<div class='error-message'>Makaleler alınırken hata oluştu: ${err.message}</div>`;
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
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    const autoSearchInputs = document.querySelectorAll('.auto-search');
    function triggerAutoSearch() {
        if (paperSearchInput && paperSearchInput.value.trim().length > 0) {
            paperSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
        if (authorSearchInput && authorSearchInput.value.trim().length > 0) {
            authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    }
    const debouncedAutoSearch = debounce(triggerAutoSearch, 400);
    autoSearchInputs.forEach(el => {
        el.addEventListener('input', debouncedAutoSearch);
        el.addEventListener('change', debouncedAutoSearch);
    });

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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            </div>
        `;
    }

    function renderPaperSearchResults(papers) {
        const count = paperTotalCount || (papers && papers.length ? papers.length : 0);
        const countHtml = `<div class='search-result-count'><span><b>${count}</b></span> <span>makale bulundu</span></div>`;
        // Sonuç sayısını arama barının altındaki kutuya yaz
        const countDiv = document.getElementById('search-result-count');
        if (countDiv) countDiv.innerHTML = countHtml;
        if (!papers || papers.length === 0) {
            return `<div class="error-message">Makale bulunamadı.</div>`;
        }
        return `<div class='papers-list'>${papers.map(renderPaperCard).join('')}</div>`;
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
            if (!authorAutocompleteResults.length || !authorAutocompleteBox || authorAutocompleteBox.style.display === 'none') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                authorAutocompleteSelected = (authorAutocompleteSelected + 1) % authorAutocompleteResults.length;
                renderAuthorAutocomplete(authorAutocompleteResults);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                authorAutocompleteSelected = (authorAutocompleteSelected - 1 + authorAutocompleteResults.length) % authorAutocompleteResults.length;
                renderAuthorAutocomplete(authorAutocompleteResults);
            } else if (e.key === 'Enter') {
                if (authorAutocompleteSelected >= 0 && authorAutocompleteResults[authorAutocompleteSelected]) {
                    e.preventDefault();
                    authorSearchInput.value = authorAutocompleteResults[authorAutocompleteSelected].display_name;
                    clearAuthorAutocomplete();
                    // Otomatik arama tetikle
                    if (authorSearchForm) authorSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
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
}); 