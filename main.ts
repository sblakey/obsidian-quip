import { App, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
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
			name: 'Publish as new Quip document',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				// Conditions to check
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
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
		const client = new QuipAPIClient(this.settings.hostname, this.settings.token);
		// Quip import likes to replace the first heading with the document title
		const html = await render(this, markdownView, markdownView.file);
		console.log(html);
		new Notice(`Publishing to ${this.settings.hostname}...`)
		try {
			const response = await client.newHTMLDocument(html);
			this.onSuccessfulPublish(response.thread.link);
		} catch (error) {
			console.log(error);
			const text = JSON.stringify(error.info);
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
		const { contentEl } = this;
		//contentEl.setText(`Successfully published to ${this.link}`);
		contentEl.createEl('span', null, (span) => {
			span.innerText = 'Successfully published to ';
			span.createEl('a', null, (anchor) => {
				anchor.href = this.link;
				anchor.innerText = this.link;
			});
		})
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}