import {requestUrl, RequestUrlParam} from 'obsidian';

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

interface NewDocumentArguments extends Record<string, string> {
	content: string;
	title?: string;
	format: DocumentFormat;
}

interface GetThreadHTMLOptions extends Record<string, string> {
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
        const options: GetThreadHTMLOptions = {
            threadIdOrSecretPath: threadIdOrSecretPath
        };
        do {
            const response = await this.getThreadHTML(options);
            result += response.html;
            options.cursor = response.response_metadata?.next_cursor;
        } while (options.cursor);
        return result;
    }

    async getThreadHTML(options: GetThreadHTMLOptions): Promise<QuipThreadHTMLResponse> {

        let url = `/2/threads/${options.threadIdOrSecretPath}/html`
        if (options.cursor) {
            url += `?cursor=${options.cursor}`;
        }
        return this.api<Record<string, string>, QuipThreadHTMLResponse>(url, null);
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