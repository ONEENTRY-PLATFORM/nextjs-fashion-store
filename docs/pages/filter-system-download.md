# Filter System Download (`/download/filter-system`)

Utility page for downloading the documentation file `FILTER_SYSTEM.md`. Starts an automatic download on mount.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Eyebrow

- **Text** (uppercase tracking): `"ONEENTRY FASHION · Documentation"`

## 2. Heading + Subtitle (dynamic)

Depends on the `downloaded` state:

### "Download in progress" state
- **H1**: `"Preparing File…"`
- **Caption**: `"Generating the markdown file…"`

### "Downloaded" state
- **H1**: `"Download Started"`
- **Caption**: `"FILTER_SYSTEM.md has been saved to your Downloads folder."`

## 3. CTA Buttons

- **Button**: `"Download Again"` — re-triggers the download
- **Link**: `"Return to Home"` → `/`

## 4. File Info Card

Gray card with file metadata.

| Field | Value |
|---|---|
| `File` | `FILTER_SYSTEM.md` |
| `Type` | `Markdown` |
| `Size` | `~{NN.N} KB` (calculated from blob size) |
