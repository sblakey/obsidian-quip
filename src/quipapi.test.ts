
import {describe, expect, test} from '@jest/globals';

import { QuipAPIClient } from './quipapi';
import { DEFAULT_SETTINGS } from './settings';

test('Errors when API token is unset', () => {
    expect(() => new QuipAPIClient("", DEFAULT_SETTINGS.token)).toThrow(Error);
});

test('Errors when API endpoint is unset', () => {
    expect(() => new QuipAPIClient(DEFAULT_SETTINGS.hostname, "")).toThrow(Error);
});