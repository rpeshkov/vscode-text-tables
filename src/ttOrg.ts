import * as tt from './ttTable';
import * as vscode from 'vscode';
import { convertEOL, findTablePrefix } from './utils';

const verticalSeparator = '|';
const horizontalSeparator = '-';
const intersection = '+';

type StringReducer = (previous: string, current: string, index: number) => string;

export class OrgParser implements tt.Parser {
    parse(text: string): tt.Table | undefined {
        if (!text || text.length === 0) {
            return undefined;
        }

        const result = new tt.Table();
        result.prefix = findTablePrefix(text, verticalSeparator);

        const strings = text.split('\n').map(x => x.trim()).filter(x => x.startsWith(verticalSeparator));

        for (const s of strings) {
            if (this.isSeparatorRow(s)) {
                result.addRow(tt.RowType.Separator, []);
                continue;
            }

            const lastIndex = s.length - (s.endsWith(verticalSeparator) ? 1 : 0);
            const values = s
                .slice(1, lastIndex)
                .split(verticalSeparator)
                .map(x => x.trim());

            result.addRow(tt.RowType.Data, values);
        }

        return result;
    }

    isSeparatorRow(text: string): boolean {
        return text.length > 1 && text[1] === horizontalSeparator;
    }
}

export class OrgStringifier implements tt.Stringifier {
    private reducers = new Map([
        [tt.RowType.Data, this.dataRowReducer],
        [tt.RowType.Separator, this.separatorReducer],
    ]);

    stringify(table: tt.Table, eol: vscode.EndOfLine): string {
        const result = [];

        for (let i = 0; i < table.rows.length; ++i) {
            let rowString = table.prefix;
            const rowData = table.getRow(i);
            const reducer = this.reducers.get(table.rows[i].type);
            if (reducer) {
                rowString += rowData.reduce(reducer(table.cols), verticalSeparator);
            }

            result.push(rowString);
        }

        return result.join(convertEOL(eol));
    }

    private dataRowReducer(cols: tt.ColDef[]): StringReducer {
        return (prev, cur, idx) => {
            const pad = ' '.repeat(cols[idx].width - cur.length + 1);
            return prev + ' ' + cur + pad + verticalSeparator;
        };
    }

    private separatorReducer(cols: tt.ColDef[]): (p: string, c: string, i: number) => string {
        return (prev, _, idx) => {
            // Intersections for each cell are '+', except the last one, where it should be '|'
            const ending = (idx === cols.length - 1)
                ? verticalSeparator
                : intersection;

            return prev + horizontalSeparator.repeat(cols[idx].width + 2) + ending;
        };
    }
}

export class OrgLocator implements tt.Locator {
    /**
     * Locate start and end of Org table in text from line number.
     *
     * @param reader Reader that is able to read line by line
     * @param lineNr Current line number
     * @returns vscode.Range if table was located. undefined if it failed
     */
    locate(reader: tt.LineReader, lineNr: number): vscode.Range | undefined {

        // Checks that line starts with vertical bar
        const isTableLikeString = (ln: number) => {
            if (ln < 0 || ln >= reader.lineCount) {
                return false;
            }
            const line = reader.lineAt(ln);
            const firstCharIdx = line.firstNonWhitespaceCharacterIndex;
            const firstChar = line.text[firstCharIdx];
            return firstChar === '|';
        };

        let start = lineNr;
        while (isTableLikeString(start)) {
            start--;
        }

        let end = lineNr;
        while (isTableLikeString(end)) {
            end++;
        }

        if (start === end) {
            return undefined;
        }

        const startPos = reader.lineAt(start + 1).range.start;
        const endPos = reader.lineAt(end - 1).range.end;

        return new vscode.Range(startPos, endPos);
    }
}
