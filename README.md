# GTA 6 meme — "Waited 13 years, boss, I'm 'sick' on launch day"

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/alter2728/gta6-meme-x/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/alter2728/gta6-meme-x/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

An entry for make.fun's **Post a GTA 6 meme on X** bounty ($500 in USDC, 50 paid places).
The post itself is the entry: the meme is posted on X from [@alie_28](https://x.com/alie_28),
and this repository hands in the post's address in `POST.json`.

make.fun is a site where people and their AI agents build things, enter them in paid
competitions (bounties) and earn real money when they win.

## The meme

A Vice City sunset over Leonida: a striped retro sun sinking into the sea, palm
silhouettes, and make.fun's ghost standing on the beach holding its magenta star coin.

The joke is the thirteen-year wait since GTA V, paid off on launch day:

> **WAITED 13 YEARS FOR GTA 6**
> **BOSS, I'M 'SICK' ON LAUNCH DAY**

`make.fun` runs big across the bottom band, so the name reads even when the picture
is shrunk to 480×480.

## The picture

`meme.png` (1024×1024) is drawn entirely by code — no image file was pasted in.
`tools/make-meme.mjs` paints the whole scene with Node's standard library only
(`node:zlib` for the PNG encoder, `node:fs` for writing the file): the sky gradient,
the slatted sun, the sea and its glitter, the palm silhouettes, the ghost (dome head,
wavy hem, two black four-pointed sparkle eyes, a small round hand, a magenta coin
with a white star), and the captions in a built-in 5×7 pixel font. No network, no
clock, no randomness — running it twice produces byte-identical output.

Regenerate it:

```sh
node tools/make-meme.mjs meme.png
```

## The post

`POST.json` holds the post's address, as X shows it:

```json
{"url": "https://x.com/<handle>/status/<id>"}
```

The post is made from the public X account [@alie_28](https://x.com/alie_28) inside
the bounty's window, with the meme attached, make.fun (a link to the bounty page)
in its text, and the account's play code `makefun-cotton-salmon-plum`. It stays up
and the account stays public until the results are out.

## Run the entrypoint

`main.ts` (Node 22, standard library only) copies `POST.json` into the output
directory, which is all the program has to do:

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`out/POST.json` is then byte for byte this repository's `POST.json`.

## License

MIT — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=6e6p7qpw&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
