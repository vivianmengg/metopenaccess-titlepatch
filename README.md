# Met Open Access — Title Patch (Chinese Ceramics)

A data contribution to the [Met Open Access dataset](https://github.com/metmuseum/openaccess).

---

## The Problem

83% of Chinese ceramic objects in `MetObjects.csv` have a blank or `"Untitled"` entry in the Title field — **3,083 of 3,714 objects**. The titles exist in the Met's internal database and are returned by the Collection API; they simply haven't been exported to the CSV.

For example, object [36447](https://www.metmuseum.org/art/collection/search/36447):

| Source | Title |
|---|---|
| MetObjects.csv | *(blank)* |
| Collection API | `"Pedestalled Cup"` |

This is a white earthenware cup dated 2800–2400 BCE. The title is in the system — it's just not in the CSV.

---

## What's in This Repo

### `title-patch.json`
A ready-made mapping of `objectID → title` for **1,127 Chinese ceramic objects** where the CSV is blank but the API has a real title.

```json
{
  "36447": "Pedestalled Cup",
  "39523": "Large Figure of a Lady",
  "39524": "Amphora",
  ...
}
```

Only objects where the API returned a non-empty, non-`"Untitled"` title are included. This covers the Chinese ceramics subset of the collection (Asian Art department, ceramic medium).

**Suggested action:** Use as a lookup table to backfill the Title column in `MetObjects.csv` for the listed object IDs. No curatorial judgement required — these are titles already in your system.

### `fetch-title-patch.js`
The script used to generate `title-patch.json`. Takes a list of untitled object IDs and queries `GET /public/collection/v1/objects/{id}` for each one. Checkpoint-based — safe to interrupt and re-run.

To extend to the full collection:
1. Export all untitled object IDs from MetObjects.csv into `untitled-ids.json`: `[36447, 39523, ...]`
2. Run `node fetch-title-patch.js`

Rate limit: 1.3s between requests (Met API requirement). ~1,800 objects ≈ 40 min.

---

*Discovered during the build for the [Chinese Ceramics Timeline](https://chineseceramics.netlify.app) project, March 2026.*
