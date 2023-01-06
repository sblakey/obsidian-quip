import {requestUrl, RequestUrlParam, sanitizeHTMLToDom} from 'obsidian';

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

export interface QuipThreadResponse {
	thread: QuipThreadInfo;
}

export interface QuipThreadHTMLResponse {
    html: string;
    response_metadata: Record<string, string>;
}

export class QuipAPIClient {
    accessToken: string;
    hostname: string;

    constructor(hostname: string, token: string) {
        this.accessToken = token;
        this.hostname = hostname;
    }

    async newHTMLDocument(html: string): Promise<QuipThreadResponse> {
        const options: NewDocumentArguments = {
            content: html,
            format: DocumentFormat.HTML,
        };
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

    async updateHTMLDocument(link: string, html: string): Promise<QuipThreadResponse> {
        const secret_path = link.split('.com/', 2).at(1).split('/').at(0);
        console.log("Secret path", secret_path);
        const current_html = await this.getDocumentHTML(secret_path);
        const dom = sanitizeHTMLToDom(current_html);
        console.log("Fragment from Quip", dom);
        for (let level = 1; level <= 6; level++ ) {
            const section_headers = dom.querySelectorAll(`h${level}`);
            if (section_headers.length > 0) {
                const promises = Array.from(section_headers).map( (section_header) => {
                    const options: EditDocumentArguments = {
                        thread_id: secret_path,
                        location: Location.DELETE_DOCUMENT_RANGE,
                        document_range: section_header.getText()
                    };
                    console.log("Deleting section", section_header);
                    return this.editDocument(options);
                });
                await Promise.all(promises);
                break;
            }
        }
        const options: EditDocumentArguments = {
            thread_id: secret_path,
            location: Location.APPEND,
            content: html
        };
        return this.editDocument(options);
    }

    async getThreadHTML(options: GetThreadHTMLArguments): Promise<QuipThreadHTMLResponse> {

        let url = `/2/threads/${options.threadIdOrSecretPath}/html`
        if (options.cursor) {
            url += `?cursor=${options.cursor}`;
        }
        return this.api<Record<string, string>, QuipThreadHTMLResponse>(url, null);
    }

    async editDocument(options: EditDocumentArguments): Promise<QuipThreadResponse> {
        return this.api<EditDocumentArguments, QuipThreadResponse>('/1/threads/edit-document', options);
    }

    async newDocument(options: NewDocumentArguments): Promise<QuipThreadResponse> {
        return this.api<NewDocumentArguments, QuipThreadResponse>('/1/threads/new-document', options);
    }

    buildRequest<ArgType extends Record<string, string>>(path: string, postArguments: ArgType): RequestUrlParam {
        const options: RequestUrlParam = {
            url: `https://${this.hostname}${path}`,
            headers: {}
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
        return response.json;
    }
}