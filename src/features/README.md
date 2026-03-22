# Features

- **`feeds/`** — Feed posts context, composer, story viewer, ranking, post cards, comments helpers. Used by `app/feeds/*` routes.
- **`spaces/`** — Space (channel) chat UI (`SpaceChatView`) for `app/[code]`.

Route files stay under `src/app/…`; feature logic lives here to keep URLs stable and separate UI from routing.
