export type { IGameObjectTemplate } from './Entity/IGameObjectTemplate.js';

export type { IGameObject } from './Entity/IGameObject.js';

export type { IParameterDefinition, ParameterValueType } from './Entity/IParameterDefinition.js';
export type { IParameterValue } from './Entity/IParameterValue.js';
export type { IParameterSnapshot } from './Entity/IParameterSnapshot.js';

export type { IActionDefinition, ActionTrigger } from './Action/IActionDefinition.js';
export type { IActionExecutionResult, IActionExecutionError } from './Action/IActionExecutionResult.js';

export type { ITemplateDisplayConfig } from './Display/ITemplateDisplayConfig.js';
export type { ICardStyleConfig } from './Display/ICardStyleConfig.js';
export type { IDisplayGroup } from './Display/IDisplayGroup.js';
export type { IDisplayChart, DisplayChartType } from './Display/IDisplayChart.js';
export type { IParameterDisplayConfig, ParameterGraphType } from './Display/IParameterDisplayConfig.js';

export type { IGameObjectTemplateRepository } from './Repository/IGameObjectTemplateRepository.js';
export type { IGameObjectRepository } from './Repository/IGameObjectRepository.js';
export type { IParameterSnapshotRepository } from './Repository/IParameterSnapshotRepository.js';
export type { IObjectProjectionRepository } from './Repository/IObjectProjectionRepository.js';
export type { IProjectionSnapshotRepository } from './Repository/IProjectionSnapshotRepository.js';

export type { ITurnActionEngine } from './Action/ITurnActionEngine.js';

export type {
    IProjectedParameter,
    ParameterSource,
    IObjectProjection,
    ProjectionStatus,
    IProjectionSnapshot,
    ProjectionDisplayStyle,
    ProjectionDisplayConfigMap,
} from './Entity/Projection/index.js';
