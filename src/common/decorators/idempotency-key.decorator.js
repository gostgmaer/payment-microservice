"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyKey = void 0;
var common_1 = require("@nestjs/common");
/**
 * Extracts the Idempotency-Key header from the incoming request.
 * The idempotency interceptor uses this to deduplicate requests.
 */
exports.IdempotencyKey = (0, common_1.createParamDecorator)(function (_data, ctx) {
    var request = ctx.switchToHttp().getRequest();
    return request.headers['idempotency-key'];
});
