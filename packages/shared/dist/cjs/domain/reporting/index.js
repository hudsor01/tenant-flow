"use strict";
/**
 * Reporting Domain Entities and Aggregates
 *
 * Domain-driven design implementation for the reporting system
 * with proper entity modeling, business rules, and type safety.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./entities/report.entity"), exports);
__exportStar(require("./entities/dashboard.entity"), exports);
__exportStar(require("./entities/report-template.entity"), exports);
__exportStar(require("./entities/scheduled-report.entity"), exports);
__exportStar(require("./aggregates/report.aggregate"), exports);
__exportStar(require("./aggregates/dashboard.aggregate"), exports);
__exportStar(require("./value-objects/chart-configuration"), exports);
__exportStar(require("./value-objects/date-range"), exports);
__exportStar(require("./value-objects/report-filter"), exports);
__exportStar(require("./value-objects/kpi"), exports);
__exportStar(require("./services/report-generator.service"), exports);
__exportStar(require("./services/data-aggregation.service"), exports);
__exportStar(require("./specifications/report.specifications"), exports);
__exportStar(require("./events/reporting.events"), exports);
//# sourceMappingURL=index.js.map