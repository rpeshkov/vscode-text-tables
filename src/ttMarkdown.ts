import * as tt from './ttTable';
import * as vscode from 'vscode';

const verticalSeparator = '|';
const horizontalSeparator = '-';

export class MarkdownParser implements tt.Parser {
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

            const cleanedString = s.replace(/\s+/g, '');
            if (cleanedString.startsWith('|-') || cleanedString.startsWith('|:-')) {
                result.addRow(tt.RowType.Separator, []);
                for (let part of cleanedString.split('|')) {
                    if (part.length < 3) {
                        continue;
                    }
                    let trimmed = part.trim();
                    let align = tt.Alignment.Left;
                    if (trimmed[trimmed.length - 1] === ':') {
                        if (trimmed[0] === ':') {
                            align = tt.Alignment.Center;
                        } else {
                            align = tt.Alignment.Right;
                        }
                    }

                    result.cols.push({alignment: align, width: 3});
                }
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

        result.normalize();
        result.calculateColDefs();

        return result;
    }
}

export class MarkdownStringifier implements tt.Stringifier {
    stringify(table: tt.Table): string {


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
                    const begin = table.cols[idx].alignment === tt.Alignment.Center
                        ? ' :'
                        : ' -';
                    const ending = table.cols[idx].alignment !== tt.Alignment.Left
                         ? ': ' + verticalSeparator
                         : '- ' + verticalSeparator;
                    return prev + begin + horizontalSeparator.repeat(table.cols[idx].width-2) + ending;
                }, verticalSeparator);
            }

            result.push(rowString);
        }

        return result.join('\n');
    }
}

export class MarkdownLocator implements tt.Locator {
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