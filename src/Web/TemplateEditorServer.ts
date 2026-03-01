import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import { URL } from 'url';
import { Log } from '../Common/Log.js';
import { BuildTemplateEditorHtml } from './TemplateEditorPage.js';
import { BuildTutorialPageHtml } from './TutorialPage.js';
import { BuildDisplayConfigPageHtml } from './DisplayConfigPage.js';
import { ValidateTemplateJson } from '../Flow/GameObject/ValidateTemplateJson.js';
import { ExpressionEvaluator } from '../Flow/GameObject/ExpressionEvaluator.js';
import { GameObjectTemplateRepository } from '../Repository/GameObject/GameObjectTemplateRepository.js';
import { ValidateDisplayConfig } from '../Flow/GameObject/ValidateDisplayConfig.js';
import type { ITemplateDisplayConfig } from '../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import { RenderCardPreview } from '../Flow/GameObject/RenderCardPreview.js';

/** Default port for the template editor web server */
const DEFAULT_PORT = 3500;

/** Log tag for web server messages */
const LOG_TAG = `Web/TemplateEditorServer`;

/**
 * @brief Configuration for the template editor HTTP server
 */
export interface ITemplateEditorServerConfig {
    /** Port number for the HTTP server @example 3500 */
    port: number;
}

/**
 * @brief HTTP server that serves the template editor page and manages its own lifecycle
 */
export class TemplateEditorServer {
    /** Cached HTML content for the editor page */
    private _cachedHtml: string;

    /** Cached HTML content for the tutorial page */
    private _cachedTutorialHtml: string;

    /** Node HTTP server instance */
    private _server: Server | null = null;

    /** Port number this server listens on */
    private _port: number;

    /** Expression evaluator for syntax validation on the API */
    private readonly _expressionEvaluator: ExpressionEvaluator;

    /** Template repository for API queries */
    private readonly _templateRepository: GameObjectTemplateRepository;

    /**
     * @brief Create a new TemplateEditorServer
     * @param config ITemplateEditorServerConfig Server configuration
     * @example
     * const server = new TemplateEditorServer({ port: 3500 });
     * await server.Start();
     */
    public constructor(config: ITemplateEditorServerConfig) {
        this._port = config.port;
        this._cachedHtml = BuildTemplateEditorHtml();
        this._cachedTutorialHtml = BuildTutorialPageHtml();
        this._expressionEvaluator = new ExpressionEvaluator();
        this._templateRepository = new GameObjectTemplateRepository();
    }

    /**
     * @brief Start listening for HTTP requests
     * @returns Promise<void> Resolves when the server is bound and listening
     * @example
     * await server.Start();
     */
    public Start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._server = createServer((request: IncomingMessage, response: ServerResponse) => {
                this.__HandleRequest(request, response);
            });

            this._server.on(`error`, (error: Error) => {
                Log.error(`Server error: ${error.message}`, LOG_TAG);
                reject(error);
            });

            this._server.listen(this._port, () => {
                Log.info(`Template editor available at http://localhost:${this._port}`, LOG_TAG);
                resolve();
            });
        });
    }

    /**
     * @brief Stop the HTTP server gracefully
     * @returns Promise<void> Resolves after the server closes
     * @example
     * await server.Stop();
     */
    public Stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this._server) {
                resolve();
                return;
            }
            this._server.close(() => {
                Log.info(`Template editor server stopped.`, LOG_TAG);
                this._server = null;
                resolve();
            });
        });
    }

    /**
     * @brief Route incoming HTTP requests to appropriate handlers
     * @param request IncomingMessage Incoming HTTP request
     * @param response ServerResponse HTTP response to write to
     */
    private __HandleRequest(request: IncomingMessage, response: ServerResponse): void {
        const rawUrl = request.url ?? `/`;
        const parsedUrl = new URL(rawUrl, `http://localhost:${this._port}`);
        const pathname = parsedUrl.pathname;

        // CORS headers for API endpoints
        response.setHeader(`Access-Control-Allow-Origin`, `*`);
        response.setHeader(`Access-Control-Allow-Methods`, `GET, POST, PUT, OPTIONS`);
        response.setHeader(`Access-Control-Allow-Headers`, `Content-Type`);

        if (request.method === `OPTIONS`) {
            response.writeHead(204);
            response.end();
            return;
        }

        if (pathname === `/` || pathname === `/editor`) {
            this.__ServeEditorPage(response);
            return;
        }

        if (pathname === `/tutorial`) {
            this.__ServeTutorialPage(response);
            return;
        }

        if (pathname === `/health`) {
            this.__ServeHealth(response);
            return;
        }

        if (pathname === `/api/validate` && request.method === `POST`) {
            this.__HandleValidateApi(request, response);
            return;
        }

        if (pathname === `/api/templates` && request.method === `GET`) {
            const gameUid = parsedUrl.searchParams.get(`gameUid`);
            this.__HandleListTemplates(response, gameUid);
            return;
        }

        if (pathname === `/api/validate-context` && request.method === `POST`) {
            this.__HandleContextAwareValidation(request, response);
            return;
        }

        if (pathname === `/api/display-config` && request.method === `GET`) {
            const templateUid = parsedUrl.searchParams.get(`templateUid`);
            this.__HandleGetDisplayConfig(response, templateUid);
            return;
        }

        if (pathname === `/api/display-config` && request.method === `PUT`) {
            this.__HandlePutDisplayConfig(request, response);
            return;
        }

        if (pathname === `/api/card-preview` && request.method === `POST`) {
            this.__HandleCardPreview(request, response);
            return;
        }

        if (pathname === `/display-config`) {
            this.__ServeDisplayConfigPage(response);
            return;
        }

        response.writeHead(404, { 'Content-Type': `text/plain` });
        response.end(`Not found`);
    }

    /**
     * @brief Serve the editor HTML page
     * @param response ServerResponse HTTP response
     */
    private __ServeEditorPage(response: ServerResponse): void {
        response.writeHead(200, {
            'Content-Type': `text/html; charset=utf-8`,
            'Cache-Control': `no-cache`,
        });
        response.end(this._cachedHtml);
    }

    /**
     * @brief Serve the tutorial and documentation HTML page
     * @param response ServerResponse HTTP response
     */
    private __ServeTutorialPage(response: ServerResponse): void {
        response.writeHead(200, {
            'Content-Type': `text/html; charset=utf-8`,
            'Cache-Control': `no-cache`,
        });
        response.end(this._cachedTutorialHtml);
    }

    /**
     * @brief Serve a health check response
     * @param response ServerResponse HTTP response
     */
    private __ServeHealth(response: ServerResponse): void {
        response.writeHead(200, { 'Content-Type': `application/json` });
        response.end(JSON.stringify({ status: `ok`, service: `template-editor` }));
    }

    /**
     * @brief Handle POST api validate to validate a template JSON and its expressions
     * @param request IncomingMessage Incoming POST request with JSON body
     * @param response ServerResponse HTTP response to write validation results
     */
    private __HandleValidateApi(request: IncomingMessage, response: ServerResponse): void {
        let requestBody = ``;

        request.on(`data`, (chunk: Buffer) => {
            requestBody += chunk.toString();
            // Limit body size to 1MB
            if (requestBody.length > 1_048_576) {
                response.writeHead(413, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ valid: false, errors: [`Request body too large.`] }));
                request.destroy();
            }
        });

        request.on(`end`, () => {
            try {
                const parsed = JSON.parse(requestBody);
                const validationResult = this.__ValidateTemplateWithExpressions(parsed);

                response.writeHead(200, { 'Content-Type': `application/json` });
                response.end(JSON.stringify(validationResult));
            } catch(parseError) {
                const message = parseError instanceof Error ? parseError.message : String(parseError);
                response.writeHead(400, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ valid: false, errors: [`Invalid JSON: ${message}`] }));
            }
        });

        request.on(`error`, (requestError: Error) => {
            Log.error(`Validate API request error: ${requestError.message}`, LOG_TAG);
            response.writeHead(500, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ valid: false, errors: [`Internal server error.`] }));
        });
    }

    /**
     * @brief Validate a template JSON structurally and check expression syntax
     * @param input unknown Raw parsed JSON template
     * @returns IValidateApiResponse Combined validation result
     */
    private __ValidateTemplateWithExpressions(input: unknown): IValidateApiResponse {
        // Step 1 structural validation
        const structuralResult = ValidateTemplateJson(input);

        if (!structuralResult.valid) {
            return {
                valid: false,
                structuralErrors: structuralResult.errors,
                expressionErrors: [],
            };
        }

        // Step 2 expression syntax validation
        const template = input as Record<string, unknown>;
        const parameters = template.parameters as Array<{ key: string; valueType: string }>;
        const numericKeys = parameters
            .filter(parameter => {
                return parameter.valueType === `number`;
            })
            .map(parameter => {
                return parameter.key;
            });

        const expressionErrors: IExpressionValidationError[] = [];

        if (Array.isArray(template.actions)) {
            const actions = template.actions as Array<{
                key: string;
                expressions: string[];
                target?: string;
            }>;

            for (const action of actions) {
                for (let expressionIndex = 0; expressionIndex < action.expressions.length; expressionIndex++) {
                    const expression = action.expressions[expressionIndex];
                    const syntaxErrors = this._expressionEvaluator.ValidateSyntax(expression, numericKeys);

                    if (syntaxErrors.length > 0) {
                        expressionErrors.push({
                            actionKey: action.key,
                            expressionIndex,
                            expression,
                            errors: syntaxErrors,
                        });
                    }
                }
            }
        }

        return {
            valid: expressionErrors.length === 0,
            structuralErrors: [],
            expressionErrors,
        };
    }

    /**
     * @brief Handle GET api templates to list all templates for a game
     * @param response ServerResponse HTTP response
     * @param gameUid string or null Game identifier from query string
     */
    private async __HandleListTemplates(response: ServerResponse, gameUid: string | null): Promise<void> {
        if (!gameUid) {
            response.writeHead(400, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ error: `Missing required query parameter: gameUid` }));
            return;
        }

        try {
            const templates = await this._templateRepository.ListByGame(gameUid);

            /** Simplified template info for the editor */
            const templateSummaries = templates.map(template => {
                return {
                    uid: template.uid,
                    name: template.name,
                    description: template.description,
                    parameters: template.parameters.map(parameter => {
                        return {
                            key: parameter.key,
                            label: parameter.label,
                            valueType: parameter.valueType,
                        };
                    }),
                    actions: template.actions.map(action => {
                        return {
                            key: action.key,
                            label: action.label,
                            trigger: action.trigger,
                        };
                    }),
                };
            });

            response.writeHead(200, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ templates: templateSummaries }));
        } catch(fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
            Log.error(`Failed to list templates: ${message}`, LOG_TAG, `__HandleListTemplates`);
            response.writeHead(500, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ error: `Failed to fetch templates.` }));
        }
    }

    /**
     * @brief Handle POST api validate context to validate a template with knowledge of other templates
     * @param request IncomingMessage Incoming POST request
     * @param response ServerResponse HTTP response
     */
    private __HandleContextAwareValidation(request: IncomingMessage, response: ServerResponse): void {
        let requestBody = ``;

        request.on(`data`, (chunk: Buffer) => {
            requestBody += chunk.toString();
            if (requestBody.length > 1_048_576) {
                response.writeHead(413, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ valid: false, errors: [`Request body too large.`] }));
                request.destroy();
            }
        });

        request.on(`end`, async() => {
            try {
                const parsed = JSON.parse(requestBody);
                const gameUid = parsed.gameUid as string | undefined;
                const template = parsed.template as Record<string, unknown> | undefined;

                if (!gameUid || !template) {
                    response.writeHead(400, { 'Content-Type': `application/json` });
                    response.end(JSON.stringify({ valid: false, errors: [`Missing "gameUid" or "template" in request body.`] }));
                    return;
                }

                // First do basic structural and expression validation
                const basicResult = this.__ValidateTemplateWithExpressions(template);

                if (!basicResult.valid && basicResult.structuralErrors.length > 0) {
                    response.writeHead(200, { 'Content-Type': `application/json` });
                    response.end(JSON.stringify(basicResult));
                    return;
                }

                // Fetch existing templates for cross reference validation
                const existingTemplates = await this._templateRepository.ListByGame(gameUid);

                // Build a map of template name to parameter keys
                const knownTemplateParams = new Map<string, Set<string>>();
                for (const existingTemplate of existingTemplates) {
                    const paramKeys = new Set<string>();
                    for (const parameter of existingTemplate.parameters) {
                        if (parameter.valueType === `number`) {
                            paramKeys.add(parameter.key);
                        }
                    }
                    knownTemplateParams.set(existingTemplate.name, paramKeys);
                }

                // Also include the current template being validated
                const currentParams = template.parameters as Array<{ key: string; valueType: string }>;
                const currentName = template.name as string;
                const currentParamKeys = new Set<string>();
                for (const parameter of currentParams) {
                    if (parameter.valueType === `number`) {
                        currentParamKeys.add(parameter.key);
                    }
                }
                knownTemplateParams.set(currentName, currentParamKeys);

                // Validate cross object references in expressions for both RHS reads and LHS inline targets
                const crossRefErrors: ICrossReferenceError[] = [];
                const crossRefPattern = /@([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)/g;
                /** Regex pattern for detecting inline assignment targets */
                const inlineTargetPattern = /^@([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*[\+\-\*\/]?=/;

                if (Array.isArray(template.actions)) {
                    const actions = template.actions as Array<{ key: string; expressions: string[] }>;

                    for (const action of actions) {
                        for (let expressionIndex = 0; expressionIndex < action.expressions.length; expressionIndex++) {
                            const expression = action.expressions[expressionIndex];

                            // Check inline target LHS
                            const inlineMatch = inlineTargetPattern.exec(expression);
                            if (inlineMatch) {
                                const targetTemplateName = inlineMatch[1];
                                const targetParamKey = inlineMatch[2];

                                if (!knownTemplateParams.has(targetTemplateName)) {
                                    crossRefErrors.push({
                                        actionKey: action.key,
                                        expressionIndex,
                                        reference: `@${targetTemplateName}.${targetParamKey}`,
                                        error: `Unknown inline target template "${targetTemplateName}". Available: ${Array.from(knownTemplateParams.keys()).join(`, `)}.`,
                                    });
                                } else {
                                    const availableParams = knownTemplateParams.get(targetTemplateName)!;
                                    if (!availableParams.has(targetParamKey)) {
                                        crossRefErrors.push({
                                            actionKey: action.key,
                                            expressionIndex,
                                            reference: `@${targetTemplateName}.${targetParamKey}`,
                                            error: `Template "${targetTemplateName}" has no numeric parameter "${targetParamKey}". Available: ${Array.from(availableParams).join(`, `)}.`,
                                        });
                                    }
                                }
                            }

                            // Check RHS cross object references for template param reads
                            let crossRefMatch: RegExpExecArray | null;
                            crossRefPattern.lastIndex = 0;

                            // For inline targeted expressions skip the LHS part when scanning RHS refs
                            const rhsStartIndex = inlineMatch ? (inlineMatch[0].length) : 0;
                            const rhsText = expression.substring(rhsStartIndex);

                            while ((crossRefMatch = crossRefPattern.exec(rhsText)) !== null) {
                                const referencedTemplate = crossRefMatch[1];
                                const referencedParam = crossRefMatch[2];

                                if (!knownTemplateParams.has(referencedTemplate)) {
                                    crossRefErrors.push({
                                        actionKey: action.key,
                                        expressionIndex,
                                        reference: `@${referencedTemplate}.${referencedParam}`,
                                        error: `Unknown template "${referencedTemplate}". Available: ${Array.from(knownTemplateParams.keys()).join(`, `)}.`,
                                    });
                                } else {
                                    const availableParams = knownTemplateParams.get(referencedTemplate)!;
                                    if (!availableParams.has(referencedParam)) {
                                        crossRefErrors.push({
                                            actionKey: action.key,
                                            expressionIndex,
                                            reference: `@${referencedTemplate}.${referencedParam}`,
                                            error: `Template "${referencedTemplate}" has no numeric parameter "${referencedParam}". Available: ${Array.from(availableParams).join(`, `)}.`,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                const contextResult: IContextValidateApiResponse = {
                    ...basicResult,
                    valid: basicResult.valid && crossRefErrors.length === 0,
                    crossReferenceErrors: crossRefErrors,
                    availableTemplates: Array.from(knownTemplateParams.entries()).map(([templateName, paramKeys]) => {
                        return {
                            name: templateName,
                            numericParameters: Array.from(paramKeys),
                        };
                    }),
                };

                response.writeHead(200, { 'Content-Type': `application/json` });
                response.end(JSON.stringify(contextResult));
            } catch(parseError) {
                const message = parseError instanceof Error ? parseError.message : String(parseError);
                response.writeHead(400, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ valid: false, errors: [`Invalid JSON: ${message}`] }));
            }
        });

        request.on(`error`, (requestError: Error) => {
            Log.error(`Context validation API error: ${requestError.message}`, LOG_TAG);
            response.writeHead(500, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ valid: false, errors: [`Internal server error.`] }));
        });
    }

    /**
     * @brief Handle GET api display config to fetch display config for a template
     * @param response ServerResponse HTTP response
     * @param templateUid string or null Template identifier from query string
     */
    private async __HandleGetDisplayConfig(response: ServerResponse, templateUid: string | null): Promise<void> {
        if (!templateUid) {
            response.writeHead(400, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ error: `Missing required query parameter: templateUid` }));
            return;
        }

        try {
            const template = await this._templateRepository.GetByUid(templateUid);
            if (!template) {
                response.writeHead(404, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ error: `Template not found.` }));
                return;
            }

            const displayConfig = template.displayConfig ?? __BuildDefaultDisplayConfig(template);

            response.writeHead(200, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({
                templateUid: template.uid,
                templateName: template.name,
                parameters: template.parameters,
                config: displayConfig,
            }));
        } catch(fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
            Log.error(`Failed to get display config: ${message}`, LOG_TAG, `__HandleGetDisplayConfig`);
            response.writeHead(500, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ error: `Failed to fetch display config.` }));
        }
    }

    /**
     * @brief Handle PUT api display config to save display config for a template
     * @param request IncomingMessage Incoming PUT request
     * @param response ServerResponse HTTP response
     */
    private __HandlePutDisplayConfig(request: IncomingMessage, response: ServerResponse): void {
        let requestBody = ``;

        request.on(`data`, (chunk: Buffer) => {
            requestBody += chunk.toString();
            if (requestBody.length > 1_048_576) {
                response.writeHead(413, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ error: `Request body too large.` }));
                request.destroy();
            }
        });

        request.on(`end`, async() => {
            try {
                const parsed = JSON.parse(requestBody);
                const templateUid = parsed.templateUid as string | undefined;
                const config = parsed.config as ITemplateDisplayConfig | undefined;

                if (!templateUid || !config) {
                    response.writeHead(400, { 'Content-Type': `application/json` });
                    response.end(JSON.stringify({ error: `Missing "templateUid" or "config" in request body.` }));
                    return;
                }

                const validationErrors = ValidateDisplayConfig(config);
                if (validationErrors.length > 0) {
                    response.writeHead(400, { 'Content-Type': `application/json` });
                    response.end(JSON.stringify({ error: `Invalid display config.`, details: validationErrors }));
                    return;
                }

                await this._templateRepository.Update(templateUid, { displayConfig: config });

                response.writeHead(200, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ success: true }));
            } catch(saveError) {
                const message = saveError instanceof Error ? saveError.message : String(saveError);
                Log.error(`Failed to save display config: ${message}`, LOG_TAG, `__HandlePutDisplayConfig`);
                response.writeHead(500, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ error: `Failed to save display config.` }));
            }
        });

        request.on(`error`, (requestError: Error) => {
            Log.error(`Display config PUT error: ${requestError.message}`, LOG_TAG);
            response.writeHead(500, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ error: `Internal server error.` }));
        });
    }

    /**
     * @brief Handle POST api card preview to render a card preview and return PNG
     * @param request IncomingMessage Incoming POST request
     * @param response ServerResponse HTTP response with PNG body
     */
    private __HandleCardPreview(request: IncomingMessage, response: ServerResponse): void {
        let requestBody = ``;

        request.on(`data`, (chunk: Buffer) => {
            requestBody += chunk.toString();
            if (requestBody.length > 1_048_576) {
                response.writeHead(413, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ error: `Request body too large.` }));
                request.destroy();
            }
        });

        request.on(`end`, async() => {
            try {
                const parsed = JSON.parse(requestBody);
                const templateUid = parsed.templateUid as string | undefined;
                const configOverride = parsed.config as ITemplateDisplayConfig | undefined;

                if (!templateUid) {
                    response.writeHead(400, { 'Content-Type': `application/json` });
                    response.end(JSON.stringify({ error: `Missing "templateUid" in request body.` }));
                    return;
                }

                const pngBuffer = await RenderCardPreview(templateUid, configOverride);
                if (!pngBuffer) {
                    response.writeHead(404, { 'Content-Type': `application/json` });
                    response.end(JSON.stringify({ error: `Template not found or no objects to preview.` }));
                    return;
                }

                response.writeHead(200, {
                    'Content-Type': `image/png`,
                    'Content-Length': pngBuffer.length,
                    'Cache-Control': `no-cache`,
                });
                response.end(pngBuffer);
            } catch(renderError) {
                const message = renderError instanceof Error ? renderError.message : String(renderError);
                Log.error(`Card preview render error: ${message}`, LOG_TAG, `__HandleCardPreview`);
                response.writeHead(500, { 'Content-Type': `application/json` });
                response.end(JSON.stringify({ error: `Failed to render card preview.` }));
            }
        });

        request.on(`error`, (requestError: Error) => {
            Log.error(`Card preview API error: ${requestError.message}`, LOG_TAG);
            response.writeHead(500, { 'Content-Type': `application/json` });
            response.end(JSON.stringify({ error: `Internal server error.` }));
        });
    }

    /**
     * @brief Serve the display configuration page
     * @param response ServerResponse HTTP response
     */
    private __ServeDisplayConfigPage(response: ServerResponse): void {
        response.writeHead(200, {
            'Content-Type': `text/html; charset=utf-8`,
            'Cache-Control': `no-cache`,
        });
        response.end(BuildDisplayConfigPageHtml());
    }
}

/**
 * @brief Build a default display configuration from template parameter definitions
 * @param template object Template containing parameter definitions with optional categories
 * @returns ITemplateDisplayConfig Default configuration
 */
function __BuildDefaultDisplayConfig(template: { parameters: Array<{ key: string; category?: string }> }): ITemplateDisplayConfig {
    const categorySet = new Set<string>();
    for (const parameter of template.parameters) {
        categorySet.add(parameter.category ?? `general`);
    }

    const groups = Array.from(categorySet).map((category, index) => {
        return {
            key: category,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            sortOrder: index,
        };
    });

    const parameterDisplay = template.parameters.map((parameter, index) => {
        return {
            key: parameter.key,
            graphType: `sparkline` as const,
            hidden: false,
            displayOrder: index,
        };
    });

    return {
        groups,
        parameterDisplay,
    };
}

/**
 * @brief Response shape for the api validate endpoint
 */
interface IValidateApiResponse {
    /** Whether the template is fully valid including structure and expressions @example true */
    valid: boolean;

    /** Structural validation errors from schema checks */
    structuralErrors: string[];

    /** Per expression syntax validation errors */
    expressionErrors: IExpressionValidationError[];
}

/**
 * @brief Individual expression validation error detail
 */
interface IExpressionValidationError {
    /** Key of the action containing the expression @example 'produceGoods' */
    actionKey: string;

    /** Zero based index of the expression within the action @example 0 */
    expressionIndex: number;

    /** The expression text that failed @example 'output += ???' */
    expression: string;

    /** Error messages for this expression */
    errors: string[];
}

/**
 * @brief Cross reference validation error for context aware validation
 */
interface ICrossReferenceError {
    /** Action key where the reference appears @example 'produceGoods' */
    actionKey: string;

    /** Expression index where negative 1 means action level target @example 0 */
    expressionIndex: number;

    /** The cross reference string @example '@Mine.oreOutput' */
    reference: string;

    /** Error detail @example 'Unknown template "Mine".' */
    error: string;
}

/**
 * @brief Extended response for context aware validation
 */
interface IContextValidateApiResponse extends IValidateApiResponse {
    /** Cross reference errors against known templates */
    crossReferenceErrors: ICrossReferenceError[];

    /** Available templates and their numeric parameters for autocomplete */
    availableTemplates: Array<{
        name: string;
        numericParameters: string[];
    }>;
}

/**
 * @brief Resolve the template editor port from environment or use default
 * @returns number Port number
 * @example
 * const port = ResolveEditorPort(); // 3500
 */
export function ResolveEditorPort(): number {
    const envPort = process.env.TEMPLATE_EDITOR_PORT;
    if (envPort) {
        const parsed = parseInt(envPort, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return DEFAULT_PORT;
}
