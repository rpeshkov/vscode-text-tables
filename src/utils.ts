import * as vscode from 'vscode';

export const tableSizeRe = /^(\d+)x(\d+)$/u;

export function convertEOL(eol: vscode.EndOfLine): string {
    if (eol === vscode.EndOfLine.CRLF) {
        return '\r\n';
    }
    else {
        return '\n';
    }
}

export function findTablePrefix(text: string, tableStart: string): string {
    const startIndex = text.indexOf(tableStart);

    if (startIndex > 0) {
        return text.substr(0, startIndex);
    }
    else {
        return '';
    }
}
