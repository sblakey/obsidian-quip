import { Client, ClientError } from 'quip';

var https = require('https');
var querystring = require('querystring');

interface ClientOptions {
    accessToken: string;
    clientId: string | undefined;
    clientSecret: string | undefined;
}

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
}

export class QuipAPIClientError extends ClientError {
    name: string;
    message: string;

    constructor(httpResponse: any, info: Object) {
        super(httpResponse, info);
        this.name = "QuipAPIClientError";
        this.message = JSON.stringify(info);
    }

}

export class QuipAPIClient extends Client {
    hostname: string;

    constructor(hostname: string, token: string) {
        let client_options: ClientOptions = {
            accessToken: token,
            clientId: undefined,
            clientSecret: undefined
        }
        super(client_options);
        this.hostname = hostname;
    }

    call_(path: string,
        callback: (error: Error, response: object) => void,
        postArguments: any): void {
        var requestOptions: RequestOptions = {
            hostname: this.hostname, // one line justifies overriding this damn method
            port: 443,
            path: '/1/' + path,
            headers: {},
            method: RequestMethod.GET
        };
        if (this.accessToken) {
            requestOptions.headers['Authorization'] = 'Bearer ' + this.accessToken;
        }
        var requestBody = null;
        if (postArguments) {
            for (var name in postArguments) {
                if (!postArguments[name]) {
                    delete postArguments[name];
                }
            }
            requestOptions.method = RequestMethod.POST;
            requestBody = querystring.stringify(postArguments);
            requestOptions.headers['Content-Type'] =
                'application/x-www-form-urlencoded';
            requestOptions.headers['Content-Length'] =
                Buffer.byteLength(requestBody);
        }
        var request = https.request(requestOptions, function (response: any) {
            var data: string[] = [];
            response.on('data', function (chunk: string) {
                data.push(chunk);
            });
            response.on('end', function () {
                var responseObject = null;
                try {
                    responseObject = /** @type {Object} */(
                        JSON.parse(data.join('')));
                } catch (err) {
                    callback(err, null);
                    return;
                }
                if (response.statusCode != 200) {
                    callback(new QuipAPIClientError(response, responseObject), null);
                } else {
                    callback(null, responseObject);
                }
            });
        });
        request.on('error', function (error: Error) {
            callback(error, null);
        });
        if (requestBody) {
            request.write(requestBody);
        }
        request.end();

    }
    
}