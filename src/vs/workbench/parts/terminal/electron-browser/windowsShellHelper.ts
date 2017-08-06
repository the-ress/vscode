/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as platform from 'vs/base/common/platform';
import { TPromise } from 'vs/base/common/winjs.base';
import { Emitter, debounceEvent } from 'vs/base/common/event';
import { ITerminalInstance } from 'vs/workbench/parts/terminal/common/terminal';
import XTermTerminal = require('xterm');
import { getProcessInfo, ProcessInfo } from 'windows-process-info';

export class WindowsShellHelper {
	private _childProcessIdStack: number[];
	private _onCheckShell: Emitter<TPromise<string>>;
	private _wmicProcess: cp.ChildProcess;
	private _isDisposed: boolean;

	public constructor(
		private _rootProcessId: number,
		private _rootShellExecutable: string,
		private _terminalInstance: ITerminalInstance,
		private _xterm: XTermTerminal
	) {
		if (!platform.isWindows) {
			throw new Error(`WindowsShellHelper cannot be instantiated on ${platform.platform}`);
		}

		this._childProcessIdStack = [this._rootProcessId];
		this._isDisposed = false;
		this._onCheckShell = new Emitter<TPromise<string>>();

		debounceEvent(this._onCheckShell.event, (l, e) => e, 200, true)(() => {
			this.checkShell();
		});

		this._terminalInstance.onData(() => this._onCheckShell.fire());
	}

	private checkShell(): void {
		if (platform.isWindows && this._terminalInstance.isTitleSetByProcess) {
			this.getShellName().then(title => {
				if (!this._isDisposed) {
					this._terminalInstance.setTitle(title, true);
				}
			});
		}
	}

	public dispose(): void {
		this._isDisposed = true;
		if (this._wmicProcess) {
			this._wmicProcess.kill();
		}
	}

	/**
	 * Returns the innermost shell executable running in the terminal
	 */
	public getShellName(): TPromise<string> {
		return this._terminalInstance.getProcessList().then(pids => {
			const processes = getProcessInfo(pids);

			const processMap: { [pid: number]: ProcessInfo; } = {};
			const children: { [pid: number]: number[]; } = {};

			processes.forEach(p => processMap[p.processId] = p);
			processes.forEach(p => children[p.processId] = []);

			processes.forEach(p => children[p.parentId] && children[p.parentId].push(p.processId));

			let pid = this._rootProcessId;
			while (children[pid].length !== 0) {
				pid = children[pid].reduce(function (prev, current) {
					return (prev && processMap[prev].startTime > processMap[current].startTime) ? prev : current;
				}, null);
			}

			return processMap[pid] ? processMap[pid].name : this._rootShellExecutable;
		});
	}
}