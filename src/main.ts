import { htmlToMarkdown, MarkdownView, normalizePath, Notice, Plugin, sanitizeHTMLToDom, Setting, stringifyYaml, TFile, Vault } from 'obsidian';
import { QuipAPIClient } from './quipapi';
import render from './renderer';
import { DEFAULT_SETTINGS, QuipPluginSettings, QuipSettingTab } from './settings';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { ImportModal } from './ImportModal';
import { SuccessModal } from './SuccessModal';


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
						var title = null;
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
					let url: string = null;
					const modal = new ImportModal(this.app, client, (url) => {
						this.importHTML(url);
					});
					modal.open();
					(window as any).modal = modal;
				} catch (error) {
					console.error(error);
					const text = error.message || JSON.stringify(error.info);
					new Notice(text);
				}
			}
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new QuipSettingTab(this.app, this));
	}

	async createOrModifyBinary(filename_base: string, blob: Blob): Promise<string> {
		const active_file = this.app.workspace.getActiveFile();
		let parent = this.app.vault.getRoot();
		if (active_file) {
			parent = this.app.fileManager.getNewFileParent(active_file.path);
		}
		const type = blob.type;
		let extension = type.split('image/', 2).at(1);
		if (extension == 'svg+xml') {
			extension = 'svg';
		}
		const filename = `${filename_base}.${extension}`;
		const filepath = normalizePath(`${parent.path}/${filename}`);
		const file = this.app.vault.getAbstractFileByPath(filepath);
		if (file && file instanceof TFile) {
			this.app.vault.modifyBinary(file, await blob.arrayBuffer());
		} else {
			this.app.vault.createBinary(filepath, await blob.arrayBuffer());
		}
		return filename;
	}

	async createOrModifyNote(title: string, markdown: string, front_matter: any): Promise<TFile> {
		const active_file = this.app.workspace.getActiveFile();
		let parent = this.app.vault.getRoot();
		if (active_file) {
			parent = this.app.fileManager.getNewFileParent(active_file.path);
		}
		const filename = normalizePath(`${parent.path}/${title}.md`);
		const file_content = `---
${stringifyYaml(front_matter)}
---
${markdown}`;
		let file = this.app.vault.getAbstractFileByPath(filename);
		if (file && file instanceof TFile) {
			this.app.vault.modify(file, file_content);
			return file;
		} else {
			return this.app.vault.create(filename, file_content);
		}

	}

	async importHTML_IMG(img: HTMLElement, client: QuipAPIClient) {
		const src = img.getAttribute('src');
		if (src) {
			const blob = await client.getBlob(src);
			const filename_base = `${info.title.replaceAll(' ', '_')}${src.replaceAll('/', '-')}`;
			const filename = await this.createOrModifyBinary(filename_base, blob);
			img.setAttribute('src', filename);
		}
	}

	// Import a Quip document into an Obsidian note
	async importHTML(url: string) {
		const td = new TurndownService({
			headingStyle: "atx",
			hr: '***',
			bulletListMarker: '-',
			codeBlockStyle: 'fenced',
		});
		td.use(gfm);
        const secret_path = url.split('.com/', 2).at(1).split('/').at(0);
		const client = new QuipAPIClient(this.settings.hostname, this.settings.token);
		const html = await client.getDocumentHTML(secret_path);
		const info = (await client.getThread(secret_path)).thread;
		const fragment = sanitizeHTMLToDom(html);
        for (const img of Array.from(fragment.querySelectorAll('img'))) {
			this.importHTML_IMG(img, client);
		}
		const markdown = td.turndown(fragment);
		const front_matter = {
			title: info.title,
			quip: url,
		};
		const title = info.title;
		const file = this.createOrModifyNote(info.title, markdown, front_matter);
		this.app.workspace.getLeaf('tab').openFile(await file);
	}

	async publishHTML(markdownView: MarkdownView, title: string) {
		// Quip import likes to replace the first heading with the document title
		var html = await render(this, markdownView, this.app.workspace.getActiveFile());
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
			new SuccessModal(this.app, link).open();
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
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


