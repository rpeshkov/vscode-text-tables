import * as assert from 'assert';
import { OrgParser } from '../src/ttOrg';
import { RowType } from '../src/ttTable';

suite('Text tables. Org', () => {
    suite('Parser', () => {
        let parser: OrgParser;
        setup(() => {
            parser = new OrgParser();
        });

        test('should return undefined when incorrect text provided', () => {
            const table = parser.parse('');
            assert.equal(table, undefined);
        });

        test('should return table when correct text provided', () => {
            const table = parser.parse('a');
            assert.notEqual(table, undefined);
        });

        test('should add row when string starts with |', () => {
            const table = parser.parse('|');
            if (table !== undefined) {
                assert.equal(table.rows.length, 1);
                assert.equal(table.rows[0].type, RowType.Data);
                assert.equal(table.cols.length, 1);
            }
        });

        test('should parse |- as separator row', () => {
            const table = parser.parse('|-');
            assert.notEqual(table, undefined);
            if (table !== undefined) {
                assert.equal(table.rows.length, 1);
                assert.equal(table.rows[0].type, RowType.Separator);
            }
        });

        test('should split columns by |', () => {
            const table = parser.parse('||||');
            if (table !== undefined) {
                assert.equal(table.rows.length, 1);
                assert.equal(table.cols.length, 3);
            }
        });

        test('should handle last characters as column', () => {
            const table = parser.parse('||Last col');
            if (table !== undefined) {
                assert.equal(table.cols.length, 2);
            }
        });
    });
});
