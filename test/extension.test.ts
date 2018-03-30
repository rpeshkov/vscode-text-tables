import { OrgParser } from '../src/ttOrg';

suite('Some', () => {
    test('Test1', () => {
        const parser = new OrgParser();
        parser.parse('|');
    });
});
