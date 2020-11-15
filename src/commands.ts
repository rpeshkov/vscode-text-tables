import * as vscode from 'vscode';
import { Table, RowType, Stringifier, TableNavigator, Parser } from './ttTable';

/**
 * Create new table with specified rows and columns count in position of cursor
 */
export async function createTable(rowsCount: number, colsCount: number, editor: vscode.TextEditor, stringifier: Stringifier) {
    const table = new Table();
    for (let i = 0; i < rowsCount + 1; i++) {
        table.addRow(RowType.Data, new Array(colsCount).fill(''));
    }
    table.rows[1].type = RowType.Separator;

    const currentPosition = editor.selection.start;
    await editor.edit(b => b.insert(currentPosition, stringifier.stringify(table, editor.document.eol)));
    editor.selection = new vscode.Selection(currentPosition, currentPosition);
}

/**
 * Swap row under cursor with row below
 */
export async function moveRowDown(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const rowNum = editor.selection.end.line - table.startLine;
    if (rowNum >= table.rows.length - 1) {
        return;
    }
    await vscode.commands.executeCommand('editor.action.moveLinesDownAction');
}

/**
 * Swap row under cursor with row above
 */
export async function moveRowUp(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const rowNum = editor.selection.start.line - table.startLine;
    if (rowNum <= 0) {
        return;
    }
    await vscode.commands.executeCommand('editor.action.moveLinesUpAction');
}

/**
 * Move cursor to the next cell of table
 */
export async function gotoNextCell(editor: vscode.TextEditor, range: vscode.Range, table: Table,
    stringifier: Stringifier) {

    const nav = new TableNavigator(table);
    const newPos = nav.nextCell(editor.selection.start);
    if (newPos) {
        await formatUnderCursor(editor, range, table, stringifier);
        editor.selection = new vscode.Selection(newPos, newPos);
    } else {
        table.addRow(RowType.Data, new Array(table.cols.length).fill(''));
        await gotoNextCell(editor, range, table, stringifier);
    }
}

/**
 * Move cursor to the previous cell of table
 */
export async function gotoPreviousCell(editor: vscode.TextEditor, _range: vscode.Range, table: Table) {
    const nav = new TableNavigator(table);
    const newPos = nav.previousCell(editor.selection.start);
    if (newPos) {
        editor.selection = new vscode.Selection(newPos, newPos);
    }
}


export async function setCursor(editor: vscode.TextEditor, table: Table, position: { row: number, col: number }) {
    const nav = new TableNavigator(table);
    const newPos = nav.position(position.row, position.col)

    if (newPos) {
        editor.selection = new vscode.Selection(newPos, newPos);
    }
}

/**
 * Format table under cursor
 */
export async function formatUnderCursor(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const newText = stringifier.stringify(table, editor.document.eol);
    const prevSel = editor.selection.start;
    const original = editor.document.getText(range);
    if (newText !== original) {
        await editor.edit(e => e.replace(range, newText));
    }
    editor.selection = new vscode.Selection(prevSel, prevSel);
}

/**
 * Swap column under cursor with column on the right
 */
export async function moveColRight(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const start = editor.selection.start
    const rowCol = rowColFromPosition(table, start);
    if (rowCol.col < 0) {
        vscode.window.showWarningMessage('Not in table data field');
        return;
    }

    if (rowCol.col >= table.cols.length - 1 ) {
        return;
    }

    [table.cols[rowCol.col], table.cols[rowCol.col + 1]] = [table.cols[rowCol.col + 1], table.cols[rowCol.col]];

    table.rows.forEach((_, i) => {
        const v1 = table.getAt(i, rowCol.col);
        const v2 = table.getAt(i, rowCol.col + 1);
        table.setAt(i, rowCol.col + 1, v1);
        table.setAt(i, rowCol.col, v2);
    });

    const newText = stringifier.stringify(table, editor.document.eol);
    await editor.edit(e => e.replace(range, newText));
    await setCursor(editor, table, {
        row: rowCol.row,
        col: rowCol.col + 1
    })
}

/**
 * Swap column under cursor with column on the left
 */
export async function moveColLeft(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const start = editor.selection.start
    const rowCol = rowColFromPosition(table, start);
    if (rowCol.col < 0) {
        vscode.window.showWarningMessage('Not in table data field');
        return;
    }

    if (rowCol.col === 0) {
        return;
    }

    [table.cols[rowCol.col], table.cols[rowCol.col - 1]] = [table.cols[rowCol.col - 1], table.cols[rowCol.col]];

    table.rows.forEach((_, i) => {
        const v1 = table.getAt(i, rowCol.col);
        const v2 = table.getAt(i, rowCol.col - 1);
        table.setAt(i, rowCol.col - 1, v1);
        table.setAt(i, rowCol.col, v2);
    });

    const newText = stringifier.stringify(table, editor.document.eol);
    await editor.edit(e => e.replace(range, newText));
    await setCursor(editor, table, {
        row: rowCol.row,
        col: rowCol.col - 1
    })
}

export async function createColumnOnLeft(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const rowCol = rowColFromPosition(table, editor.selection.start);
    if (rowCol.col < 0) {
        vscode.window.showWarningMessage('Not in table data field');
        return;
    }

    table.addCol(rowCol.col);

    updateText(editor, range, table, stringifier);
    setCursor(editor, table, rowCol)
}

export async function deleteColumn(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const rowCol = rowColFromPosition(table, editor.selection.start);
    if (rowCol.col < 0) {
        vscode.window.showWarningMessage('Not in table data field');
        return;
    }

    table.deleteCol(rowCol.col);

    updateText(editor, range, table, stringifier);
    setCursor(editor, table, {
        col: rowCol.col >= table.cols.length ? rowCol.col - 1 : rowCol.col,
        row: rowCol.row
    })
}

async function updateText(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const newText = stringifier.stringify(table, editor.document.eol);

    await editor.edit(e => e.replace(range, newText));
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
export async function nextRow(editor: vscode.TextEditor, range: vscode.Range, table: Table, stringifier: Stringifier) {
    const inLastRow = range.end.line === editor.selection.start.line;
    const start = editor.selection.start

    if (inLastRow) {
        table.addRow(RowType.Data, new Array(table.cols.length).fill(''));
    }

    await editor.edit(b => b.replace(range, stringifier.stringify(table, editor.document.eol)));
    
    const nav = new TableNavigator(table);
    const nextRowPos = nav.nextRow(start);
    if (nextRowPos) {
        editor.selection = new vscode.Selection(nextRowPos, nextRowPos);
    }
}

function rowColFromPosition(table: Table, position: vscode.Position): { row: number, col: number } {
    const result = { row: -1, col: -1 };

    result.row = position.line - table.startLine;
    let counter = 1 + table.prefix.length;
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
