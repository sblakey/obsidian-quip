# Quip plugin for Obisidian

This is a simple plugin for Obsidian (https://obsidian.md) to talk with Quip (the lightweight document tool from Salesforce, not the toothbrush).

**Note:** The Obsidian API is still in early beta and is subject to change at any time!

Currently, this plugin exposes two Commands:
- **Publish as new Quip document**, which uses Obsidican internals to create an HTML document for import to Quip.
- **Update existing Quip document**, which overwrites the existing Quip document with a fresh rendering from Obsidian.

For notes on how to work with this codebase, see [DEVELOPING.md](./DEVELOPING.md)

## Installing this plugin as a Beta Tester

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins in Obsidian
2. Copy the link https://github.com/sblakey/obsidian-quip
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

## What Works, What Doesn't

Test table based on Obsdian's [How To Format Your Notes](https://help.obsidian.md/How+to/Format+your+notes)

| Obsidian Markdown | Publish to Quip        |
| ----------------- | ---------------------- |
| Internal linking  | :x:                    |
| Embeds            | see below              |
| Headings          | :white_check_mark:     |
| Unnumbered Lists  | :white_check_mark:     |
| Numbered Lists    | :white_check_mark:     |
| nested Lists      | :white_check_mark:     |
| Task Lists        | :x:                    |
| External images   | :white_check_mark:     |
| resizing images   | :x:                    |
| embedded images   | :white_check_mark:     |
| Block Quotes      | :x:                    |
| Tables            | :white_check_mark:     |
| Footnotes         | :x:                    |
| Math              | :x:                    |
| Code              | :white_check_mark:     |
| Highlighting      | :x:                    |
| Comments          | :x:                    |
| Callouts          | :x:                    |
| Mermaid           | :x:                    |

### Configurable processing

This plugin makes an effort at doing the following content processing in ways that you would expect of Obsidian. These can 
be disabled in Settings:

1. [YAML front matter](https://help.obsidian.md/Advanced+topics/YAML+front+matter), if present, will be stripped out of content before publishing.
2. [Embed Notes](https://help.obsidian.md/How+to/Embed+files), if present, will be recursively parsed as markdown and inlined.

