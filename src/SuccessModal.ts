import { App, Modal } from 'obsidian';



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
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
