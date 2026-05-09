import type { Node } from "./Node";

/**
 * Tipo genérico para cualquier función que transforma un DTO del backend → Node de dominio.
 */
export type NodeMapper<TDto> = (dto: TDto) => Node;
