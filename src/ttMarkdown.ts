import * as tt from './ttTable';
import * as vscode from 'vscode';

const verticalSeparator = '|';
const horizontalSeparator = '-';

type StringReducer = (previous: string, current: string, index: number) => string;

export class MarkdownParser implements tt.Parser {
    parse(text: string): tt.Table | undefined {
        if (!text || text.length === 0) {
            return undefined;
        }

        const result = new tt.Table();
        const strings = text.split('\n').map(x => x.trim()).filter(x => x.startsWith(verticalSeparator));

        for (const s of strings) {
            const cleanedString = s.replace(/\s+/g, '');

            if (this.isSeparatorRow(cleanedString)) {
                result.addRow(tt.RowType.Separator, []);
                result.cols.forEach(x => x.width = Math.max(x.width, 3));
                const startIndex = cleanedString.startsWith(verticalSeparator) ? 1 : 0;
                const endIndex = cleanedString.length - (cleanedString.endsWith(verticalSeparator) ? 1 : 0);
                const rowParts = cleanedString.slice(startIndex, endIndex).split('|');

                rowParts.forEach((part, i) => {
                    if (part.length < 3) {
                        return;
                    }
                    const trimmed = part.trim();
                    let align = tt.Alignment.Left;
                    if (trimmed[trimmed.length - 1] === ':') {
                        if (trimmed[0] === ':') {
                            align = tt.Alignment.Center;
                        } else {
                            align = tt.Alignment.Right;
                        }
                    }
                    const col = result.cols[i];
                    if (col) {
                        col.alignment = align;
                    } else {
                        result.cols.push({ alignment: align, width: 3 });
                    }
                });

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
        const cleaned = text.replace(/\s+/g, '');
        return cleaned.startsWith('|-') || cleaned.startsWith('|:-');
    }
}

export class MarkdownStringifier implements tt.Stringifier {
    private reducers = new Map([
        [tt.RowType.Data, this.dataRowReducer],
        [tt.RowType.Separator, this.separatorReducer],
    ]);

    stringify(table: tt.Table): string {
        const result = [];

        for (let i = 0; i < table.rows.length; ++i) {
            let rowString = '';
            const rowData = table.getRow(i);
            const reducer = this.reducers.get(table.rows[i].type);
            if (reducer) {
                rowString = rowData.reduce(reducer(table.cols), verticalSeparator);
            }
            result.push(rowString);
        }

        return result.join('\n');
    }

    private dataRowReducer(cols: tt.ColDef[]): StringReducer {
        return (prev, cur, idx) => {
            const pad = ' '.repeat(cols[idx].width - cur.length + 1);
            return prev + ' ' + cur + pad + verticalSeparator;
        };
    }

    private separatorReducer(cols: tt.ColDef[]): StringReducer {
        return (prev, _, idx) => {
            const begin = cols[idx].alignment === tt.Alignment.Center
                ? ' :'
                : ' -';
            const ending = cols[idx].alignment !== tt.Alignment.Left
                ? ': ' + verticalSeparator
                : '- ' + verticalSeparator;

            const middle = horizontalSeparator.repeat(cols[idx].width - 2);

            return prev + begin + middle + ending;
        };
    }
}

export class MarkdownLocator implements tt.Locator {
    locate(reader: tt.LineReader, lineNr: number): vscode.Range | undefined {
        const isTableLikeString = (ln: number) => {
            if (ln < 0 || ln >= reader.lineCount) {
                return false;
            }
            const firstCharIdx = reader.lineAt(ln).firstNonWhitespaceCharacterIndex;
            const firstChar = reader.lineAt(ln).text[firstCharIdx];
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
