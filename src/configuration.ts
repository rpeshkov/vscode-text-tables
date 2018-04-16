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

export function build(): Configuration {
    const c = vscode.workspace.getConfiguration(section);

    return {
        mode: c.get<Mode>(modeKey, Mode.Markdown),
        showStatus: c.get<boolean>(showStatusKey, true)
    };

    // Object.assign(cfg, overrides);
}

export async function override(overrides: any) {
    const c = vscode.workspace.getConfiguration(section);
    for (const k of Object.keys(overrides)) {
        await c.update(k, overrides[k], false);
    }
}
