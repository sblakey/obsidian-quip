enum RequestMethod {
    GET = "GET",
    POST = "POST"
}

interface FetchRequestOptions {
    headers: Headers;
    body?: URLSearchParams;
    method?: RequestMethod;
}

export class QuipAPIClientError extends Error {
    name: string;
    response: Response;
    info: QuipResponse;

    constructor(response: Response, info: QuipResponse) {
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

interface QuipArguments extends Record<string, string> {
}

interface NewDocumentArguments extends QuipArguments {
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

interface QuipResponse {
}

export interface QuipThreadResponse extends QuipResponse {
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
        const args = {
            'content': options.content,
            'title': options.title,
            'format': options.format
        };
        return this.fetchAPI<QuipThreadResponse>('/1/threads/new-document', args);
    }

    buildRequest(path: string, postArguments: QuipArguments): Request {
        const url = `https://${this.hostname}${path}`;
        const options: FetchRequestOptions = {
            headers: new Headers()
        };
        if (this.accessToken) {
            options.headers.append('Authorization', `Bearer ${this.accessToken}`);
        }
        if (postArguments) {
            options.method = RequestMethod.POST;
            options.body = new URLSearchParams(postArguments);
        }
        return new Request(url, options);
    }

    async fetchAPI<T extends QuipResponse>(path: string,
        postArguments: QuipArguments): Promise<T> {
        const resource = this.buildRequest(path, postArguments);
        const response = await fetch(resource);
        if (response.ok) {
            return response.json();
        } else {
            throw new QuipAPIClientError(response, response.json());
        }
    }
}