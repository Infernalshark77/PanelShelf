export function ShortcutHelp() {
  return (
    <div className="reader-help panel">
      <div className="panel__header">
        <h3>Keyboard shortcuts</h3>
      </div>
      <div className="shortcut-grid">
        <div>
          <kbd>←</kbd>
          <span>Previous page</span>
        </div>
        <div>
          <kbd>→</kbd>
          <span>Next page</span>
        </div>
        <div>
          <kbd>Space</kbd>
          <span>Next page</span>
        </div>
        <div>
          <kbd>F</kbd>
          <span>Fullscreen</span>
        </div>
        <div>
          <kbd>B</kbd>
          <span>Add bookmark</span>
        </div>
        <div>
          <kbd>1</kbd>
          <span>Single page</span>
        </div>
        <div>
          <kbd>2</kbd>
          <span>Double spread</span>
        </div>
        <div>
          <kbd>3</kbd>
          <span>Vertical scroll</span>
        </div>
        <div>
          <kbd>W</kbd>
          <span>Fit width</span>
        </div>
        <div>
          <kbd>H</kbd>
          <span>Fit height</span>
        </div>
        <div>
          <kbd>R</kbd>
          <span>Toggle reading direction</span>
        </div>
        <div>
          <kbd>?</kbd>
          <span>Show shortcuts</span>
        </div>
      </div>
    </div>
  );
}
