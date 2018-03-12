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
        this.rows.push({type});
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

    normalize() {
        const maxColumns = Math.max(...this.data.map(x => x.length));

        for (const row of this.data) {
            while (row.length < maxColumns) {
                row.push('');
            }
        }
    }

    calculateColDefs() {
        const colCount = this.data[0].length;
        const adjustCount = colCount - this.cols.length;
        for (let i = 0; i < adjustCount; ++i) {
            this.cols.push({ alignment: Alignment.Left, width: 0 });
        }

        for (let row = 0; row < this.data.length; ++row) {
            for (let col = 0; col < this.data[row].length; ++col) {
                if (this.data[row][col].length > this.cols[col].width) {
                    this.cols[col].width = this.data[row][col].length;
                }
            }
        }
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
