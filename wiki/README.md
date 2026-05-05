# Wiki source

These markdown files are the source for the [Wipeout Auto GitHub Wiki](https://github.com/johngplma/wipeout-auto/wiki). They live in the main repo so they version with the code; GitHub serves them from a separate `wipeout-auto.wiki.git` repository.

## Publishing changes to the wiki

GitHub wikis are stored in a sibling git repo. To push these files to the live wiki:

```sh
# one-time clone of the wiki repo (alongside your main checkout)
git clone https://github.com/johngplma/wipeout-auto.wiki.git

# from the main repo, sync the contents of wiki/ into the wiki repo
cp wiki/*.md ../wipeout-auto.wiki/
cd ../wipeout-auto.wiki
git add .
git commit -m "Sync wiki from main repo"
git push
```

The wiki must already exist on GitHub before the `.wiki.git` URL is reachable. To initialize it, go to the repo's **Wiki** tab on GitHub and create the first page through the web UI (e.g. paste in `Home.md`), then clone and push the rest as above.

## Pages

| File | URL slug |
| --- | --- |
| `Home.md` | `/wiki` (landing page) |
| `Installation.md` | `/wiki/Installation` |
| `Whitelist.md` | `/wiki/Whitelist` |
| `Categories.md` | `/wiki/Categories` |
| `Settings.md` | `/wiki/Settings` |
| `Activity-Log.md` | `/wiki/Activity-Log` |
| `FAQ.md` | `/wiki/FAQ` |
| `_Sidebar.md` | rendered as the wiki sidebar on every page |
