/* Settings you may need to change. */
window.QUIZ_CONFIG = {
  // ID of the Google Sheet with the questions (the part between /d/ and /edit in its link).
  // The sheet must be shared as "Anyone with the link → Viewer".
  // Leave it empty ('') to use only the built-in questions in questions.js.
  sheetId: '1KlNQ7wyeIAC29ota0ijzMNsqa4BE3ZEkR_jXd6Nr6Do',

  // Name of the tab the site reads. Don't rename that tab in the sheet.
  sheetName: 'الأسئلة',

  // How long to wait for the sheet before using the saved/built-in questions (milliseconds).
  timeoutMs: 6000
};
