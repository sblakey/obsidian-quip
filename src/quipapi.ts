import {requestUrl, RequestUrlParam, sanitizeHTMLToDom} from 'obsidian';
import { DEFAULT_SETTINGS } from './settings';

enum RequestMethod {
    GET = "GET",
    POST = "POST"
}

export class QuipAPIClientError<Type> extends Error {
    name: string;
    response: Response;
    info: Type;

    constructor(response: Response, info: Type) {
        super("Error invoking Quip API");
        this.name = "QuipAPIClientError";
        this.response = response;
        this.info = info;
    }

}

enum DocumentFormat {
	HTML = "html",
	MARKDOWN = "markdown"
}

enum Location {
    APPEND = "0",
    PREPEND = "1",
    AFTER_SECTION = "2",
    BEFORE_SECTION = "3",
    REPLACE_SECTION = "4",
    DELETE_SECTION = "5",
    AFTER_DOCUMENT_RANGE = "6",
    BEFORE_DOCUMENT_RANGE = "7",
    REPLACE_DOCUMENT_RANGE = "8",
    DELETE_DOCUMENT_RANGE = "9"
}

interface EditDocumentArguments extends Record<string, string> {
    thread_id: string;
    content?: string;
    section_id?: string;
    document_range?: string;
    location?: Location;
}

interface NewDocumentArguments extends Record<string, string> {
	content: string;
	title?: string;
	format: DocumentFormat;
}

interface GetThreadHTMLArguments extends Record<string, string> {
    threadIdOrSecretPath: string;
    cursor?: string
}

interface QuipThreadInfo {
    id: string;
    title: string;
	link: string;
    updated_usec: number;
}

interface QuipRecentThreads {
    [key:string]: QuipThreadResponse
}

export interface QuipThreadResponse {
	thread: QuipThreadInfo;
}

export interface QuipThreadEditResponse extends QuipThreadResponse {
    html: string;
}

export interface QuipThreadHTMLResponse {
    html: string;
    response_metadata: Record<string, string>;
}

export class QuipAPIClient {
    accessToken: string;
    hostname: string;

    // throws an Error if we don't have viable settings
    constructor(hostname: string, token: string) {
        this.accessToken = token;
        this.hostname = hostname;
        if (token === DEFAULT_SETTINGS.token) {
            throw new Error("Quip API token has not been set");
        } else if (hostname == DEFAULT_SETTINGS.hostname) {
            throw new Error("Quip API hostname has not been set");
        }
    }

    async newHTMLDocument(html: string, title: string): Promise<QuipThreadResponse> {
        const options: NewDocumentArguments = {
            content: html,
            format: DocumentFormat.HTML,
        };
        if (title) {
            options.title = title;
        }
        return this.newDocument(options);
    }

    async getDocumentHTML(threadIdOrSecretPath: string): Promise<string> {
        let result = "";
        const options: GetThreadHTMLArguments = {
            threadIdOrSecretPath: threadIdOrSecretPath
        };
        do {
            const response = await this.getThreadHTML(options);
            result += response.html;
            options.cursor = response.response_metadata?.next_cursor;
        } while (options.cursor);
        return result;
    }

    async updateHTMLDocument(link: string, html: string): Promise<QuipThreadResponse[]> {
        const secret_path = link.split('.com/', 2).at(1).split('/').at(0);
        const marker = "QUIP-OBSIDIAN-DELETE-MARKER-" + Date.now();
        const prepend_html = `${html}
        <h1>${marker}</h1>
        <p><em>Everything after the <strong>${marker}</strong> h1 should be deleted shortly. Due to Quip limitations, we need to delete each h1 header separately.</em></p>`;
        const current_html = (await this.prependHTML(secret_path, prepend_html)).html;

        const dom = sanitizeHTMLToDom(current_html);
        const promises: Promise<QuipThreadResponse>[] = [];

        // Find and remove all h1 headers after the marker, letting us remove
		// all previous content with #(h1 headers) + 1 API calls
        let marker_found = false;
        const section_headers = dom.querySelectorAll('h1');
        for (const section_header of Array.from(section_headers)) {
            if (section_header.getText() == marker) {
                marker_found = true;
                console.debug(`Found deletion marker: ${section_header.getText()}`)
            } else if (marker_found) {
                console.debug(`Deleting h1 header: ${section_header.getText()}`)
                promises.push(this.deleteSection(secret_path, section_header.getAttr('id')))
            }
        }

        const responses = await Promise.all(promises)
        responses.push(await this.deleteDocumentRange(secret_path, marker))
        return Promise.resolve(responses);
    }

    async getThreadHTML(options: GetThreadHTMLArguments): Promise<QuipThreadHTMLResponse> {

        let url = `/2/threads/${options.threadIdOrSecretPath}/html`
        if (options.cursor) {
            url += `?cursor=${options.cursor}`;
        }
        return this.api<Record<string, string>, QuipThreadHTMLResponse>(url, null);
    }

    async appendHTML(secret_path: string, html: string) : Promise<QuipThreadEditResponse> {
        const options: EditDocumentArguments = {
            thread_id: secret_path,
            location: Location.APPEND,
            content: html
        };
        return this.editDocument(options);
    }

    async prependHTML(secret_path: string, html: string) : Promise<QuipThreadEditResponse> {
        const options: EditDocumentArguments = {
            thread_id: secret_path,
            location: Location.PREPEND,
            content: html
        };
        return this.editDocument(options);
    }

    async deleteDocumentRange(secret_path: string, document_range: string): Promise<QuipThreadEditResponse> {
        const options: EditDocumentArguments = {
            thread_id: secret_path,
            location: Location.DELETE_DOCUMENT_RANGE,
            document_range: document_range
        };
        return this.editDocument(options);
    }

    async deleteSection(secret_path: string, section_id: string): Promise<QuipThreadEditResponse> {
        const options: EditDocumentArguments = {
            thread_id: secret_path,
            location: Location.DELETE_SECTION,
            section_id: section_id
        };
        return this.editDocument(options);
    }

    async editDocument(options: EditDocumentArguments): Promise<QuipThreadEditResponse> {
        return this.api<EditDocumentArguments, QuipThreadEditResponse>('/1/threads/edit-document', options);
    }

    async getBlob(path: string): Promise<Blob> {
        const url = `/1${path}`;
        const resource = this.buildRequest(url, null);
        const response = await requestUrl(resource);
        const status = response.status;
        if (status >= 400) {
            switch (status) {
                case 401:
                    throw new Error('Quip authorization failed')
                case 404:
                    throw new Error(`Document not found in Quip: ${url}`);
                default:
                    throw new Error(`Quip server error: ${status}: ${response.text}`)
            }
        }
        return new Blob([response.arrayBuffer], {
            type: response.headers['Content-Type'] || 'image/png'
        });
        
    }

    async getRecentThreads(): Promise<QuipRecentThreads> {
        const url = '/1/threads/recent?count=50';
        return this.api<Record<string, string>, QuipRecentThreads>(url, null);
    }

    async getThread(thread_id_or_secret_path: string): Promise<QuipThreadResponse> {
        const url = `/2/threads/${thread_id_or_secret_path}`;
        return this.api<Record<string, string>, QuipThreadResponse>(url, null);
    }

    async newDocument(options: NewDocumentArguments): Promise<QuipThreadResponse> {
        return this.api<NewDocumentArguments, QuipThreadResponse>('/1/threads/new-document', options);
    }

    async searchTitles(query: string): Promise<QuipThreadResponse[]> {
        const url = `/1/threads/search?only_match_titles=true&query=${encodeURIComponent(query)}`;
        return this.api<Record<string, string>, QuipThreadResponse[]>(url, null);
    }

    buildRequest<ArgType extends Record<string, string>>(path: string, postArguments: ArgType): RequestUrlParam {
        const options: RequestUrlParam = {
            url: `https://${this.hostname}${path}`,
            headers: {},
            throw: false
        };
        if (this.accessToken) {
            options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        if (postArguments) {
            options.method = RequestMethod.POST;
            options.body = new URLSearchParams(postArguments).toString();
            options.contentType = 'application/x-www-form-urlencoded';
        }
        return options;
    }

    async api<ArgType extends Record<string, string>, ResponseType>(path: string,
            postArguments: ArgType): Promise<ResponseType>{
        const resource = this.buildRequest(path, postArguments);
        const response = requestUrl(resource);
        const status = (await response).status;
        if (status >= 400) {
            switch (status) {
                case 401:
                    throw new Error('Quip authorization failed')
                case 404:
                    throw new Error(`Document not found in Quip: ${path}`);
                default:
                    throw new Error(`Quip server error: ${status}: ${await response.text}`)
            }
        }
        return response.json;
    }
}
