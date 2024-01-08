import { MarkdownView, Notice, Plugin } from 'obsidian';
import { QuipAPIClient } from './quipapi';
import render from './renderer';
import { DEFAULT_SETTINGS, QuipPluginSettings, QuipSettingTab } from './settings';
import { ImportModal } from './ImportModal';
import { SuccessModal } from './SuccessModal';
import { Importer } from './Importer';


interface QuipFrontMatter {
	quip: string;
	title?: string;
}

export interface QuipThread {
	link: string;
	title?: string;
	id?: string;
}

export default class QuipPlugin extends Plugin {
	settings: QuipPluginSettings;
	cached_recent_threads: Promise<QuipThread[]>;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'publish-html',
			name: 'Publish as new Quip document',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				// Conditions to check
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						let title = null;
						if (this.settings.prependTitle) {
							const file = this.app.workspace.getActiveFile();
							title = this.app.metadataCache.getFileCache(file).frontmatter?.title || file.basename;
						}
						this.publishHTML(markdownView, title);
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		this.addCommand({
			id: 'update-html',
			name: 'Update existing Quip document',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				// Conditions to check
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					const link = this.app.metadataCache.getFileCache(this.app.workspace.getActiveFile()).frontmatter?.quip;
					if (link) {
						if (!checking && link) {
							this.updateHTML(link, markdownView);
						}

						// This command will only show up in Command Palette when the check function returns true
						return true;
					}
				}
				return false;
			}
		});

		this.addCommand({
			id: 'import',
			name: 'Import Quip document',
			callback: () => {
				try {
					const client = new QuipAPIClient(this.settings.hostname, this.settings.token);
					const modal = new ImportModal(this.app, client, this.cached_recent_threads, (url) => {
						new Importer(this).importHTML(url);
					});
					modal.open();
				} catch (error) {
					console.error(error);
					const text = error.message || JSON.stringify(error.info);
					new Notice(text);
				}
			}
		});

		this.addCommand({
			id: 'refresh',
			name: 'Refresh note from Quip document',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				// Conditions to check
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					const link = this.app.metadataCache.getFileCache(this.app.workspace.getActiveFile()).frontmatter?.quip;
					if (link) {
						if (!checking && link) {
							new Importer(this).importHTML(link, this.app.workspace.getActiveFile());
						}

						// This command will only show up in Command Palette when the check function returns true
						return true;
					}
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new QuipSettingTab(this.app, this));
	}


	async publishHTML(markdownView: MarkdownView, title: string) {
		// Quip import likes to replace the first heading with the document title
		let html = await render(this, markdownView, this.app.workspace.getActiveFile());
		if (title) {
			html = `<h1>${title}</h1>${html}`
		}
		new Notice(`Publishing to ${this.settings.hostname}...`)
		try {
			const client = new QuipAPIClient(this.settings.hostname, this.settings.token);
			const response = await client.newHTMLDocument(html, title);
			this.onSuccessfulPublish(response.thread.link);
		} catch (error) {
			console.error(error);
			const text = error.message || JSON.stringify(error.info);
			new Notice(text);
		}
	}

	async updateHTML(link: string, markdownView: MarkdownView) {
		// Quip import likes to replace the first heading with the document title
		const html = await render(this, markdownView, this.app.workspace.getActiveFile());
		new Notice(`Publishing to ${this.settings.hostname}...`)
		try {
			const client = new QuipAPIClient(this.settings.hostname, this.settings.token);
			await client.updateHTMLDocument(link, html);
			new SuccessModal(this.app, link, `If your Quip document hasn't updated yet, try refreshing.`).open();
		} catch (error) {
			console.error("Failure invoking Quip APIs", error);
			console.dir(error);
			const text = error.message || JSON.stringify(error.info);
			new Notice(text);
		}
	}

	onSuccessfulPublish(link: string): void {
		if (this.settings.addLink) {
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
		this.cached_recent_threads = this.tryPreload();
	}

	async saveSettings() {
		this.cached_recent_threads = this.tryPreload();
		await this.saveData(this.settings);
	}

	async tryPreload(): Promise<QuipThread[]> {
		const recent: QuipThread[] = [];
		try {
			const client = new QuipAPIClient(this.settings.hostname, this.settings.token);
			for (const [thread_id, thread_response] of Object.entries(await client.getRecentThreads())) {
				const thread_info = thread_response.thread;
				recent.push(thread_info);
			}
		} catch (error) {
			// swallow this error
			console.error(error);
		}
		return recent;
	}
}


