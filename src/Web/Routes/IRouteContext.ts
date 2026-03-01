import type { FastifyInstance } from 'fastify';
import type { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import type { ExpressionEvaluator } from '../../Flow/GameObject/ExpressionEvaluator.js';

export interface IRouteContext {
    templateRepository: GameObjectTemplateRepository;
    expressionEvaluator: ExpressionEvaluator;
}

export type RouteRegistrar = (fastify: FastifyInstance, context: IRouteContext) => void;
