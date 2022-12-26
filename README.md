# Quip plugin for Obisidian

This is a simple plugin for Obsidian (https://obsidian.md) to talk with Quip (the lightweight document tool from Salesforce, not the toothbrush).

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

**Note:** The Obsidian API is still in early alpha and is subject to change at any time!

Currently, this plugin exposes two Commands:
- **Publish as Markdown**, which sends the raw markdown source of an Obsidian note to Quip for import as a private document.
- **Publish rendered HTML**, which uses Obsidican internals to create an HTML document for import to Quip.

## Installing this plugin as a Beta Tester

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins in Obsidian
2. Copy the link https://github.com/sblakey/obsidian-quip.git
3. Open the command palette and run the command **BRAT: Add a beta plugin for testing**
4. Using the link from step 2, copy that into the modal that opens up
5. Click on Add Plugin -- wait a few seconds and BRAT will tell you what is going on
6. After BRAT confirms the installation, in Settings go to the **Community plugins ** tab.
7. Refresh the list of plugins
8. Find the beta plugin you just installed - "Obsidian Quip" - and Enable it.

## Linking to your Corporate Quip instance

You will need to provide this plugin with two settings: the portal API endpoint and your developer key.

Your corporate account using Quip must meet the [License Requirements for access to the Automation API](https://quip.com/dev/automation/documentation/current#section/License-Requirements).

| If you normally use quip in the browser at | Your API hostname is         | You can get your dev token at         |
| ------------------------------------------ | ---------------------------- | ------------------------------------- |
| quip.com                                   | platform.quip.com            | https://quip.com/dev/token            |
| CUSTOMER.onquip.com                        | platform.CUSTOMER.onquip.com | https://CUSTOMER.onquip.com/dev/token |
| quip-CUSTOMER.com                          | platform.quip-CUSTOMER.com   | https://quip-CUSTOMER.com/dev/token   |


Note that you can only have one "dev token" at a time across all of your automation tools: command-line scripts, Greasemonkey/Tampermonkey browser extensions, and plugins like this. Rather than just copy-pasting from the `/dev/token` URL, I highly recommend keeping this token in your password manager of choice (Bitwarden, 1Password, KeePass, etc.)

----

# Notes from the Obsidian Sample Plugin

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
