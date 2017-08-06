/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'windows-process-info' {

	export class ProcessInfo {
		processId: number;
		parentId: number;
		name: string;
		path: string;
		startTime: Date;
	}

	export function getProcessInfo(pid: number): ProcessInfo;
	export function getProcessInfo(pid: number[]): ProcessInfo[];

}