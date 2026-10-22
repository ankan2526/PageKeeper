# PageKeeper

PageKeeper is a lightweight, browser-based PDF reader that helps you pick up
where you left off. Open a PDF, read it in a display-fitted viewer, and save a
bookmark and viewing preference in your browser.

There is no application server or account to set up. Your PDF is stored in the
browser on the device where you opened it.

## Features

- **Local PDF library:** Open a PDF from your device. PageKeeper saves the
  selected file in browser storage and restores it the next time you visit.
- **Fit-to-window reading:** Pages are scaled to fit the available reading
  area's height and width. The page is re-rendered when the reading area
  changes size, including when entering or leaving fullscreen.
- **Single- and two-page layouts:** Switch between one page at a time and a
  two-page spread. The selected layout is remembered across reloads.
- **Page navigation:** Use the on-screen controls or keyboard arrow keys.
- **Bookmark:** Save your current page, see a ribbon on the bookmarked page,
  and jump back to it later.
- **Fullscreen:** Expand the reader to use the full browser display.
- **Responsive design:** The controls and reading layout adapt to smaller
  screens.

## Getting started

### Run locally

1. Clone or download this repository.
2. Start a static web server from the project directory. For example, if
   Python is installed:

   ```sh
   python3 -m http.server 8000
   ```

3. Open [http://localhost:8000](http://localhost:8000) in a modern browser.
4. Select **Open a PDF** and choose a PDF file.

Serve the project over HTTP (including `localhost`) rather than opening
`index.html` directly as a `file://` URL. Browser storage and PDF.js worker
behavior are more reliable from a web origin.

The application loads PDF.js and localForage from CDNs, so an internet
connection is needed to load those libraries.

### Use the reader

| Control | Action |
| --- | --- |
| **← / →** | Go to the previous or next page |
| **Two-page view** | Display two pages side by side |
| **Single-page view** | Return to one page at a time |
| **Bookmark page** | Save the current page as your bookmark |
| **Go to bookmark** | Open the bookmarked page |
| **Enter fullscreen** | Expand the reader to fullscreen |
| **Open another** | Replace the currently saved PDF with another file |

Keyboard shortcuts work while the reader is active and focus is not in a form
field:

- **Right Arrow** or **Down Arrow**: next page (or next spread)
- **Left Arrow** or **Up Arrow**: previous page (or previous spread)

The page status displays the current page number; in two-page view it displays
the visible page range.

## Data and privacy

- The PDF is stored in IndexedDB through localForage under the key `savedPDF`.
- The bookmarked page number is stored in `localStorage` under
  `bookmarkedPage`.
- The single-/two-page preference is stored in `localStorage` under
  `twoPageView`.
- Selecting **Open another** replaces the saved PDF and clears the existing
  bookmark, so the old page number is not applied to the new document.
- These values belong to the browser and site origin in use. They are not
  synchronized between browsers or devices. Clearing browser site data removes
  the saved PDF and preferences.
- PageKeeper does not upload the PDF to an application backend. The PDF.js and
  localForage libraries are loaded from CDNs when the page opens.

## Project files

```text
PageKeeper/
├── app.js                   # PDF loading, rendering, navigation, and storage
├── assets/
│   └── pagekeeper-logo.png  # App logo and favicon
├── index.html               # Reader markup and CDN dependencies
├── README.md                # Project documentation
└── styles.css               # Responsive layout and visual styles
```

## Built with

- HTML, CSS, and vanilla JavaScript
- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF parsing and page rendering
- [localForage](https://localforage.github.io/localForage/) for browser-based
  PDF storage

## Troubleshooting

- **A PDF does not open:** Make sure the selected file is a valid PDF, then
  choose it again. Check the browser console if the problem persists.
- **A saved PDF does not appear:** Reopen the app in the same browser and
  origin where it was saved. If browser site data was cleared, select the PDF
  again.
- **The reader is blank or the libraries fail to load:** Check the internet
  connection, since PDF.js and localForage are loaded from CDNs.
- **Fullscreen does not activate:** Fullscreen availability depends on browser
  support and permissions. Try opening PageKeeper from `localhost` or a hosted
  HTTPS site.
