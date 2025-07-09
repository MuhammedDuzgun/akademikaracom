// Akademikara - Modern PDF Analiz & Atıf Bulucu

document.addEventListener('DOMContentLoaded', () => {
    // Sekme geçişi
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.main-section');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(btn.dataset.section + '-section').classList.add('active');
            // Profil sekmesi seçildiyse profili yükle
            if (btn.dataset.section === 'profile') {
                loadProfile();
            }
        });
    });

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

    // Atıflar (Citations)
    const citationsForm = document.getElementById('citations-form');
    const citationsInput = document.getElementById('citations-paper-id');
    const citationsResult = document.getElementById('citations-result');
    const citationsLoading = document.getElementById('citations-loading');
    const citationsError = document.getElementById('citations-paper-id-error');

    citationsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        citationsError.textContent = '';
        citationsResult.innerHTML = '';
        const paperId = citationsInput.value.trim();
        if (!paperId) {
            citationsError.textContent = 'Makale kimliği zorunludur.';
            return;
        }
        citationsLoading.style.display = 'block';
        try {
            const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}/citations?fields=title,authors,year,openAccessPdf`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!resp.ok || data.error) throw new Error(data.error || 'API Hatası');
            if (!data.data || data.data.length === 0) {
                citationsResult.innerHTML = '<div class="error-message">Bu makaleye yapılan atıf bulunamadı.</div>';
                return;
            }
            citationsResult.innerHTML = data.data.map(cit => renderCitation(cit.citingPaper)).join('');
        } catch (err) {
            citationsResult.innerHTML = `<div class='error-message'>${err.message || 'Atıflar alınırken hata oluştu.'}</div>`;
        } finally {
            citationsLoading.style.display = 'none';
        }
    });

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

    // Citation kartı render
    function renderCitation(citing) {
        if (!citing) return '';
        let html = `<div class='citation-card'>`;
        html += `<div class='citation-title'>${escapeHtml(citing.title || 'Başlık yok')}</div>`;
        if (citing.authors && citing.authors.length > 0) html += `<div class='citation-meta'>Yazarlar: ${citing.authors.map(a => escapeHtml(a.name)).join(', ')}</div>`;
        if (citing.year) html += `<div class='citation-meta'>Yıl: ${escapeHtml(citing.year)}</div>`;
        if (citing.openAccessPdf && citing.openAccessPdf.url) html += `<a class='citation-link' href='${citing.openAccessPdf.url}' target='_blank'>PDF</a>`;
        html += `</div>`;
        return html;
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