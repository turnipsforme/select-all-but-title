const { Plugin, MarkdownView, Notice } = require("obsidian");

const LIST_MARKER_REGEX = /^(\s*)(?:(?:[-*+])|(?:\d+[.)]))\s+(?:\[[ xX]\]\s+)?/;
const HEADING_REGEX = /^#{1,6}\s+\S/;

function samePosition(a, b) {
  return a.line === b.line && a.ch === b.ch;
}

function getParagraphRange(editor) {
  const totalLines = editor.lineCount();
  if (totalLines === 0) return null;

  const cursor = editor.getCursor();
  const line = Math.min(cursor.line, totalLines - 1);
  const currentLine = editor.getLine(line);
  if (currentLine.trim() === "") return null;

  let startLine = line;
  if (!LIST_MARKER_REGEX.test(currentLine)) {
    while (startLine > 0) {
      const previousLine = editor.getLine(startLine - 1);
      if (previousLine.trim() === "") break;

      startLine--;
      if (LIST_MARKER_REGEX.test(previousLine)) break;
    }
  }

  let endLine = line;
  while (endLine + 1 < totalLines) {
    const nextLine = editor.getLine(endLine + 1);
    if (nextLine.trim() === "" || LIST_MARKER_REGEX.test(nextLine)) break;
    endLine++;
  }

  const startCh = (editor.getLine(startLine).match(LIST_MARKER_REGEX) || [""])[0].length;
  const endCh = editor.getLine(endLine).length;

  if (startLine === endLine && startCh >= endCh) return null;

  return {
    from: { line: startLine, ch: startCh },
    to: { line: endLine, ch: endCh },
  };
}

function getCurrentHeadingBodyRange(editor) {
  const totalLines = editor.lineCount();
  if (totalLines === 0) return null;

  const cursor = editor.getCursor();
  const line = Math.min(cursor.line, totalLines - 1);

  let headingLine = line;
  while (headingLine >= 0 && !HEADING_REGEX.test(editor.getLine(headingLine))) {
    headingLine--;
  }

  if (headingLine < 0) return null;

  let nextHeadingLine = headingLine + 1;
  while (
    nextHeadingLine < totalLines &&
    !HEADING_REGEX.test(editor.getLine(nextHeadingLine))
  ) {
    nextHeadingLine++;
  }

  let startLine = headingLine + 1;
  let endLine = nextHeadingLine - 1;

  while (startLine <= endLine && editor.getLine(startLine).trim() === "") {
    startLine++;
  }

  while (endLine >= startLine && editor.getLine(endLine).trim() === "") {
    endLine--;
  }

  if (startLine > endLine) return null;

  return {
    from: { line: startLine, ch: 0 },
    to: { line: endLine, ch: editor.getLine(endLine).length },
  };
}

function selectionMatchesRange(editor, range) {
  return (
    samePosition(editor.getCursor("from"), range.from) &&
    samePosition(editor.getCursor("to"), range.to)
  );
}

function selectAllExceptTopHeading(editor) {
  const totalLines = editor.lineCount();
  if (totalLines === 0) return;

  let startLine = 0;

  while (startLine < totalLines && editor.getLine(startLine).trim() === "") {
    startLine++;
  }

  if (startLine < totalLines && /^#\s+/.test(editor.getLine(startLine))) {
    startLine++;
  }

  if (startLine >= totalLines) {
    new Notice("Nothing to select.");
    return;
  }

  const lastLine = totalLines - 1;
  const lastCh = editor.getLine(lastLine).length;
  editor.setSelection({ line: startLine, ch: 0 }, { line: lastLine, ch: lastCh });
}

module.exports = class SelectAllButTitlePlugin extends Plugin {
  onload() {
    this.addCommand({
      id: "select-all-except-top-h1",
      name: "Select all except top # heading",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;

        if (!checking) {
          const editor = view.editor;
          const headingBodyRange = getCurrentHeadingBodyRange(editor);

          if (headingBodyRange && selectionMatchesRange(editor, headingBodyRange)) {
            selectAllExceptTopHeading(editor);
            return true;
          }

          const paragraphRange = getParagraphRange(editor);

          if (paragraphRange) {
            if (!selectionMatchesRange(editor, paragraphRange)) {
              editor.setSelection(paragraphRange.from, paragraphRange.to);
              return true;
            }
          }

          if (headingBodyRange) {
            if (!selectionMatchesRange(editor, headingBodyRange)) {
              editor.setSelection(headingBodyRange.from, headingBodyRange.to);
              return true;
            }
          }

          selectAllExceptTopHeading(editor);
        }

        return true;
      },
    });
  }
};
