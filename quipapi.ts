import {requestUrl, RequestUrlParam} from 'obsidian';

enum RequestMethod {
    GET = "GET",
    POST = "POST"
}

interface FetchRequestOptions {
    headers: Headers;
    body?: URLSearchParams;
    method?: RequestMethod;
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

interface QuipThreadInfo {
    id: string;
    title: string;
	link: string;
    updated_usec: number;
}

export interface QuipThreadResponse {
	thread: QuipThreadInfo;
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
            title: undefined,
            format: DocumentFormat.HTML,
            memberIds: undefined
        };
        return this.newDocument(options);
    }

    async newDocument(options: NewDocumentArguments): Promise<QuipThreadResponse> {
        const args: NewDocumentArguments = {
            'content': options.content,
            'title': options.title,
            'format': options.format
        };
        return this.api<NewDocumentArguments, QuipThreadResponse>('/1/threads/new-document', args);
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