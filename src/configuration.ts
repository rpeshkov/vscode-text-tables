import * as vscode from 'vscode';

export const section = 'text-tables';

export const modeKey = 'mode';
export const showStatusKey = 'showStatus';

export enum Mode {
    Org = 'org',
    Markdown = 'markdown'
}

export interface Configuration {
    mode: Mode;
    showStatus: boolean;
}

export function build(overrides?: any): Configuration {
    const c = vscode.workspace.getConfiguration(section);
    const cfg: Configuration = {
        mode: c.get<Mode>(modeKey, Mode.Markdown),
        showStatus: c.get<boolean>(showStatusKey, true)
    };
    return Object.assign(cfg, overrides);
}
