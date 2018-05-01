import * as vscode from 'vscode';
import * as cfg from './configuration';
import { Table, RowType, Stringifier, TableNavigator, Parser } from './ttTable';

/**
 * Create new table with specified rows and columns count in position of cursor
 */
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

/**
 * Swap row under cursor with row below
 */
export function moveRowDown(editor: vscode.TextEditor, _e: vscode.TextEditorEdit, _range: vscode.Range, table: Table) {
    const rowNum = editor.selection.end.line - table.startLine;
    if (rowNum >= table.rows.length - 1) {
        vscode.window.showWarningMessage('Cannot move row further');
        return;
    }
    vscode.commands.executeCommand('editor.action.moveLinesDownAction');
}

/**
 * Swap row under cursor with row above
 */
export function moveRowUp(editor: vscode.TextEditor, _e: vscode.TextEditorEdit, _range: vscode.Range, table: Table) {
    const rowNum = editor.selection.start.line - table.startLine;
    if (rowNum <= 0) {
        vscode.window.showWarningMessage('Cannot move row further');
        return;
    }
    vscode.commands.executeCommand('editor.action.moveLinesUpAction');
}

/**
 * Move cursor to the next cell of table
 */
export async function gotoNextCell(editor: vscode.TextEditor, _range: vscode.Range, table: Table,
    stringifier: Stringifier) {

    await editor.edit(e => formatUnderCursor(editor, e, _range, table, stringifier));

    const nav = new TableNavigator(table);
    const newPos = nav.nextCell(editor.selection.start);
    if (newPos) {
        editor.selection = new vscode.Selection(newPos, newPos);
    } else {
        table.addRow(RowType.Data, new Array(table.cols.length).fill(''));
        await gotoNextCell(editor, _range, table, stringifier);
    }
}

/**
 * Move cursor to the previous cell of table
 */
export function gotoPreviousCell(editor: vscode.TextEditor, _e: vscode.TextEditorEdit, _range: vscode.Range, table: Table) {
    const nav = new TableNavigator(table);
    const newPos = nav.previousCell(editor.selection.start);
    if (newPos) {
        editor.selection = new vscode.Selection(newPos, newPos);
    }
}

/**
 * Format table under cursor
 */
export async function formatUnderCursor(editor: vscode.TextEditor, e: vscode.TextEditorEdit,
    range: vscode.Range, table: Table, stringifier: Stringifier) {
    const newText = stringifier.stringify(table);
    const prevSel = editor.selection.start;

    e.replace(range, newText);
    editor.selection = new vscode.Selection(prevSel, prevSel);
}

/**
 * Swap column under cursor with column on the right
 */
export async function moveColRight(editor: vscode.TextEditor, e: vscode.TextEditorEdit,
    range: vscode.Range, table: Table, stringifier: Stringifier) {
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
    e.replace(range, newText);
    await gotoNextCell(editor, range, table, stringifier);
}

/**
 * Swap column under cursor with column on the left
 */
export async function moveColLeft(editor: vscode.TextEditor, e: vscode.TextEditorEdit,
    range: vscode.Range, table: Table, stringifier: Stringifier) {
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
    e.replace(range, newText);
    await gotoPreviousCell(editor, e, range, table);
}

/**
 * Clear cell under cursor
 */
export function clearCell(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, parser: Parser) {
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

    const r = new vscode.Range(currentLineNumber, leftSepPosition + 1, currentLineNumber, rightSepPosition);
    edit.replace(r, ' '.repeat(rightSepPosition - leftSepPosition - 1));
    const newPos = new vscode.Position(currentLineNumber, leftSepPosition + 2);
    editor.selection = new vscode.Selection(newPos, newPos);
}

/**
 * Moves cursor to the next row. If cursor is in the last row of table, create new row
 */
export function nextRow(editor: vscode.TextEditor, _e: vscode.TextEditorEdit, range: vscode.Range, table: Table,
    stringifier: Stringifier) {
    const inLastRow = range.end.line === editor.selection.start.line;

    if (inLastRow) {
        table.addRow(RowType.Data, new Array(table.cols.length).fill(''));
    }

    // Editing by "_e" messes cursor position. Looks like edits are applied once the command is finished,
    // but it's too late
    editor.edit(b => b.replace(range, stringifier.stringify(table)))
        .then(() => {
            const nav = new TableNavigator(table);
            const nextRowPos = nav.nextRow(editor.selection.start);
            if (nextRowPos) {
                editor.selection = new vscode.Selection(nextRowPos, nextRowPos);
            }
        });
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
