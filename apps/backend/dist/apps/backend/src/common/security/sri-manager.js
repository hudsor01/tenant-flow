"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var SRIManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SRIManager = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
let SRIManager = SRIManager_1 = class SRIManager {
    constructor() {
        this.logger = new common_1.Logger(SRIManager_1.name);
        this.knownResources = [
            {
                url: 'https://www.googletagmanager.com/gtag/js',
                type: 'script',
                description: 'Google Analytics Global Site Tag',
                lastUpdated: new Date('2025-01-01'),
                isRequired: true,
            },
            {
                url: 'https://www.googletagmanager.com/gtm.js',
                type: 'script',
                description: 'Google Tag Manager',
                lastUpdated: new Date('2025-01-01'),
                isRequired: true,
            },
            {
                url: 'https://js.stripe.com/v3/pricing-table.js',
                type: 'script',
                description: 'Stripe Pricing Table Component',
                lastUpdated: new Date('2025-01-01'),
                isRequired: true,
            },
            {
                url: 'https://fonts.googleapis.com/css2',
                type: 'stylesheet',
                description: 'Google Fonts CSS',
                lastUpdated: new Date('2025-01-01'),
                isRequired: true,
            }
        ];
    }
    validateAllResources() {
        return this.knownResources.map(resource => this.validateResource(resource));
    }
    validateResource(resource) {
        const hasIntegrity = !!resource.integrity;
        const recommendations = [];
        let securityRisk = 'low';
        if (this.shouldHaveSRI(resource)) {
            if (!hasIntegrity) {
                recommendations.push(`Add SRI hash for ${resource.description}`);
                securityRisk = this.calculateSecurityRisk(resource);
            }
        }
        else {
            recommendations.push(`SRI not applicable for ${resource.description} - ${this.getNoSRIReason(resource)}`);
        }
        if (resource.type === 'script' && !resource.crossorigin) {
            recommendations.push('Consider adding crossorigin="anonymous" for better error reporting');
        }
        if (!resource.url.startsWith('https://')) {
            recommendations.push('Resource should be loaded over HTTPS');
            securityRisk = 'critical';
        }
        return {
            resource,
            hasIntegrity,
            isValid: hasIntegrity || !this.shouldHaveSRI(resource),
            recommendations,
            securityRisk
        };
    }
    generateSRIHash(content, algorithm = 'sha384') {
        const hash = crypto.createHash(algorithm).update(content).digest('base64');
        return `${algorithm}-${hash}`;
    }
    getSecurityRecommendations() {
        const validationResults = this.validateAllResources();
        const critical = [];
        const high = [];
        const medium = [];
        const low = [];
        const acceptable = [];
        validationResults.forEach(result => {
            const resourceName = result.resource.description;
            if (result.securityRisk === 'critical') {
                critical.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`));
            }
            else if (result.securityRisk === 'high') {
                high.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`));
            }
            else if (result.securityRisk === 'medium') {
                medium.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`));
            }
            else if (result.securityRisk === 'low') {
                low.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`));
            }
            if (!this.shouldHaveSRI(result.resource)) {
                acceptable.push(`${resourceName}: SRI not applicable - ${this.getNoSRIReason(result.resource)}`);
            }
        });
        return {
            summary: this.generateSummary(validationResults),
            critical,
            high,
            medium,
            low,
            acceptable
        };
    }
    logSecurityAssessment() {
        const recommendations = this.getSecurityRecommendations();
        this.logger.log('🔒 SRI Security Assessment Complete');
        this.logger.log(recommendations.summary);
        if (recommendations.critical.length > 0) {
            this.logger.error('🚨 Critical SRI Issues:');
            recommendations.critical.forEach(issue => this.logger.error(`  - ${issue}`));
        }
        if (recommendations.high.length > 0) {
            this.logger.warn('⚠️ High Priority SRI Issues:');
            recommendations.high.forEach(issue => this.logger.warn(`  - ${issue}`));
        }
        if (recommendations.medium.length > 0) {
            this.logger.warn('📋 Medium Priority SRI Issues:');
            recommendations.medium.forEach(issue => this.logger.warn(`  - ${issue}`));
        }
        if (recommendations.acceptable.length > 0) {
            this.logger.log('✅ Acceptable SRI Exceptions:');
            recommendations.acceptable.forEach(exception => this.logger.log(`  - ${exception}`));
        }
        this.logger.log('📚 For more information: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity');
    }
    shouldHaveSRI(resource) {
        const dynamicResourcePatterns = [
            /googletagmanager\.com/,
            /js\.stripe\.com/,
            /fonts\.googleapis\.com/
        ];
        return !dynamicResourcePatterns.some(pattern => pattern.test(resource.url));
    }
    getNoSRIReason(resource) {
        if (resource.url.includes('googletagmanager.com')) {
            return 'Google Analytics/GTM scripts are dynamically generated and updated';
        }
        if (resource.url.includes('js.stripe.com')) {
            return 'Stripe scripts are updated frequently and dynamically generated';
        }
        if (resource.url.includes('fonts.googleapis.com')) {
            return 'Google Fonts CSS is dynamically generated based on user agent';
        }
        return 'Dynamic content that changes frequently';
    }
    calculateSecurityRisk(resource) {
        if (!resource.url.startsWith('https://')) {
            return 'critical';
        }
        if (resource.isRequired && resource.type === 'script') {
            return 'high';
        }
        if (resource.type === 'script') {
            return 'medium';
        }
        return 'low';
    }
    generateSummary(results) {
        const total = results.length;
        const withSRI = results.filter(r => r.hasIntegrity).length;
        const applicable = results.filter(r => this.shouldHaveSRI(r.resource)).length;
        const acceptable = total - applicable;
        return `SRI Status: ${withSRI}/${applicable} applicable resources have SRI hashes. ${acceptable} resources have acceptable SRI exceptions.`;
    }
};
exports.SRIManager = SRIManager;
exports.SRIManager = SRIManager = SRIManager_1 = __decorate([
    (0, common_1.Injectable)()
], SRIManager);
