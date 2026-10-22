"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfUpload = document.getElementById("pdf-upload");
const replacePdf = document.getElementById("replace-pdf");
const uploadPanel = document.getElementById("upload-panel");
const readerPanel = document.getElementById("reader-panel");
const primaryCanvas = document.getElementById("primary-canvas");
const secondaryCanvas = document.getElementById("secondary-canvas");
const pageStatus = document.getElementById("page-status");
const previousButton = document.getElementById("previous-page");
const nextButton = document.getElementById("next-page");
const bookmarkButton = document.getElementById("bookmark-page");
const goToBookmarkButton = document.getElementById("go-to-bookmark");
const toggleSpreadButton = document.getElementById("toggle-spread");
const toggleFullscreenButton = document.getElementById("toggle-fullscreen");
const canvasWrap = document.querySelector(".canvas-wrap");
const primaryFrame = document.getElementById("primary-frame");
const secondaryFrame = document.getElementById("secondary-frame");
const message = document.getElementById("message");

let pdfDocument = null;
let currentPageNum = 1;
let isRendering = false;
let isTwoPageView = localStorage.getItem("twoPageView") === "true";
let pendingPageNum = null;
let resizeObserver = null;
let resizeTimer = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.dataset.error = String(isError);
}

function updateControls() {
  const hasDocument = pdfDocument !== null;
  const pageCount = isTwoPageView ? 2 : 1;
  const lastVisiblePage = hasDocument
    ? Math.min(currentPageNum + pageCount - 1, pdfDocument.numPages)
    : 0;
  previousButton.disabled = !hasDocument || isRendering || currentPageNum <= 1;
  nextButton.disabled =
    !hasDocument ||
    isRendering ||
    currentPageNum + pageCount > pdfDocument.numPages;
  pageStatus.textContent = hasDocument
    ? isTwoPageView
      ? `Pages ${currentPageNum}–${lastVisiblePage} of ${pdfDocument.numPages}`
      : `Page ${currentPageNum} of ${pdfDocument.numPages}`
    : "Page 0 of 0";
  toggleSpreadButton.setAttribute("aria-pressed", String(isTwoPageView));
  toggleSpreadButton.textContent = isTwoPageView ? "Single-page view" : "Two-page view";
  secondaryFrame.hidden = !isTwoPageView || !hasDocument || currentPageNum >= pdfDocument.numPages;

  const bookmark = Number(localStorage.getItem("bookmarkedPage"));
  goToBookmarkButton.disabled =
    !hasDocument ||
    !Number.isInteger(bookmark) ||
    bookmark < 1 ||
    bookmark > (pdfDocument ? pdfDocument.numPages : 0);
  updateBookmarkMarkers(bookmark);
}

function updateBookmarkMarkers(bookmarkedPage = Number(localStorage.getItem("bookmarkedPage"))) {
  const visiblePages = [
    { frame: primaryFrame, pageNum: pdfDocument ? currentPageNum : 0 },
    { frame: secondaryFrame, pageNum: pdfDocument ? currentPageNum + 1 : 0 }
  ];

  for (const { frame, pageNum } of visiblePages) {
    const marker = frame.querySelector(".bookmark-ribbon");
    marker.hidden = !pdfDocument || pageNum !== bookmarkedPage || frame.hidden;
  }
}

async function renderPage(pageNum) {
  if (!pdfDocument || pageNum < 1 || pageNum > pdfDocument.numPages) {
    return;
  }

  pendingPageNum = pageNum;
  if (isRendering) {
    return;
  }

  isRendering = true;
  updateControls();
  while (pendingPageNum !== null) {
    const requestedPageNum = pendingPageNum;
    pendingPageNum = null;

    try {
      const firstPage = await pdfDocument.getPage(requestedPageNum);
      const pages = [firstPage];
      if (isTwoPageView && requestedPageNum < pdfDocument.numPages) {
        pages.push(await pdfDocument.getPage(requestedPageNum + 1));
      }

      const pageSizes = pages.map((page) => page.getViewport({ scale: 1 }));
      const gap = pages.length > 1
        ? parseFloat(getComputedStyle(document.querySelector(".pages-container")).gap) || 0
        : 0;
      const wrapStyles = getComputedStyle(canvasWrap);
      const horizontalPadding =
        parseFloat(wrapStyles.paddingLeft) + parseFloat(wrapStyles.paddingRight);
      const verticalPadding =
        parseFloat(wrapStyles.paddingTop) + parseFloat(wrapStyles.paddingBottom);
      const availableWidth = Math.max(1, canvasWrap.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, canvasWrap.clientHeight - verticalPadding);
      const spreadWidth = pageSizes.reduce((total, viewport) => total + viewport.width, 0) + gap;
      const spreadHeight = Math.max(...pageSizes.map((viewport) => viewport.height));
      const scale = Math.min(availableWidth / spreadWidth, availableHeight / spreadHeight);
      const outputScale = window.devicePixelRatio || 1;
      const canvases = [primaryCanvas, secondaryCanvas];

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const pageCanvas = canvases[index];
        const viewport = page.getViewport({ scale });
        const pageContext = pageCanvas.getContext("2d");
        pageCanvas.hidden = false;
        pageCanvas.width = Math.floor(viewport.width * outputScale);
        pageCanvas.height = Math.floor(viewport.height * outputScale);
        pageCanvas.style.width = `${Math.floor(viewport.width)}px`;
        pageCanvas.style.height = `${Math.floor(viewport.height)}px`;

        await page.render({
          canvasContext: pageContext,
          viewport,
          transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0]
        }).promise;
      }

      if (pages.length === 1) {
        secondaryFrame.hidden = true;
      } else {
        secondaryFrame.hidden = false;
      }
      currentPageNum = requestedPageNum;
      showMessage("");
    } catch (error) {
      console.error("Unable to render PDF page:", error);
      showMessage("This page could not be rendered. Please try again.", true);
    }
  }
  isRendering = false;
  updateControls();
}

async function openPdf(pdfBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer)
    });
    const document = await loadingTask.promise;
    pdfDocument = document;
    uploadPanel.hidden = true;
    readerPanel.hidden = false;
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (pdfDocument) {
            void renderPage(currentPageNum);
          }
        }, 100);
      });
      resizeObserver.observe(canvasWrap);
    }

    const savedBookmark = Number(localStorage.getItem("bookmarkedPage"));
    currentPageNum =
      Number.isInteger(savedBookmark) &&
      savedBookmark >= 1 &&
      savedBookmark <= document.numPages
        ? savedBookmark
        : 1;

    await renderPage(currentPageNum);
    updateControls();
  } catch (error) {
    console.error("Unable to open PDF:", error);
    showMessage("The PDF could not be opened. Choose a valid PDF and try again.", true);
  }
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("The selected file could not be read as an ArrayBuffer."));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("The selected file could not be read."));
    reader.readAsArrayBuffer(file);
  });
}

async function saveAndOpenFile(file) {
  if (!file) {
    return;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showMessage("Please choose a PDF file.", true);
    return;
  }

  showMessage("Saving and opening your book…");
  try {
    const pdfBuffer = await readFileAsArrayBuffer(file);
    await localforage.setItem("savedPDF", pdfBuffer);
    localStorage.removeItem("bookmarkedPage");
    currentPageNum = 1;
    await openPdf(pdfBuffer);
  } catch (error) {
    console.error("Unable to save PDF:", error);
    showMessage("The PDF could not be saved in this browser.", true);
  }
}

pdfUpload.addEventListener("change", async (event) => {
  await saveAndOpenFile(event.target.files[0]);
  pdfUpload.value = "";
});

replacePdf.addEventListener("change", async (event) => {
  await saveAndOpenFile(event.target.files[0]);
  replacePdf.value = "";
});

previousButton.addEventListener("click", () => {
  const pageStep = isTwoPageView ? 2 : 1;
  if (currentPageNum > 1) {
    void renderPage(Math.max(1, currentPageNum - pageStep));
  }
});

nextButton.addEventListener("click", () => {
  const pageStep = isTwoPageView ? 2 : 1;
  if (pdfDocument && currentPageNum + pageStep <= pdfDocument.numPages) {
    void renderPage(currentPageNum + pageStep);
  }
});

toggleSpreadButton.addEventListener("click", () => {
  isTwoPageView = !isTwoPageView;
  try {
    localStorage.setItem("twoPageView", String(isTwoPageView));
  } catch (error) {
    console.error("Unable to save page view preference:", error);
    showMessage("Your page view preference could not be saved.", true);
  }
  void renderPage(currentPageNum);
});

bookmarkButton.addEventListener("click", () => {
  try {
    localStorage.setItem("bookmarkedPage", String(currentPageNum));
    updateControls();
    showMessage(`Page ${currentPageNum} bookmarked.`);
  } catch (error) {
    console.error("Unable to save bookmark:", error);
    showMessage("The bookmark could not be saved in this browser.", true);
  }
});

toggleFullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      showMessage("Fullscreen mode is not supported by this browser.", true);
    }
  } catch (error) {
    console.error("Unable to change fullscreen mode:", error);
    showMessage("Fullscreen mode could not be changed.", true);
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = document.fullscreenElement !== null;
  toggleFullscreenButton.textContent = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
  toggleFullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
  if (pdfDocument) {
    void renderPage(currentPageNum);
  }
});

document.addEventListener("keydown", (event) => {
  if (!pdfDocument || readerPanel.hidden || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, textarea, select"))) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    if (!nextButton.disabled) {
      nextButton.click();
    }
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!previousButton.disabled) {
      previousButton.click();
    }
  }
});

goToBookmarkButton.addEventListener("click", () => {
  const bookmark = Number(localStorage.getItem("bookmarkedPage"));
  if (Number.isInteger(bookmark) && pdfDocument &&
      bookmark >= 1 && bookmark <= pdfDocument.numPages) {
    void renderPage(bookmark);
  }
});

async function restoreSavedPdf() {
  try {
    const savedPDF = await localforage.getItem("savedPDF");
    if (savedPDF instanceof ArrayBuffer) {
      await openPdf(savedPDF);
    } else if (savedPDF instanceof Uint8Array) {
      await openPdf(
        savedPDF.buffer.slice(
          savedPDF.byteOffset,
          savedPDF.byteOffset + savedPDF.byteLength
        )
      );
    } else if (savedPDF !== null) {
      throw new Error("Saved PDF data is not an ArrayBuffer.");
    }
  } catch (error) {
    console.error("Unable to restore saved PDF:", error);
    showMessage("The saved PDF could not be loaded. Please choose the file again.", true);
  }
}

updateControls();
void restoreSavedPdf();
