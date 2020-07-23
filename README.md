<p align="center">
  <img
    alt="Logo by Nikita Ivanov"
    src="https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon@2x.png"
    srcset="https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon@0.75x.png 0.75x, https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon.png 1x, https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon@1.5x.png 1.5x, https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon@2x.png 2x, https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon@3x.png 3x, https://github.com/DiogoAbu/chatty/blob/master/src/assets/logo/icon@4x.png 4x"
  />
</p>

<h1 align="center">Chatty (Server)</h1>

<div align="center">
  <strong>Talk more</strong>
</div>

<div align="center">
  <h3>
    <a href="#">
      Website
    </a>
    <span> | </span>
    <a href="https://github.com/DiogoAbu/chatty">
      App
    </a>
  </h3>
</div>

<div align="center">
    <a href="https://dribbble.com/shots/4856298-Logo-Challenge-Messaging-App">
      Logo by Nikita Ivanov (Pending permission)
    </a>
</div>

## Table of Contents <!-- omit in toc -->
- [Development](#development)
- [Built with](#built-with)
- [License](#license)

## Development
Want to contribute? Great, read [CONTRIBUTING.md](#) for details on our code of conduct.

To start developing, follow these steps:

- Fork the repo.
- Make sure you are on master (`git checkout master && git pull`).
- Create a new branch (`git checkout -b featureName`).
- Make the appropriate changes in the files.
- Add the files to reflect the changes made (`git add .`).
- Commit your changes (`git commit -m "perf: stop querying all user data"`).
  - The message MUST follow the [conventional commit format](https://conventionalcommits.org/).
  - Examples:
    - `docs: correct spelling on README`
    - `fix: correct minor typos in code`
    - `feat(post): add reactions`
- The commit will trigger linters and tests, check if everything finished successfully.
- Push the current branch (`git push`).
- Create a [Pull Request](https://github.com/DiogoAbu/chatty-server/compare) across forks.

*On VS Code you can use the extension Conventional Commits (vscode-conventional-commits)*

### Bug / Feature Request
Kindly open an issue [here](https://github.com/DiogoAbu/chatty-server/issues/new/choose) name it and label it accordingly.

### Releases
We use Github Actions to test and release the app. Deploys happen automatically with Heroku.

When a push happens on `master`, `beta`, or `maintenance branchs` it will trigger some [workflow](https://github.com/DiogoAbu/chatty-server/blob/master/.github/workflows)

**Release workflow:**
- Set up the environment (node).
- Run tests.
- Analize commits to define next version.
- Update version on package.json.
- Commit the changes.
- Create a tagged release with release notes.
- Heroku will automatically deploy.

**Associate tag with commit**
```bash
git tag -d TAGNAME
git tag TAGNAME COMMIT_HASH
git push origin :TAGNAME
git push origin TAGNAME
```

## Built with
*Check out the projects to know more*

* [Apollo GraphQL](https://www.apollographql.com) - The [server](https://github.com/DiogoAbu/chatty-server)
* [React Native](https://facebook.github.io/react-native) - The [app](https://github.com/DiogoAbu/chatty)

## License
This project and it`s workspaces are licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details
