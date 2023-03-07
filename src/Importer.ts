import { App, prepareSimpleSearch, sanitizeHTMLToDom } from 'obsidian';
import { QuipAPIClient } from './quipapi';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { AppHelper } from './AppHelper';
import QuipPlugin, { QuipThread } from './main';

export class Importer {
	client: QuipAPIClient;
	td: TurndownService;
	app: App;
	helper: AppHelper;
	hostname: string;

	constructor(plugin: QuipPlugin) {
		this.hostname = plugin.settings.hostname.toLowerCase();
		this.client = new QuipAPIClient(plugin.settings.hostname, plugin.settings.token);
		this.td = new TurndownService({
			headingStyle: "atx",
			hr: '***',
			bulletListMarker: '-',
			codeBlockStyle: 'fenced',
		});
		this.td.use(gfm);
		this.app = plugin.app;
		this.helper = new AppHelper(plugin.app);
	}

	async process_A(anchor: HTMLElement) {
		const href = anchor.getAttribute('href');
		if (href && href.toLowerCase().contains(this.hostname)) {
			// try to remap link to relevant Obsidian note, if one exists
			const secret_path = url.split('.com/', 2).at(1).split('/').at(0);
			const canonical_url = `https://${this.hostname}/${secret_path}`;
			const query = `"quip: ${canonical_url}"`;
			prepareSimpleSearch();
		}
	}

	async process_IMG(img: HTMLElement, info: QuipThread) {
		const src = img.getAttribute('src');
		if (src) {
			const blob = await this.client.getBlob(src);
			const filename_base = `${info.title.replaceAll(' ', '_')}${src.replaceAll('/', '-')}`;
			const filename = await this.helper.createOrModifyBinary(filename_base, blob);
			img.setAttribute('src', filename);
		}
	}

	// Import a Quip document into an Obsidian note
	async importHTML(url: string) {
		const secret_path = url.split('.com/', 2).at(1).split('/').at(0);
		const html = await this.client.getDocumentHTML(secret_path);
		const info = (await this.client.getThread(secret_path)).thread;
		const fragment = sanitizeHTMLToDom(html);
		for (const anchor of Array.from(fragment.querySelectorAll('a'))) {
			this.process_A(anchor);
		}
		for (const img of Array.from(fragment.querySelectorAll('img'))) {
			this.process_IMG(img, info);
		}
		const markdown = this.td.turndown(fragment);
		const front_matter = {
			title: info.title,
			quip: url,
		};
		const title = info.title;
		const file = new AppHelper(this.app).createOrModifyNote(info.title, markdown, front_matter);
		this.app.workspace.getLeaf('tab').openFile(await file);
	}
}
