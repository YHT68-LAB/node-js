# Static HTML Markdown Reader Notes

This folder uses a simple two-file reader pattern:

| File | Role |
|---|---|
| `portfolio_performance_test_strategy_COMPLETE.md` | Source document / data |
| `portfolio_performance_test_strategy_COMPLETE.html` | Static browser reader helper |

The HTML file derives the Markdown filename from its own filename:

```js
var markdownSource = location.pathname.split('/').pop().replace(/\.html?$/i, '.md');
fetch(markdownSource, { cache: 'no-store' })
```

## Why Direct `file://` Opening Fails

Opening the HTML directly like this:

```text
file:///C:/dev/yhtang/node-js/interview/src/redhat/portfolio_performance_test_strategy_COMPLETE.html
```

does not reliably work because browsers often block JavaScript from reading neighboring local files.

This is blocked:

```js
fetch('./portfolio_performance_test_strategy_COMPLETE.md')
```

because JavaScript is trying to read raw local file contents.

Images are different:

```html
<img src="./picture.png">
```

The browser can display a local image resource, but JavaScript reading arbitrary local files is restricted for security.

## Local Usage

Use the Node static server from the project root:

```powershell
npm run serve:redhat:docs
```

Then open:

```text
http://127.0.0.1:8000/portfolio_performance_test_strategy_COMPLETE.html
```

Now refresh should reload the Markdown source file.

## GitHub Pages Usage

This same approach should work on GitHub Pages because both files are served over `https://`.

Requirement:

```text
portfolio_performance_test_strategy_COMPLETE.html
portfolio_performance_test_strategy_COMPLETE.md
```

must be published in the same directory, with exact filename casing.

## Tradeoff

| Approach | Local Double-Click | Source Of Truth |
|---|---:|---:|
| Embedded Markdown inside HTML | yes | duplicated |
| HTML reader loading sibling `.md` | no, needs local server | yes |

The current choice keeps the `.md` file as the source of truth and uses the HTML only as a reader helper.
