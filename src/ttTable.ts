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

class JumpPosition {
    constructor(start: vscode.Position, end: vscode.Position, public isSeparator: boolean, prev?: JumpPosition) {
        this.range = new vscode.Range(start, end);

        if (prev) {
            prev.next = this;
            this.prev = prev;
        }
    }

    range: vscode.Range;
    next?: JumpPosition;
    prev?: JumpPosition;
}

export class TableNavigator {
    private jumpPositions: JumpPosition[] = [];

    constructor(public table: Table) {
        this.jumpPositions = this.buildJumpPositions();
    }

    nextCell(cursorPosition: vscode.Position): vscode.Position | undefined {
        return this.jump(cursorPosition, x => x.next!);
    }

    previousCell(cursorPosition: vscode.Position): vscode.Position | undefined {
        return this.jump(cursorPosition, x => x.prev!);
    }

    private jump(currentPosition: vscode.Position, accessor: (x: JumpPosition) => JumpPosition): vscode.Position | undefined {
        let jmp = this.jumpPositions.find(x => x.range.contains(currentPosition));
        if (jmp) {
            jmp = accessor(jmp);
            if (jmp) {
                if (jmp.isSeparator && accessor(jmp)) {
                    jmp = accessor(jmp);
                }
                return jmp.range.start.translate(0, 1);
            }
        }
        return undefined;
    }

    private buildJumpPositions(): JumpPosition[] {
        const result: JumpPosition[] = [];

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
                const prevJmpPos = this.jumpPositions[this.jumpPositions.length - 1];
                // Extend last range to whole separator line
                if (prevJmpPos) {
                    const start = prevJmpPos.range.end;
                    const end = start.translate(1);
                    const jmpPos = new JumpPosition(start, end, true, prevJmpPos);
                    this.jumpPositions.push(jmpPos);
                }
            } else {
                for (let j = 0; j < anchors.length - 1; ++j) {
                    const prevJmpPos = this.jumpPositions[this.jumpPositions.length - 1];
                    const start = new vscode.Position(rowLine, anchors[j] + 1);
                    const end = new vscode.Position(rowLine, anchors[j + 1]);
                    const jmpPos = new JumpPosition(start, end, false, prevJmpPos);
                    this.jumpPositions.push(jmpPos);
                }
            }
        }
        return result;
    }
}
