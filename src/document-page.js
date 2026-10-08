export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

// The vector page is served through the same session and document scope as its text.
export function documentPage(page, id) {
  const text = '<pre class="pdf-text">' + escapeHtml(page.page_text) + '</pre>';
  if (!page.has_visual) return text;
  const src = '/html/' + encodeURIComponent(id) + '/page/' + Number(page.page_num) + '.svg';
  return '<img class="page-visual" src="' + src + '" loading="lazy" decoding="async" alt="Página ' + Number(page.page_num) + ' do dossiê, com a diagramação original"><details class="page-transcript"><summary>Texto da página</summary>' + text + '</details>';
}
