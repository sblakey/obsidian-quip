import { App, CachedMetadata, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import { QuipAPIClient } from './quipapi';
import render from './renderer';
import { DEFAULT_SETTINGS, QuipPluginSettings, QuipSettingTab } from './settings';

// Remember to rename these classes and interfaces!

interface QuipFrontMatter {
	quip: string;
}



export default class QuipPlugin extends Plugin {
	settings: QuipPluginSettings;

	async onload() {
		await this.loadSettings();


		this.addCommand({
			id: 'quip-publish-html',
			name: 'Publish as rendered HTML',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.publishHTML(markdownView);
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new QuipSettingTab(this.app, this));
	}

	async publishHTML(markdownView: MarkdownView) {
		let client = new QuipAPIClient(this.settings.hostname, this.settings.token);
		// Quip import likes to replace the first heading with the document title
		const html = await render(this, markdownView, markdownView.file);
		console.log(html);
		new Notice(`Publishing to ${this.settings.hostname}...`)
		try {
			const response = await client.newHTMLDocument(html);
			this.onSuccessfulPublish(response.thread.link);
		} catch (error) {
			console.log(error);
			let text = JSON.stringify(error.info);
			new Notice(text);
		}
	}

	onSuccessfulPublish(link: string): void {
		console.log("Settings", this.settings);
		if (this.settings.addLink) {
			new Notice("Adding link to front matter");
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			this.app.fileManager.processFrontMatter(markdownView.file,
				(frontMatter: QuipFrontMatter) => {
					frontMatter.quip = link;
				})
		}
		new SuccessModal(this.app, link).open();

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


export class SuccessModal extends Modal {
	link: string;

	constructor(app: App, link: string) {
	  super(app);
	  this.link = link;
	}
  
	onOpen() {
	  let { contentEl } = this;
	  contentEl.createEl('span', null, (span) => {
		span.innerText = 'Successfully published to ';
		span.createEl('a', null, (anchor) => {
			anchor.href = this.link;
			anchor.innerText = this.link;
		});
	  })
	}
  
	onClose() {
	  let { contentEl } = this;
	  contentEl.empty();
	}
  }



async function preProcessMarkdown(plugin: QuipPlugin, file: TFile): Promise<string> {
    const adapter = plugin.app.vault.adapter as FileSystemAdapter;
	const title = file.basename;
	let content = await adapter.read(file.path);
	console.log('Raw markdown content', content)
	if (plugin.settings.removeYAML && content.startsWith('---')) {
		const end_marker = content.indexOf('---', 3);
		content = content.substring(end_marker + 3).trim();
		console.log('Content after trimming YAML front matter', content)
	}
	if (plugin.settings.inlineEmbeds) {
		const cache: CachedMetadata = this.app.metadataCache.getCache(file.path)
		console.log("Metadata", cache);
		if ('embeds' in cache) {
			for (const embed of cache.embeds) {
				console.log("Embed", embed);
				const subfolder = file.path.substring(adapter.getBasePath().length);  // TODO: this is messy
				const embeddedFile = plugin.app.metadataCache.getFirstLinkpathDest(embed.link, subfolder);
				const embeddedContent = await preProcessMarkdown(plugin, embeddedFile)
				console.log("Embedded Content", embeddedContent);
				content = content.replace(embed.original, embeddedContent);
			}
		}
	}
	// Quip import likes to replace the first heading with the document title
	content = `# ${title}\n${content}`;
	return content;
}