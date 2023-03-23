# Quip plugin for Obisidian

This is a simple plugin for Obsidian (https://obsidian.md) to talk with Quip (the lightweight document tool from Salesforce, not the toothbrush).

**Note:** The Obsidian API is still in early beta and is subject to change at any time!

Currently, this plugin exposes three Commands:
- **Import Quip Document**, which tries to transform a Quip document into a new Obsidian note.
- **Publish as new Quip document**, which uses Obsidican internals to create an HTML document for import to Quip.
- **Update existing Quip document**, which overwrites the existing Quip document with a fresh rendering from Obsidian.

For notes on how to work with this codebase, see [DEVELOPING.md](./DEVELOPING.md)

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

Currently, the Quip API rejects document creation for large notes (more than 1 MB). This is an easy limit to hit for documents with images, since they are currently embedded as inline images with data urls, before sending to Quip.

Test table based on Obsdian's [How To Format Your Notes](https://help.obsidian.md/How+to/Format+your+notes)

| Obsidian Markdown | Publish to Quip        | Import from Quip |
| ----------------- | ---------------------- | ---------------- |
| Internal linking  | :x:                    | :x:              |
| Embeds            | see below              | :x:              |
| Headings          | :white_check_mark:     | :white_check_mark: |
| Unnumbered Lists  | :white_check_mark:     | :white_check_mark: |
| Numbered Lists    | :white_check_mark:     | :white_check_mark: |
| nested Lists      | :white_check_mark:     | :x:              |
| Task Lists        | :x:                    | :x:              |
| External images   | :white_check_mark:     | :x:              |
| resizing images   | :x:                    | :x:              |
| embedded images   | :white_check_mark:     | :white_check_mark: |
| Block Quotes      | :x:                    | :x:              |
| Tables            | :white_check_mark:     | :bug:            |
| Footnotes         | :x:                    | :x:              |
| Math              | :x:                    | :x:              |
| Code              | :white_check_mark:     | :x:              |
| Highlighting      | :x:                    | :x:              |
| Callouts          | :x:                    | :x:              |
| Comments          | :white_check_mark:     | :x:              |
| Embedded Canvas   | :x:                    | :x:              |
| Mermaid           | :x:                    | :x:              |

### Link remapping

When **publishing** to Quip, this plugin will attempt to remap links-to-Obsidian-notes to links-to-Quip-documents, if it finds that the linked note has been previously published or imported. This is done by examining the `quip` key in YAML frontmatter.

Similarly, when **importing** from Quip, this plugin will check for Obsidian documents with the same name with appropriate `quip` keys, and remap the links to local nots.

### Configurable processing

This plugin makes an effort at doing the following content processing in ways that you would expect of Obsidian. These can 
be disabled in Settings:

1. [YAML front matter](https://help.obsidian.md/Advanced+topics/YAML+front+matter), if present, will be stripped out of content before publishing.
2. [Embed Notes](https://help.obsidian.md/How+to/Embed+files), if present, will be recursively parsed as markdown and inlined.

### YAML front matter attributes

This plugin understands two possible attributes in your note's [YAML front matter](https://help.obsidian.md/Advanced+topics/YAML+front+matter):

- `quip`: URL to the quip document published from this note. If present, this URL will be used for the **Update existing Quip document** command.
- `title`: If present when the note is first published, will **override** the Note name as a document title in Quip. Note that you will also need to turn on the "Add Note name as Quip document title" setting to enable this feature, and that this plugin cannot **update** the titles of notes.
- `quip_thread`: Attributes of the Quip "thread" used for the most recent import.
