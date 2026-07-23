# Adaptive TUI

## Layout contract

The main TUI intentionally has no outer top frame and no outer left frame. The transcript begins directly in the terminal surface.

The bottom three rows are reserved for:

1. Inline chat composer
2. Detail strip
3. Keyboard legends

The transcript uses the remaining height and can scroll without moving the composer.

## Responsive behavior

- Wide terminal: conversation and right sidebar
- Narrow terminal: conversation only
- `Ctrl+B`: manual sidebar toggle
- `Tab`: focus composer, transcript, or sidebar
- Mouse wheel: scroll the pane under the pointer
- `PgUp` and `PgDn`: page through transcript history

The sidebar has its own scroll offset and contains Status, Model, Loadout, and Recent Logs.

## Scroll behavior

When transcript scroll offset is zero, new messages remain visible. When the user scrolls up, new activity does not reset the scroll offset. A `lines below` indicator appears beside the composer.

## Picker behavior

`/model`, `/loadout`, and `/session` use centered modal pickers. Arrow keys and numeric selection are supported. In the model picker, `0` opens manual model ID entry after a provider is selected.
