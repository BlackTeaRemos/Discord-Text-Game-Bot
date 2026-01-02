import type { ObjectTypeKey } from '../../../../Common/Flow/ObjectRegistry.js';

/**
 * View model returned by a parameter parser.
 */
export interface ParameterRenderModel {
    title: string;
    content: string;
}

/**
 * Input options provided to a parameter parser.
 */
export interface ParameterParserOptions {
    objectType: ObjectTypeKey;
    objectUid: string;
    tag: string;
    payload: unknown;
}

/**
 * Parser function that formats a parameter payload into a render model.
 */
export type ParameterParser = (options: ParameterParserOptions) => Promise<ParameterRenderModel>;
