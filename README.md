# Annual Longevity Assessment — patient results page

A single-file patient results page for the Annual Longevity Assessment at
Optimal Health Clinic (Barrie, Ontario). It serves two contexts from one
document: an exam-room TV with the NP presenting, and a phone on a return
visit, which is how most patients come back to it.

**[View the page →](https://optimal-research-team.github.io/ale-results-demo/)**

> All data here is **synthetic**. The patient is "Daniel"; there is no date of
> birth, health card number or chart number anywhere in the source. The page is
> labelled "Sample patient · synthetic data" in both the header and the footer.

## What it does

- **The longevity target** — all 39 markers placed on one chart, each in the
  ring for its state and grouped by body system, with last year's positions as
  trails. Scrolling turns the year. Every dot opens its own history.
- **Three priorities**, chosen by the NP, each naming the visit that next
  measures it — matched verbatim against the plan, so a priority no step names
  gets no claim.
- **A twelve-month plan** with the dates, and a calendar file where the browser
  can take one.
- **Every result**, grouped by body system, each group marked with its
  anatomical engraving.
- **Print**: page one is the sheet a patient keeps — chart, priorities, dates.
  Twelve pages in full.

## Building

The page is one file with everything inlined — no network at run time.

    cd src
    python3 build.py ../index.html --standalone

`build.py` substitutes the JS modules and encodes every image as a data URI.
Drop a `plate-<system>.png` into `src/` and that system picks it up; the same
goes for `treeline`, `ring-round`, `close-engraving` and `sprig`. Absent files
simply leave their slot empty.

Without `--standalone` the output omits the document shell, for hosts that
supply their own.

## Notes

- No build step, no framework, no dependencies. Three.js is loaded only by the
  retired `?hero=scan` variant.
- Works with WebGL unavailable and with `prefers-reduced-motion`: all 39 markers
  still render and the chart stays keyboard-navigable.
- `#m/<id>` opens a single marker — e.g. `#m/apob`.
- Medical content is frozen: values, states, ranges, units and clinical wording
  are never altered by the presentation layer, and no score is invented.

## Licence

Code is MIT. The anatomical and landscape engravings are commissioned assets —
please don't reuse them outside this project.
