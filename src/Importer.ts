import { App, getLinkpath, normalizePath, parseFrontMatterEntry, sanitizeHTMLToDom } from 'obsidian';
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
		this.hostname = plugin.settings.hostname;
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
		console.dir(this);
		console.log("Processing link", anchor);
		const href = anchor.getAttribute('href');
		if (href && this.hostname.contains(new URL(href).hostname)) {
			console.log("href matches configured hostname", href);
			// try to remap link to relevant Obsidian note, if one exists
			const secret_path = href.split('.com/', 2).at(1).split('/').at(0);
			const title = anchor.innerText;
			const file = await this.helper.getNoteByTitle(title);
			if (file) {
				console.log("File found", file);
				const frontmatter = this.app.metadataCache.getCache(file.path).frontmatter;
				if (frontmatter) {
					console.log("Frontmatter found", frontmatter);
					const quip = parseFrontMatterEntry(frontmatter, "quip");
					console.log("quip", quip);
					console.log("secret_path", secret_path);
					if (quip && quip.contains(secret_path)) {
						console.log("Found matching frontmatter entry");
						anchor.setAttribute('href', encodeURIComponent(file.path));
						console.log("Updated anchor", anchor);
					}
				}
			}
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
			await this.process_A(anchor);
		}
		for (const img of Array.from(fragment.querySelectorAll('img'))) {
			await this.process_IMG(img, info);
		}
		console.log("Processed html", fragment);
		const markdown = this.td.turndown(fragment);
		const front_matter = {
			title: info.title,
			quip: url,
			quip_thread_imported: {
				id: info.id,
				updated_usec: 0,
				updated_datetime: ''
			}
		};
		if (info.updated_usec) {
			front_matter.quip_thread_imported.updated_usec = info.updated_usec;
			front_matter.quip_thread_imported.updated_datetime = new Date(info.updated_usec / 1000).toLocaleString();
		}
		const file = new AppHelper(this.app).createOrModifyNote(info.title, markdown, front_matter);
		this.app.workspace.getLeaf('tab').openFile(await file);
	}
}
