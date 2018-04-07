import * as assert from 'assert';
import * as vscode from 'vscode';
import { Table, TableNavigator, RowType } from '../src/ttTable';

suite('TableNavigator', () => {
    let table: Table;
    let navigator: TableNavigator;

    setup(() => {
        table = new Table();
        table.addRow(RowType.Data, ['Column 1', 'Column 2']);
        table.addRow(RowType.Separator, ['', '']);
        table.addRow(RowType.Data, ['1', '2']);
        table.addRow(RowType.Data, ['3', '4']);
        table.addRow(RowType.Separator, ['', '']);

        navigator = new TableNavigator(table);
    });

    test('constructor should initialize table property', () => {
        assert.equal(navigator.table, table);
    });

    suite('nextCell', () => {
        test('should select first column when cursor in the beginning of line', () => {
            const pos = new vscode.Position(0, 0);
            const newPos = navigator.nextCell(pos);

            assert.equal(newPos!.line, 0);
            assert.equal(newPos!.character, 2);
        });

        test('should navigate next cell', () => {
            const pos = new vscode.Position(0, 2);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos!.line, 0);
            assert.equal(newPos!.character, 13);
        });

        test('should jump to next row', () => {
            const pos = new vscode.Position(2, 13);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos!.line, 3);
            assert.equal(newPos!.character, 2);
        });

        test('should skip separator row', () => {
            const pos = new vscode.Position(0, 13);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos!.line, 2);
            assert.equal(newPos!.character, 2);
        });

        test('should not move if cursor is on separator and it\'s the last line', () => {
            const pos = new vscode.Position(4, 13);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos, undefined);
        });

        test('should not move if cursor in last cell and there is separator line below', () => {
            const pos = new vscode.Position(3, 13);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos, undefined);
        });
    });

    suite('previousCell', () => {
        test('should navigate previous cell', () => {
            const pos = new vscode.Position(0, 13);
            const newPos = navigator.previousCell(pos);
            assert.equal(newPos!.line, 0);
            assert.equal(newPos!.character, 2);
        });

        test('should jump to prev row', () => {
            const pos = new vscode.Position(1, 2);
            const newPos = navigator.previousCell(pos);
            assert.equal(newPos!.line, 0);
            assert.equal(newPos!.character, 13);
        });
    });
});
