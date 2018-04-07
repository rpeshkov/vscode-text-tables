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

interface CellRange {
    isSeparator: boolean;
    range: vscode.Range;
}

export class TableNavigator {
    private cellRanges: CellRange[] = [];

    constructor(public table: Table) {
        this.buildCellRanges();
    }

    nextCell(cursorPosition: vscode.Position): vscode.Position {
        let resultRange = this.cellRanges[this.cellRanges.length - 1];

        for (let i = 0; i < this.cellRanges.length - 1; ++i) {
            const thisRange = this.cellRanges[i];
            if (thisRange.range.contains(cursorPosition)) {
                const offset = this.cellRanges[i + 1].isSeparator ? 2 : 1;
                resultRange = this.cellRanges[i + offset];
            }
        }

        return resultRange.range.start.translate(0, 1);
    }

    previousCell(cursorPosition: vscode.Position): vscode.Position {

        let resultRange = this.cellRanges[0];

        for (let i = this.cellRanges.length - 1; i > 1; --i) {
            const r = this.cellRanges[i];
            if (r.range.contains(cursorPosition)) {
                const offset = this.cellRanges[i - 1].isSeparator ? 2 : 1;
                resultRange = this.cellRanges[i - offset];

            }
        }
        return resultRange.range.start.translate(0, 1);
    }

    private buildCellRanges() {
        this.cellRanges = [];

        const cellPadding = 2;
        let lastAnchor = 0;
        const anchors = this.table.cols.reduce((accum, col) => {
            lastAnchor += col.width + cellPadding + 1;
            accum.push(lastAnchor);
            return accum;
        }, [lastAnchor]);

        for (let i = 0; i < this.table.rows.length; ++i) {
            const row = this.table.rows[i];
            const rowLine = this.table.startLine + i;

            if (row.type === RowType.Separator) {
                // Extend last range to whole separator line
                const lastRange = this.cellRanges[this.cellRanges.length - 1];
                if (lastRange) {
                    this.cellRanges.push({
                        isSeparator: true,
                        range: new vscode.Range(lastRange.range.end, lastRange.range.end.translate(1))
                    });
                }
            } else {
                for (let j = 0; j < anchors.length - 1; ++j) {
                    const start = new vscode.Position(rowLine, anchors[j] + 1);
                    const end = new vscode.Position(rowLine, anchors[j + 1]);
                    this.cellRanges.push({
                        isSeparator: false,
                        range: new vscode.Range(start, end)
                    });
                }
            }
        }
    }
}
