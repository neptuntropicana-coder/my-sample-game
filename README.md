# my-sample-game

A small 2D platformer that runs in the browser. Original art, no assets, no
dependencies, no build step.

## Run it

Open `index.html` — double-clicking it is enough. There is no server, no
install, and no toolchain.

## Controls

| Key | Action |
|---|---|
| `←` `→` or `A` `D` | Run |
| `Space` | Jump (hold for a higher jump) |
| `R` | Restart |

Reach the flag at the far right to win.

## Scope

One level, one goal. Deliberately **no** enemies, coins, score, lives, menus,
or sound. Movement is variable-height jumping with light acceleration and
friction, over a scrolling tilemap.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Canvas element and styles |
| `level.js` | The tilemap, as 96x18 characters plus its legend |
| `game.js` | Physics, collision, camera, rendering, input |

`level.js` and `game.js` load with classic `<script>` tags, not ES modules, so
the game still works from `file://` — modules are blocked there by CORS, as is
`fetch()`. That constraint is why the level is a JavaScript constant rather
than an external JSON file.

## Editing the level

In `level.js`, one character is one 15px tile:

```
.  air        #  solid ground     =  brick
P  pipe       G  goal
```

Rows are composed of 16-character chunks so every row is exactly 96 tiles.
`game.js` throws on load if a row length is wrong, so a mismatch fails loudly
rather than producing a corrupt level.

## License

MIT
