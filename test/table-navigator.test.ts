import * as assert from 'assert';
import * as vscode from 'vscode';
import { Table, TableNavigator, RowType } from '../src/ttTable';

suite('TableNavigator', () => {
    let table: Table;
    let navigator: TableNavigator;

    setup(() => {
        table = new Table();
        table.addRow(RowType.Data, ['Value1', 'Value2']);
        table.addRow(RowType.Data, ['Value3', 'Value4']);

        navigator = new TableNavigator(table);
    });

    test('constructor should initialize table property', () => {
        assert.equal(navigator.table, table);
    });

    suite('nextCell', () => {
        test('should select first column when cursor in the beginning of line', () => {
            const pos = new vscode.Position(0, 0);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos.line, 0);
            assert.equal(newPos.character, 2);
        });

        test('should navigate next cell', () => {
            const pos = new vscode.Position(0, 2);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos.line, 0);
            assert.equal(newPos.character, 11);
        });

        test('should jump to next row', () => {
            const pos = new vscode.Position(0, 11);
            const newPos = navigator.nextCell(pos);
            assert.equal(newPos.line, 1);
            assert.equal(newPos.character, 2);
        });
    });

    suite('previousCell', () => {
        test('should navigate previous cell', () => {
            const pos = new vscode.Position(0, 11);
            const newPos = navigator.previousCell(pos);
            assert.equal(newPos.line, 0);
            assert.equal(newPos.character, 2);
        });

        test('should jump to prev row', () => {
            const pos = new vscode.Position(1, 2);
            const newPos = navigator.previousCell(pos);
            assert.equal(newPos.line, 0);
            assert.equal(newPos.character, 11);
        });
    });
});
