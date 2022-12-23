import { Client } from 'quip';

export default class QuipAPIClient extends Client {
    hostname: string;

    constructor(hostname: string, token: string) {
        let client_options = {
            accessToken: token,
            clientId: undefined,
            clientSecret: undefined
        }
        super(client_options);
        this.hostname = hostname;
    }
    
}