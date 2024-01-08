import { App, Modal } from 'obsidian';



export class SuccessModal extends Modal {
	link: string;
	message?: string;

	constructor(app: App, link: string, message?: string) {
		super(app);
		this.link = link;
		this.message = message;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', null, (el) => {
			el.innerText = 'Successfully published to ';
			el.createEl('a', null, (anchor) => {
				anchor.href = this.link;
				anchor.innerText = this.link;
			});
		});
		if (this.message) {
			contentEl.createEl('p', null, (el) => {
				el.innerText = this.message;
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
