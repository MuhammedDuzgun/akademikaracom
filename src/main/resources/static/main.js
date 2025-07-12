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

    if (authorSearchForm) {
        authorSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authorSearchError.textContent = '';
            authorSearchResult.innerHTML = '';
            const query = authorSearchInput.value.trim();
            if (!query) {
                authorSearchError.textContent = 'Yazar adı zorunludur.';
                return;
            }
            authorSearchLoading.style.display = 'block';
            try {
                const url = `https://api.openalex.org/authors?search=${encodeURIComponent(query)}&per_page=10&select=id,display_name,display_name_alternatives,orcid,works_count,cited_by_count,summary_stats,last_known_institutions,affiliations,x_concepts,ids,works_api_url,counts_by_year`;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('OpenAlex API hatası');
                const data = await resp.json();
                if (!data.results || data.results.length === 0) {
                    authorSearchResult.innerHTML = '<div class="error-message">Yazar bulunamadı.</div>';
                } else {
                    authorSearchResult.innerHTML = renderAuthorSearchResults(data.results);
                }
            } catch (err) {
                authorSearchResult.innerHTML = `<div class='error-message'>Yazarlar alınırken hata oluştu: ${err.message}</div>`;
            } finally {
                authorSearchLoading.style.display = 'none';
            }
        });
    }

    function renderAuthorSearchResults(authors) {
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
                const url = `https://api.openalex.org/institutions?search=${encodeURIComponent(query)}&per_page=10&select=id,display_name,ror,country_code,type,works_count,cited_by_count,summary_stats,x_concepts,roles,repositories,works_api_url,lineage,updated_date`;
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
        return `
            <div class="paper-card institution-card">
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
                </div>
                ${concepts ? `<div class='author-concepts-row'>${concepts}</div>` : ''}
                ${roles ? `<div class='paper-meta'><strong>Roller:</strong> ${roles}</div>` : ''}
                ${repos ? `<div class='paper-meta'><strong>Repository:</strong> ${repos}</div>` : ''}
                ${worksApi ? `<div class='paper-meta'>${worksApi}</div>` : ''}
            </div>
        `;
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