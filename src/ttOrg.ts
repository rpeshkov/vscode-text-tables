import * as tt from './ttTable';
import * as vscode from 'vscode';

const verticalSeparator = '|';
const horizontalSeparator = '-';
const intersection = '+';

export class OrgParser implements tt.Parser {
    parse(text: string): tt.Table | undefined {
        if (!text || text.length === 0) {
            return undefined;
        }

        const result = new tt.Table();

        const strings = text.split('\n');

        for (let s of strings) {
            s = s.trim();

            if (!s.startsWith(verticalSeparator)) {
                continue;
            }

            if (s.length > 1 && s[1] === horizontalSeparator) {
                result.addRow(tt.RowType.Separator, []);
                continue;
            }

            let lastIndex = s.length;
            if (s.endsWith(verticalSeparator)) {
                lastIndex--;
            }

            const values = s
                .slice(1, lastIndex)
                .split(verticalSeparator)
                .map(x => x.trim());

            result.addRow(tt.RowType.Data, values);
        }

        return result;
    }
}

export class OrgStringifier implements tt.Stringifier {
    stringify(table: tt.Table): string {
        table.normalize();
        table.calculateColDefs();

        const result = [];

        for (let i = 0; i < table.rows.length; ++i) {
            let rowString = '';
            const rowData = table.getRow(i);
            if (table.rows[i].type === tt.RowType.Data) {
                rowString = rowData.reduce((prev, cur, idx) => {
                    const pad = ' '.repeat(table.cols[idx].width - cur.length + 1);
                    return prev + ' ' + cur + pad + verticalSeparator;
                }, verticalSeparator);
            } else {
                rowString = rowData.reduce((prev, _, idx) => {
                    const ending = (idx === table.cols.length - 1)
                        ? verticalSeparator
                        : intersection;
                    return prev + horizontalSeparator.repeat(table.cols[idx].width + 2) + ending;
                }, verticalSeparator);
            }

            result.push(rowString);
        }

        return result.join('\n');
    }
}

export class OrgLocator implements tt.Locator {
    locate(reader: tt.LineReader, lineNr: number): vscode.Range | undefined {
        const isTableLikeString = (lineNr: number) => {
            if (lineNr < 0 || lineNr >= reader.lineCount) {
                return false;
            }
            const firstCharIdx = reader.lineAt(lineNr).firstNonWhitespaceCharacterIndex;
            const firstChar = reader.lineAt(lineNr).text[firstCharIdx];
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
