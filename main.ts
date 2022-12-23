import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import QuipAPIClient from './quipapi';

// Remember to rename these classes and interfaces!

interface QuipPluginSettings {
	hostname: string;
	token: string;
}

const DEFAULT_SETTINGS: QuipPluginSettings = {
	hostname: 'platform.quip.com',
	token: ''
}

export default class QuipPlugin extends Plugin {
	settings: QuipPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						let client = new QuipAPIClient(this.settings.hostname, this.settings.token);
						console.log("Created Quip API client!")
						let content = markdownView.getViewData()
						console.log(content);
						new QuipModal(this.app, content).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new QuipSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

class QuipModal extends Modal {
	content: string;

	constructor(app: App, content: string) {
		super(app);
		this.content = content;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText(this.content);
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class QuipSettingTab extends PluginSettingTab {
	plugin: QuipPlugin;

	constructor(app: App, plugin: QuipPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for publishing to Quip.'});

		new Setting(containerEl)
			.setName('Personal API Token')
			.setDesc('Obtained from /dev/token on your Quip website')
			.addText(text => text
				.setValue(this.plugin.settings.token)
				.onChange(async (value) => {
					console.log(`Token: ${value}`);
					this.plugin.settings.token = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('API hostname')
			.setDesc('Endpoint for calls to the Quip automation API')
			.addText(text => text
				.setPlaceholder('platform.quip.com')
				.setValue(this.plugin.settings.hostname)
				.onChange(async (value) => {
					console.log(`Hostname: ${value}`);
					this.plugin.settings.hostname = value;
					await this.plugin.saveSettings();
				}));
	}
}
