import * as vscode from 'vscode';

export enum RowType {
    Unknown,
    Separator,
    Data
}

export enum Alignment {
    Left,
    Center,
    Right
}

export interface RowDef {
    type: RowType;
}

export interface ColDef {
    alignment: Alignment;
    width: number;
}

export class Table {
    rows: RowDef[] = [];
    cols: ColDef[] = [];

    private data: string[][] = [];

    addRow(type: RowType, values: string[]) {
        let adjustCount = values.length - this.cols.length;
        while (adjustCount-- > 0) {
            this.cols.push({ alignment: Alignment.Left, width: 0 });
        }

        for (const row of this.data) {
            const adjustee = row.length < values.length ? row : values;
            adjustCount = Math.abs(row.length - values.length);

            while (adjustCount-- > 0) {
                adjustee.push('');
            }
        }

        this.cols.forEach((col, i) => col.width = Math.max(col.width, values[i].length));

        this.rows.push({ type });
        this.data.push(values);
    }

    getAt(row: number, col: number): string {
        return this.data[row][col];
    }

    getRow(row: number): string[] {
        return this.data[row];
    }

    setAt(row: number, col: number, value: string) {
        this.data[row][col] = value;
    }
}

export interface Parser {
    parse(text: string): Table | undefined;
}

export interface Stringifier {
    stringify(table: Table): string;
}

export interface Locator {
    locate(reader: LineReader, lineNr: number): vscode.Range | undefined;
}

export interface LineReader {
    lineAt(line: number): vscode.TextLine;
    lineCount: number;
}

export class TableNavigator {
    constructor(
        public table: Table) { }

    nextCell(cursorPosition: vscode.Position): vscode.Position {
        if (cursorPosition.character === 0) {
            return cursorPosition.translate(0, 2);
        }
        let counter = 1;
        const charPos = cursorPosition.character;

        for (let i = 0; i < this.table.cols.length; i++) {
            const col = this.table.cols[i];
            const width = col.width + 2;
            if (charPos >= counter && charPos < counter + width) {
                if (i === this.table.cols.length - 1) {
                    break; // Outer return will move to next line
                } else {
                    return new vscode.Position(cursorPosition.line, counter + width + 2);
                }
            }

            counter += col.width + 3;
        }


        return new vscode.Position(cursorPosition.line + 1, 2);
    }
}
