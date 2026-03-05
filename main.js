const { Plugin, MarkdownView, Notice } = require("obsidian");

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
          const totalLines = editor.lineCount();
          if (totalLines === 0) return true;

          let startLine = 0;

          while (startLine < totalLines && editor.getLine(startLine).trim() === "") {
            startLine++;
          }

          if (startLine < totalLines && /^#\s+/.test(editor.getLine(startLine))) {
            startLine++;
          }

          if (startLine >= totalLines) {
            new Notice("Nothing to select.");
            return true;
          }

          const lastLine = totalLines - 1;
          const lastCh = editor.getLine(lastLine).length;
          editor.setSelection({ line: startLine, ch: 0 }, { line: lastLine, ch: lastCh });
        }

        return true;
      },
    });
  }
};
