import * as assert from 'assert';
import { Table, RowType } from '../src/ttTable';

suite('Text tables. Table', () => {
    let table: Table;

    setup(() => {
        table = new Table();
    });

    test('It creates', () => {
        assert.notEqual(table, undefined);
    });

    test('It should add rows', () => {
        table.addRow(RowType.Data, []);
        assert.equal(table.rows.length, 1);
    });

    test('It should update cols when row values provided', () => {
        table.addRow(RowType.Data, ['Value1', 'Value2']);
        assert.equal(table.cols.length, 2);

        table.addRow(RowType.Data, ['NewValue1', 'NewValue2', 'NewValue3']);
        assert.equal(table.cols.length, 3);
    });

    test('It should recalculate columns widths when adding values', () => {
        table.addRow(RowType.Data, ['C']);
        assert.equal(table.cols[0].width, 1);

        table.addRow(RowType.Data, ['Column']);
        assert.equal(table.cols[0].width, 6);
    });

    test('getAt returns value of cell', () => {
        table.addRow(RowType.Data, ['1.1', '1.2']);
        table.addRow(RowType.Data, ['2.1', '2.2']);

        assert.equal(table.getAt(0, 0), '1.1');
        assert.equal(table.getAt(0, 1), '1.2');
        assert.equal(table.getAt(1, 0), '2.1');
        assert.equal(table.getAt(1, 1), '2.2');
    });

    test('getRow returns array of data in row', () => {
        table.addRow(RowType.Data, ['1', '2']);

        assert.deepEqual(table.getRow(0), ['1', '2']);
    });

    test('setAt should set new value for cell', () => {
        table.addRow(RowType.Data, ['1', '2']);
        table.setAt(0, 0, 'NewValue');
        assert.equal(table.getAt(0, 0), 'NewValue');
        assert.deepEqual(table.getRow(0), ['NewValue', '2']);
    });

    test('setAt should update column width', () => {
        table.addRow(RowType.Data, ['1']);
        table.setAt(0, 0, 'Long');
        assert.equal(table.cols[0].width, 4);
    });
});
