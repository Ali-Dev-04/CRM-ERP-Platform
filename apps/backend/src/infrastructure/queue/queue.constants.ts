/** BullMQ queue names. Kept in a constants file to avoid circular imports
 *  between the module (which registers the queue) and the processor
 *  (which injects it). */
export const MAINTENANCE_QUEUE = 'maintenance';
