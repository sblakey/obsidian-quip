import { App, SuggestModal } from 'obsidian';
import { QuipAPIClient } from './quipapi';
import { QuipThread } from './main';


/* Modal Dialog present to users in the "import document from Quip" command.
   Prompt with a view analagous to the "Recents" page in the quip webapp.
   Asynchronously search for other useful autocompletes.
*/
export class ImportModal extends SuggestModal<QuipThread> {
	url: string;
	onSubmit: (url: string) => void;
	quip: QuipAPIClient;
	recent: QuipThread[];
	searching: boolean;
	searchQuery: string;
	searchResults: QuipThread[];
	isOpen: boolean;
	onInput: (input: string) => void;

	constructor(app: App, quip: QuipAPIClient, cached_recent: Promise<QuipThread[]>, onSubmit: (result: string) => void) {
		super(app);
		this.quip = quip;
		this.onSubmit = onSubmit;
		this.setPlaceholder("Quip title or URL");
		this.recent = [];
		this.loadRecentThreads(cached_recent);
		this.emptyStateText = "Loading recent documents from Quip";
		this.searching = false;
	}

	async loadRecentThreads(cached_recent: Promise<QuipThread[]>) {
		this.recent = await cached_recent;
		this.emptyStateText = "No matching document found";
		if (this.isOpen) {
			this.onInput(this.inputEl.value);
		}
	}

	async loadSearchResults(query: string) {
		this.searching = true;
		this.searchQuery = query;
		this.searchResults = [];
		for (const thread_response of (await this.quip.searchTitles(query))) {
			const thread_info = thread_response.thread;
			this.searchResults.push(thread_info);
		}
		this.searching = false;
		if (this.isOpen) {
			this.onInput(this.inputEl.value);
		}
	}

	// Returns all available suggestions.
	getSuggestions(query: string): QuipThread[] {
		if (query) {
			const lower_query = query.toLowerCase();
			const filter = (thread: QuipThread) => 
					thread.link.toLowerCase().contains(lower_query) || thread?.title.toLowerCase().contains(lower_query);
			// see if we have viable search results
			if (this.searchQuery && lower_query.contains(this.searchQuery.toLowerCase())) {
				const filtered_results = this.searchResults.filter(filter);
				if (filtered_results.length > 0) {
					return filtered_results;
				}
			}
			// maybe we can find a match in the recents list?
			const filtered_recent = (this.recent).filter(filter);
			if (filtered_recent.length > 0) {
				return filtered_recent;
			} else {
				// kick off a query, if it's not redundant, but respect the query lock
				if (query && query != this.searchQuery && !this.searching) {
					this.loadSearchResults(query);
				}
				// this even fi the user pastes or types a URL, that's a valid result.
				return [{ link: query }];
			}
		} else {
			return this.recent;
		}
	}

	// Renders each suggestion item.
	renderSuggestion(thread: QuipThread, el: HTMLElement) {
		el.createEl("div", { text: thread.title });
		el.createEl("small", { text: thread.link });
	}

	onChooseSuggestion(thread: QuipThread, evt: MouseEvent | KeyboardEvent) {
		if (thread.link) {
			this.onSubmit(thread.link);
		}
	}
}
