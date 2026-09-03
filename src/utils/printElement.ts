function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let printCleanupTimer: number | undefined;

function cleanupPrintDocument(previousTitle: string, printRoot: HTMLElement, printStyle: HTMLStyleElement) {
  window.clearTimeout(printCleanupTimer);
  document.title = previousTitle;
  document.body.classList.remove("print-isolated-active");
  printRoot.remove();
  printStyle.remove();
}

type PrintOptions = {
  orientation?: "portrait" | "landscape";
};

export function printElementById(elementId: string, title = "Document", options: PrintOptions = {}) {
  const element = document.getElementById(elementId);

  if (!element) {
    window.alert("Printable content was not found. Please reopen the record and try again.");
    return;
  }

  printHtmlDocument(element.outerHTML, title, options);
}

export function printHtmlDocument(printableHtml: string, title = "Document", options: PrintOptions = {}) {
  const previousTitle = document.title;
  const printRoot = document.createElement("div");
  const printStyle = document.createElement("style");
  const orientation = options.orientation === "landscape" ? "landscape" : "portrait";
  const printWidth = orientation === "landscape" ? "277mm" : "190mm";

  printRoot.className = "print-isolated-root";
  printRoot.innerHTML = `<main class="print-page">${printableHtml}</main>`;

  printStyle.setAttribute("data-print-isolated", "true");
  printStyle.textContent = `
    .print-isolated-root {
      display: none;
    }

    @media print {
      @page {
        size: A4 ${orientation};
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #111827 !important;
      }

      body.print-isolated-active > *:not(.print-isolated-root) {
        display: none !important;
      }

      body.print-isolated-active .print-isolated-root {
        display: block !important;
        width: 100% !important;
        min-height: auto !important;
        background: #ffffff !important;
      }

      body.print-isolated-active .print-page {
        display: block !important;
        width: ${printWidth} !important;
        max-width: ${printWidth} !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #111827 !important;
        font-family: Arial, sans-serif !important;
      }

      body.print-isolated-active .print-page > * {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }

      body.print-isolated-active table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto;
      }

      body.print-isolated-active thead th {
        position: static !important;
      }

      body.print-isolated-active tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      body.print-isolated-active button,
      body.print-isolated-active .no-print {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(printStyle);
  document.body.appendChild(printRoot);
  document.body.classList.add("print-isolated-active");
  document.title = escapeHtml(title);

  const cleanup = () => cleanupPrintDocument(previousTitle, printRoot, printStyle);
  window.addEventListener("afterprint", cleanup, { once: true });

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.print();
      printCleanupTimer = window.setTimeout(cleanup, 30000);
    });
  });
}
