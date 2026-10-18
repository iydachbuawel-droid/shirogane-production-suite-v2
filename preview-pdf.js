/* SHIROGANE PDF export — preserve the original receipt DOM and CSS.
   Uses the browser's native print engine: selectable text, vector text/lines,
   and the same existing layout rather than rebuilding the receipt by hand.
   User chooses “Save as PDF” in the print dialog. */
(function(){
  'use strict';

  function waitForImages(doc){
    const images = Array.from(doc.images || []);
    return Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        let finished = false;
        const done = () => { if (finished) return; finished = true; img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
        img.addEventListener('load', done, {once:true});
        img.addEventListener('error', done, {once:true});
        setTimeout(done, 5000);
      });
    }));
  }

  function safeName(value){
    return String(value || 'SHIROGANE').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'SHIROGANE';
  }

  async function downloadElementPdf(element, filename){
    if (!element) throw new Error('Area nota tidak ditemukan.');

    // Open synchronously during the user's click so popup blockers are less likely to block it.
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Jendela cetak diblokir. Izinkan pop-up untuk situs SHIROGANE lalu coba lagi.');

    const doc = printWindow.document;
    const title = (filename || 'Nota-SHIROGANE.pdf').replace(/\.pdf$/i, '') || 'Nota-SHIROGANE';
    doc.open();
    doc.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head><body></body></html>');
    doc.close();
    doc.title = title;

    // Keep the page's existing stylesheets and inline CSS. Do not reconstruct receipt contents.
    const base = doc.createElement('base');
    base.href = new URL('.', window.location.href).href;
    doc.head.prepend(base);
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(source => {
      const copy = source.cloneNode(true);
      doc.head.appendChild(copy);
    });

    const printStyle = doc.createElement('style');
    printStyle.textContent = `
      @page { size: A4 portrait; margin: 8mm; }
      html, body { background:#fff !important; margin:0 !important; padding:0 !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      [data-shirogane-pdf-capture], .actions, .no-print, .preview-toolbar,
      .mobile-print-toolbar, .public-receipt-actions { display:none !important; }
      .page, #root, .print-area, .mobile-print-area, .public-receipt-page,
      .public-receipt-sheet { box-shadow:none !important; border-radius:0 !important; margin:0 !important; }
      .page, #root, .print-area, .mobile-print-area, .public-receipt-page,
      .public-receipt-sheet { max-width:100% !important; }
      .tablebox, .table-wrap, .public-receipt-table-wrap { overflow:visible !important; }
      table { width:100% !important; min-width:0 !important; table-layout:fixed; font-size:8px !important; }
      th, td { padding:3px 2px !important; font-size:8px !important; overflow-wrap:anywhere; white-space:normal; }
      th:first-child, td:first-child { width:25%; text-align:left; }
      th:nth-last-child(2), td:nth-last-child(2), th:last-child, td:last-child { width:13%; }
      tr, .totals, .summary, .payment, .payment-bank, .public-receipt-summary,
      .public-receipt-bank, .design, .thumb { break-inside:avoid; page-break-inside:avoid; }
      img { max-width:100%; }
    `;
    doc.head.appendChild(printStyle);

    const clone = element.cloneNode(true);
    clone.querySelectorAll('.actions, .no-print, .preview-toolbar, .mobile-print-toolbar, .public-receipt-actions').forEach(node => node.remove());
    clone.removeAttribute('data-shirogane-pdf-capture');
    doc.body.appendChild(clone);

    // Ensure the cloned content retains the same CSS class structure and image assets.
    await Promise.all(Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link => new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; link.removeEventListener('load', finish); link.removeEventListener('error', finish); resolve(); };
      link.addEventListener('load', finish, {once:true});
      link.addEventListener('error', finish, {once:true});
      // A stylesheet may already have finished loading before listeners were attached.
      try { if (link.sheet && link.sheet.cssRules && link.sheet.cssRules.length) finish(); } catch (_) {}
      setTimeout(finish, 5000);
    })));
    await waitForImages(doc);
    if (doc.fonts && doc.fonts.ready) {
      try { await Promise.race([doc.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); } catch (_) {}
    }

    printWindow.focus();
    // Small delay lets print CSS, fonts and images settle before the browser paginates.
    setTimeout(() => {
      try { printWindow.print(); }
      catch (error) { printWindow.close(); }
    }, 250);
    return { method:'browser-print', filename:title + '.pdf' };
  }

  window.SHROGANE_downloadPreviewPdf = downloadElementPdf;
  window.SHROGANE_safePdfName = safeName;
})();
