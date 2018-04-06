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
    /**
     * Line where the table starts
     */
    startLine = 0;

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
        if (this.cols[col].width < value.length) {
            this.cols[col].width = value.length;
        }

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

interface Pos {
    start: number;
    end: number;
}

export class TableNavigator {
    private cellRanges: vscode.Range[] = [];

    constructor(public table: Table) {
        this.buildCellRanges();
    }

    nextCell(cursorPosition: vscode.Position): vscode.Position {

        for (let i = 0; i < this.cellRanges.length - 1; ++i) {
            if (this.cellRanges[i].contains(cursorPosition)) {
                return this.cellRanges[i + 1].start.translate(0, 2);
            }
        }

        return new vscode.Position(this.table.startLine, 2);
    }

    previousCell(cursorPosition: vscode.Position): vscode.Position {
        for (let i = 0; i < this.cellRanges.length - 1; ++i) {
            if (this.cellRanges[i].contains(cursorPosition)) {
                return this.cellRanges[i - 1].start.translate(0, 2);
            }
        }

        return new vscode.Position(this.table.startLine, 2);
    }

    private buildCellRanges() {
        this.cellRanges = [];

        const cellPadding = 2;
        const colBoundaries: number[] = [0];

        for (let i = 0; i < this.table.cols.length; ++i) {
            const col = this.table.cols[i];
            colBoundaries.push((col.width + cellPadding + 1) + colBoundaries[colBoundaries.length - 1]);
        }

        // console.log(colBoundaries);

        for (let i = 0; i < this.table.rows.length; ++i) {
            const row = this.table.rows[i];
            const rowLine = this.table.startLine + i;

            if (row.type === RowType.Separator) {
                // Extend last range on whole separator line
                const lastRange = this.cellRanges.pop();
                if (lastRange) {
                    this.cellRanges.push(new vscode.Range(lastRange.start, lastRange.end.translate(1)));

                }
            } else {
                for (let j = 0; j < colBoundaries.length - 1; ++j) {
                    const start = new vscode.Position(rowLine, colBoundaries[j]);
                    const end = new vscode.Position(rowLine, colBoundaries[j + 1] - 1);
                    this.cellRanges.push(new vscode.Range(start, end));
                }
            }
        }
        // console.log(this.cellRanges);
    }
}
