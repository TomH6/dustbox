# How we work together

There are two of us, and this is the routine that stops us from overwriting each other's work.

## 1. Pick something

All work starts as an issue. Use **New issue** and choose Bug or Idea. Before you start, assign the issue to yourself so the other person knows it's taken. The **Projects** tab can show the issues as a board (To do, Doing, Done) if you want one.

## 2. Make a branch

```sh
git checkout main
git pull
git checkout -b feature/short-name   # or fix/short-name
```

## 3. Work and check

Run the app locally with `python3 -m http.server 8000`, then open http://localhost:8000. Before you push, run `./tools/check.sh`.

## 4. Open a pull request

Push your branch and open a pull request into `main`. Fill in the template, and write `Closes #12` to link the issue. The automatic check runs on every pull request; it must pass before you merge.

## 5. Review and merge

The other person tries the change, comments or approves, and then it's merged with **Squash and merge**. The site updates within a minute or two, and the branch is deleted automatically.

## Tips

- Small pull requests get reviewed fast and rarely clash.
- If you both need to change the same file, say so in the issue first.
- If you use an AI coding assistant, it reads `AGENTS.md` (Claude Code reads it through `CLAUDE.md`). Keep that file up to date when the structure changes.
