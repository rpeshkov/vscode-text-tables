import * as vscode from 'vscode';
import * as cfg from './configuration';
import { Table, RowType, Stringifier, TableNavigator, Parser } from './ttTable';

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

export function moveRowDown(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const rowNum = editor.selection.end.line - table.startLine;
    if (rowNum >= table.rows.length - 1) {
        vscode.window.showWarningMessage('Cannot move row further');
        return;
    }
    vscode.commands.executeCommand('editor.action.moveLinesDownAction');
}

export function moveRowUp(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const rowNum = editor.selection.start.line - table.startLine;
    if (rowNum <= 0) {
        vscode.window.showWarningMessage('Cannot move row further');
        return;
    }
    vscode.commands.executeCommand('editor.action.moveLinesUpAction');
}

export function gotoNextCell(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const nav = new TableNavigator(table);
    const newPos = nav.nextCell(editor.selection.start);
    if (newPos) {
        editor.selection = new vscode.Selection(newPos, newPos);
    }
}

export function gotoPreviousCell(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const nav = new TableNavigator(table);
    const newPos = nav.previousCell(editor.selection.start);
    if (newPos) {
        editor.selection = new vscode.Selection(newPos, newPos);
    }
}

export function formatUnderCursor(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier): Promise<void> {
    const newText = stringifier.stringify(table);
    const prevSel = editor.selection.start;
    return new Promise<void>(resolve => {
        editor
        .edit(b => b.replace(range, newText))
        .then(() => {
            editor.selection = new vscode.Selection(prevSel, prevSel);
            resolve();
        });
    });
}

export function moveColRight(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const rowCol = rowColFromPosition(table, editor.selection.start);
    if (rowCol.col < 0) {
        vscode.window.showWarningMessage('Not in table data field');
        return;
    }

    if (rowCol.col >= table.cols.length - 1 ) {
        vscode.window.showWarningMessage('Cannot move column further right');
        return;
    }

    [table.cols[rowCol.col], table.cols[rowCol.col + 1]] = [table.cols[rowCol.col + 1], table.cols[rowCol.col]];

    table.rows.forEach((_, i) => {
        const v1 = table.getAt(i, rowCol.col);
        const v2 = table.getAt(i, rowCol.col + 1);
        table.setAt(i, rowCol.col + 1, v1);
        table.setAt(i, rowCol.col, v2);
    });

    const newText = stringifier.stringify(table);
    editor
        .edit(b => b.replace(range, newText))
        .then(() => vscode.commands.executeCommand('text-tables.gotoNextCell'));
}

export function moveColLeft(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const rowCol = rowColFromPosition(table, editor.selection.start);
    if (rowCol.col < 0) {
        vscode.window.showWarningMessage('Not in table data field');
        return;
    }

    if (rowCol.col === 0) {
        vscode.window.showWarningMessage('Cannot move column further left');
        return;
    }

    [table.cols[rowCol.col], table.cols[rowCol.col - 1]] = [table.cols[rowCol.col - 1], table.cols[rowCol.col]];

    table.rows.forEach((_, i) => {
        const v1 = table.getAt(i, rowCol.col);
        const v2 = table.getAt(i, rowCol.col - 1);
        table.setAt(i, rowCol.col - 1, v1);
        table.setAt(i, rowCol.col, v2);
    });

    const newText = stringifier.stringify(table);
    editor
        .edit(b => b.replace(range, newText))
        .then(() => vscode.commands.executeCommand('text-tables.gotoPreviousCell'));
}

export function clearCell(editor: vscode.TextEditor, parser: Parser) {
    const document = editor.document;
    const currentLineNumber = editor.selection.start.line;
    const currentLine = document.lineAt(currentLineNumber);

    if (parser.isSeparatorRow(currentLine.text)) {
        vscode.window.showInformationMessage('Not in table data field');
        return;
    }

    const leftSepPosition = currentLine.text.lastIndexOf('|', editor.selection.start.character - 1);
    let rightSepPosition = currentLine.text.indexOf('|', editor.selection.start.character);
    if (rightSepPosition < 0) {
        rightSepPosition = currentLine.range.end.character;
    }

    if (leftSepPosition === rightSepPosition) {
        vscode.window.showInformationMessage('Not in table data field');
        return;
    }

    editor.edit(e => {
        const r = new vscode.Range(currentLineNumber, leftSepPosition + 1, currentLineNumber, rightSepPosition);
        e.replace(r, ' '.repeat(rightSepPosition - leftSepPosition - 1));
    });
    const newPos = new vscode.Position(currentLineNumber, leftSepPosition + 2);
    editor.selection = new vscode.Selection(newPos, newPos);
}

function rowColFromPosition(table: Table, position: vscode.Position): { row: number, col: number } {
    const result = { row: -1, col: -1 };

    result.row = position.line - table.startLine;
    let counter = 1;
    for (let i = 0; i < table.cols.length; ++i) {
        const col = table.cols[i];
        if (position.character >= counter && position.character < counter + col.width + 3) {
            result.col = i;
            break;
        }

        counter += col.width + 3;
    }

    return result;
}
