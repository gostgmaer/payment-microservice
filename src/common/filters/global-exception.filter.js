"use strict";
/**
 * Global Exception Filter
 *
 * Converts all thrown exceptions to a consistent, structured JSON response.
 * Sensitive error details are masked in production.
 *
 * Response shape:
 * {
 *   statusCode: number,
 *   errorCode: string,
 *   message: string,
 *   correlationId: string,
 *   timestamp: string,
 *   path: string
 * }
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var error_codes_constant_1 = require("../constants/error-codes.constant");
var GlobalExceptionFilter = function () {
    var _classDecorators = [(0, common_1.Catch)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var GlobalExceptionFilter = _classThis = /** @class */ (function () {
        function GlobalExceptionFilter_1() {
            this.logger = new common_1.Logger(GlobalExceptionFilter.name);
        }
        GlobalExceptionFilter_1.prototype.catch = function (exception, host) {
            var _a;
            var ctx = host.switchToHttp();
            var response = ctx.getResponse();
            var request = ctx.getRequest();
            var correlationId = (_a = request.headers['x-correlation-id']) !== null && _a !== void 0 ? _a : 'unknown';
            var isProduction = process.env.NODE_ENV === 'production';
            var status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            var errorCode = error_codes_constant_1.ERROR_CODES.INTERNAL_ERROR;
            var message = 'An unexpected error occurred';
            // ── NestJS HttpException ─────────────────────────────────────────────
            if (exception instanceof common_1.HttpException) {
                status = exception.getStatus();
                var exceptionResponse = exception.getResponse();
                if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                    var resp = exceptionResponse;
                    message = resp.message || exception.message;
                    errorCode = resp.errorCode || this.statusToErrorCode(status);
                }
                else {
                    message = exception.message;
                    errorCode = this.statusToErrorCode(status);
                }
            }
            // ── Prisma unique constraint violation ───────────────────────────────
            else if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (exception.code === 'P2002') {
                    status = common_1.HttpStatus.CONFLICT;
                    errorCode = error_codes_constant_1.ERROR_CODES.CONFLICT;
                    message = 'A record with this identifier already exists';
                }
                else if (exception.code === 'P2025') {
                    status = common_1.HttpStatus.NOT_FOUND;
                    errorCode = error_codes_constant_1.ERROR_CODES.NOT_FOUND;
                    message = 'The requested resource was not found';
                }
                else {
                    this.logger.error({ prismaCode: exception.code, correlationId: correlationId }, exception.message);
                }
            }
            // ── Unknown errors ───────────────────────────────────────────────────
            else {
                this.logger.error({ correlationId: correlationId, path: request.url }, exception instanceof Error ? exception.stack : String(exception));
                // Don't leak internal error details in production
                if (!isProduction && exception instanceof Error) {
                    message = exception.message;
                }
            }
            response.status(status).json({
                statusCode: status,
                errorCode: errorCode,
                message: message,
                correlationId: correlationId,
                timestamp: new Date().toISOString(),
                path: request.url,
            });
        };
        GlobalExceptionFilter_1.prototype.statusToErrorCode = function (status) {
            switch (status) {
                case common_1.HttpStatus.NOT_FOUND: return error_codes_constant_1.ERROR_CODES.NOT_FOUND;
                case common_1.HttpStatus.UNAUTHORIZED: return error_codes_constant_1.ERROR_CODES.UNAUTHORIZED;
                case common_1.HttpStatus.FORBIDDEN: return error_codes_constant_1.ERROR_CODES.FORBIDDEN;
                case common_1.HttpStatus.CONFLICT: return error_codes_constant_1.ERROR_CODES.CONFLICT;
                case common_1.HttpStatus.TOO_MANY_REQUESTS: return error_codes_constant_1.ERROR_CODES.RATE_LIMITED;
                case common_1.HttpStatus.UNPROCESSABLE_ENTITY: return error_codes_constant_1.ERROR_CODES.VALIDATION_ERROR;
                default: return error_codes_constant_1.ERROR_CODES.INTERNAL_ERROR;
            }
        };
        return GlobalExceptionFilter_1;
    }());
    __setFunctionName(_classThis, "GlobalExceptionFilter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GlobalExceptionFilter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GlobalExceptionFilter = _classThis;
}();
exports.GlobalExceptionFilter = GlobalExceptionFilter;
