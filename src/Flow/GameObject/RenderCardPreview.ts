import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import { FetchObjectDetail } from '../Object/FetchObjectDetail.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/ITemplateDisplayConfig.js';
import type { ObjectDetail } from '../Object/FetchObjectDetail.js';
import { RenderObjectCard } from '../../Framework/ImageGen/ObjectCardRenderer.js';
import { log } from '../../Common/Log.js';

/** Shared repository instances for preview rendering. */
const _templateRepository = new GameObjectTemplateRepository();
const _objectRepository = new GameObjectRepository();

/**
 * Render a card preview PNG for a template.
 * Uses the first existing object of this template, or builds a synthetic detail from defaults.
 * Optionally applies a display config override (for unsaved previews from the web editor).
 *
 * @param templateUid string Template uid to preview. @example 'tpl_abc123'
 * @param configOverride ITemplateDisplayConfig | undefined Optional display config to use instead of the stored one.
 * @returns Promise<Buffer | null> PNG buffer, or null if template not found.
 *
 * @example
 * const png = await RenderCardPreview('tpl_abc123');
 */
export async function RenderCardPreview(
    templateUid: string,
    configOverride?: ITemplateDisplayConfig,
): Promise<Buffer | null> {
    try {
        const template = await _templateRepository.GetByUid(templateUid);
        if (!template) {
            return null;
        }

        const displayConfig = configOverride ?? template.displayConfig;

        // Try to find an existing object to get real parameter values and history
        let detail: ObjectDetail | null = null;
        try {
            const objects = await _objectRepository.ListByGame(template.gameUid);
            const matchingObject = objects.find(gameObject => {
                return gameObject.templateUid === templateUid;
            });
            if (matchingObject) {
                detail = await FetchObjectDetail(matchingObject.uid, true);
            }
        } catch {
            // Fall through to synthetic detail
        }

        // Build synthetic detail from template defaults if no real object exists
        if (!detail) {
            const syntheticProperties: Record<string, unknown> = {
                name: template.name,
                friendly_name: template.name,
                description: template.description,
            };

            // Build parameters_json from template defaults for card rendering
            const parametersJson = template.parameters.map(parameterDefinition => {
                return {
                    key: parameterDefinition.key,
                    value: parameterDefinition.defaultValue,
                };
            });
            syntheticProperties.parameters_json = JSON.stringify(parametersJson);

            // Build actions_json from template actions
            if (template.actions.length > 0) {
                syntheticProperties.actions_json = JSON.stringify(template.actions);
            }

            detail = {
                uid: templateUid,
                labels: [`GameObjectTemplate`],
                properties: syntheticProperties,
                parameters: {},
                relationships: [],
                createdAt: null,
                updatedAt: null,
                parameterHistory: [],
            };
        }

        return await RenderObjectCard({
            detail,
            objectType: `template`,
            description: template.description || null,
            typeLabel: template.name,
            locale: `en`,
            displayConfig: displayConfig,
        });
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to render card preview: ${message}`, `Flow/GameObject`, `RenderCardPreview`);
        return null;
    }
}
