import * as vscode from 'vscode';
import * as cfg from './configuration';
import { Table, RowType, Stringifier } from './ttTable';

export function createTable(rowsCount: number, colsCount: number, editor: vscode.TextEditor,
    configuration: cfg.Configuration, stringifier: Stringifier): Promise<void> {
    const table = new Table();
    for (let i = 0; i < rowsCount + 1; i++) {
        table.addRow(RowType.Data, new Array(colsCount).fill(''));
    }
    table.rows[1].type = RowType.Separator;

    // TODO: Refactor this!
    if (configuration.mode === cfg.Mode.Markdown) {
        table.cols.forEach(c => c.width = 3);
    }

    return new Promise<void>(resolve => {
        const currentPosition = editor.selection.start;
        editor
            .edit(b => b.insert(currentPosition, stringifier.stringify(table)))
            .then(() => {
                editor.selection = new vscode.Selection(currentPosition, currentPosition);
                resolve();
            });
    });
}
