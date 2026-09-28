import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printElementById } from "./printElement";

describe("printElementById", () => {
  beforeEach(() => {
    document.body.innerHTML = '<section id="invoice-preview"><h1>INV-2026-0014</h1><p>PKR 100,300</p></section>';
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.head.querySelectorAll('[data-print-isolated="true"]').forEach((node) => node.remove());
    document.body.classList.remove("print-isolated-active");
    vi.restoreAllMocks();
  });

  it("isolates the selected invoice and opens the browser print dialog", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    printElementById("invoice-preview", "INV-2026-0014");

    const printRoot = document.querySelector(".print-isolated-root");
    expect(printRoot?.textContent).toContain("INV-2026-0014");
    expect(printRoot?.textContent).toContain("PKR 100,300");
    expect(document.body.classList.contains("print-isolated-active")).toBe(true);
    expect(print).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event("afterprint"));
    expect(document.querySelector(".print-isolated-root")).toBeNull();
    expect(document.body.classList.contains("print-isolated-active")).toBe(false);
  });

  it("shows a helpful error when the requested invoice preview is missing", () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    printElementById("missing-preview", "Missing invoice");

    expect(alert).toHaveBeenCalledWith("Printable content was not found. Please reopen the record and try again.");
  });

  it("fits a clean invoice to A4 without inherited screen minimum widths", () => {
    vi.spyOn(window, "print").mockImplementation(() => undefined);
    printElementById("invoice-preview", "Invoice", { cleanPage: true });
    const css = document.head.querySelector('[data-print-isolated="true"]')?.textContent;
    expect(css).toContain("margin: 0;");
    expect(css).toContain("width: 210mm !important;");
    expect(css).toContain("padding: 10mm !important;");
    expect(css).toContain("min-width: 0 !important;");
    window.dispatchEvent(new Event("afterprint"));
  });
});
