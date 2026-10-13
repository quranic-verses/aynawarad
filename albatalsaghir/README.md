# البطل الصغير

A family quiz for children. It installs as an app and works offline.

## Where it lives
Part of the «أين ورد؟» site: the folder `albatalsaghir/` in the repo quranic-verses/aynawarad,
at https://quranic-verses.github.io/aynawarad/albatalsaghir/ (the home page of «أين ورد؟» has a button to it).

## Questions
- The site shows three sections: الأنبياء، السيرة، جزء عمّ. The sheet keeps its detailed sections (column «القسم»); `GROUPS` at the top of `app.js` says which of them goes into which of the three. A section name that isn't listed there gets its own chip.
- Questions come from the Google Sheet set in `config.js`. The sheet must be shared as "Anyone with the link → Viewer".
- If the sheet can't be reached, the app uses the last copy it saved, then the built-in questions in `questions.js`.

## Updating files
After changing any file, raise `VERSION` in `sw.js` (for example `albatal-v2`) so installed apps pick up the change.
