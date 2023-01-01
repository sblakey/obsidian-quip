import { App, PluginSettingTab, Setting } from 'obsidian';
import QuipPlugin from './main';


export interface QuipPluginSettings {
	hostname: string;
	token: string;
	removeYAML: boolean;
	addLink: boolean;
	inlineEmbeds: boolean;
}

export const DEFAULT_SETTINGS: QuipPluginSettings = {
	hostname: 'platform.quip.com',
	token: '',
	removeYAML: true,
	addLink: true,
	inlineEmbeds: true
}


export class QuipSettingTab extends PluginSettingTab {
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
		new Setting(containerEl)
			.setName('Remove YAML front matter')
			.setDesc('Strip leading YAML out of notes before sending to Quip')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeYAML)
				.onChange(async (value) => {
					console.log(`Remove YAML: ${value}`);
					this.plugin.settings.removeYAML = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Add Quip link')
			.setDesc('Insert a link to the published Quip document into YAML front matter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addLink)
				.onChange(async (value) => {
					console.log(`Add Link: ${value}`);
					this.plugin.settings.addLink = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Inline embedded notes')
			.setDesc('Replace embed-links with the content of those notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.inlineEmbeds)
				.onChange(async (value) => {
					console.log(`Add Link: ${value}`);
					this.plugin.settings.inlineEmbeds = value;
					await this.plugin.saveSettings();
				}));
	}
}