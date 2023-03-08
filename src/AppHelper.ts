import { App, getLinkpath, normalizePath, stringifyYaml, TFile, TFolder, Vault } from 'obsidian';

export class AppHelper {
	app: App;
	vault: Vault;

	constructor(app: App) {
		this.app = app;
		this.vault = app.vault;
	}

	async createOrModifyBinary(filename_base: string, blob: Blob): Promise<string> {
		const parent = this.getParentFolder();
		const type = blob.type;
		let extension = type.split('image/', 2).at(1);
		if (extension == 'svg+xml') {
			extension = 'svg';
		}
		const filename = `${filename_base}.${extension}`;
		const filepath = normalizePath(`${parent.path}/${filename}`);
		const file = this.vault.getAbstractFileByPath(filepath);
		if (file && file instanceof TFile) {
			this.vault.modifyBinary(file, await blob.arrayBuffer());
		} else {
			this.vault.createBinary(filepath, await blob.arrayBuffer());
		}
		return filename;
	}

	async createOrModifyNote(title: string, markdown: string, front_matter: any): Promise<TFile> {
		const parent = this.getParentFolder();
		const filename = normalizePath(`${parent.path}/${title}.md`);
		const file_content = `---
${stringifyYaml(front_matter)}
---
${markdown}`;
		let file = this.vault.getAbstractFileByPath(filename);
		if (file && file instanceof TFile) {
			this.vault.modify(file, file_content);
			return file;
		} else {
			return this.vault.create(filename, file_content);
		}
	}

	async getNoteByTitle(title: string): Promise<TFile | null> {
		return this.app.metadataCache.getFirstLinkpathDest(getLinkpath(title), this.app.vault.getRoot().path);
	}

	getParentFolder(): TFolder {
		const active_file = this.app.workspace.getActiveFile();
		let parent = this.vault.getRoot();
		if (active_file) {
			parent = this.app.fileManager.getNewFileParent(active_file.path);
		}
		return parent;
	}
}
