enum RequestMethod {
    GET = "GET",
    POST = "POST"
}

interface RequestOptions {
    hostname: string;
    port: number;
    path: string;
    headers: {[index: string]:any};
    method: RequestMethod;
    body?: string;
}

interface FetchRequestOptions {
    headers: Headers;
    body?: URLSearchParams;
}

export class QuipAPIClientError extends Error {
    name: string;
    response: any;
    info: any;

    constructor(response: any, info: any) {
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

interface NewDocumentOptions {
	content: string;
	title: string | undefined;
	format: DocumentFormat;
	memberIds: string[] | undefined;
}

interface QuipThreadInfo {
	link: string;
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
        const options: NewDocumentOptions = {
            content: html,
            title: undefined,
            format: DocumentFormat.HTML,
            memberIds: undefined
        };
        return this.newDocument(options);
    }

    async newDocument(options: NewDocumentOptions): Promise<QuipThreadResponse> {
        var args = {
            'content': options.content,
            'title': options.title,
            'format': options.format
        };
        return this.fetchAPI('/1/threads/new-document', args);
    }

    buildRequest(path: string, postArguments: any): Request {
        const url = `https://${this.hostname}${path}`;
        var options: FetchRequestOptions = {
            headers: new Headers()
        };
        if (this.accessToken) {
            options.headers.append('Authorization', `Bearer ${this.accessToken}`);
        }
        if (postArguments) {
            options.body = new URLSearchParams(postArguments);
        }
        return new Request(url, options);
    }

    async fetchAPI(path: string,
        postArguments: any): Promise<any> {
        const resource = this.buildRequest(path, postArguments);
        const response = await fetch(resource);
        if (response.ok) {
            return response.json();
        } else {
            throw new QuipAPIClientError(response, response.json());
        }
    }
}