#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fast_glob_1 = require("fast-glob");
const server = new index_js_1.Server({
    name: 'project-tools-server',
    version: '2.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// 1. Django Health Check
async function djangoHealthCheck() {
    try {
        const backendPath = path.resolve(process.cwd(), '../backend');
        const checkOutput = (0, child_process_1.execSync)('python manage.py check --deploy', {
            cwd: backendPath
        }).toString();
        const migrateOutput = (0, child_process_1.execSync)('python manage.py showmigrations', {
            cwd: backendPath
        }).toString();
        const urlOutput = (0, child_process_1.execSync)('python manage.py show_urls', {
            cwd: backendPath
        }).toString();
        return {
            django_check: checkOutput.trim(),
            migrations: migrateOutput.trim(),
            urls: urlOutput.trim(),
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            error: error.message,
            stderr: error.stderr?.toString(),
            timestamp: new Date().toISOString()
        };
    }
}
// 2. DRF Schema Validator
async function drfSchemaValidator() {
    const baseUrl = 'http://localhost:8000';
    const endpoints = [
        { method: 'GET', url: '/api/meetings', expectedKeys: ['meeting_id', 'meeting_title', 'meeting_date'] },
        { method: 'GET', url: '/api/meetingsToday', expectedKeys: ['meeting_id'] },
        { method: 'GET', url: '/api/meetingsFuture', expectedKeys: ['meeting_id'] },
        { method: 'GET', url: '/api/meetingsPast', expectedKeys: ['meeting_id'] },
        { method: 'GET', url: '/api/departments', expectedKeys: ['department_id', 'department_name'] },
        { method: 'GET', url: '/api/employees', expectedKeys: ['employee_id', 'employee_name'] },
        { method: 'POST', url: '/api/meeting_files/', contentType: 'multipart/form-data' },
        { method: 'POST', url: '/api/analyse-comment/', expectedBody: { file_id: 'number' } },
        { method: 'POST', url: '/api/complaint-upload/', contentType: 'multipart/form-data' }
    ];
    const results = [];
    for (const endpoint of endpoints) {
        try {
            const config = {
                method: endpoint.method,
                url: baseUrl + endpoint.url,
                validateStatus: () => true,
                timeout: 5000,
                maxRedirects: 0
            };
            if (endpoint.expectedBody) {
                config.data = endpoint.expectedBody;
                config.headers = { 'Content-Type': 'application/json' };
            }
            const response = await (0, axios_1.default)(config);
            results.push({
                endpoint: endpoint.url,
                method: endpoint.method,
                status: response.status,
                redirected: response.status >= 300 && response.status < 400,
                location: response.headers.location,
                hasExpectedKeys: endpoint.expectedKeys && response.data ?
                    endpoint.expectedKeys.every(key => Array.isArray(response.data) ?
                        response.data[0] && key in response.data[0] :
                        key in response.data) : null,
                responseSize: JSON.stringify(response.data).length,
                contentType: response.headers['content-type']
            });
        }
        catch (error) {
            results.push({
                endpoint: endpoint.url,
                method: endpoint.method,
                error: error.message,
                code: error.code,
                timeout: error.code === 'ECONNABORTED'
            });
        }
    }
    return {
        endpoints: results,
        summary: {
            total: results.length,
            successful: results.filter(r => !r.error && r.status !== undefined && r.status < 400).length,
            redirects: results.filter(r => r.redirected).length,
            errors: results.filter(r => r.error).length
        },
        timestamp: new Date().toISOString()
    };
}
// 3. Supabase Storage Audit
async function supabaseStorageAudit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return {
            error: 'SUPABASE_URL or SUPABASE_KEY environment variables not set',
            required: ['SUPABASE_URL', 'SUPABASE_KEY']
        };
    }
    try {
        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        };
        // Check storage buckets
        const bucketsResponse = await axios_1.default.get(`${supabaseUrl}/storage/v1/bucket`, { headers });
        const buckets = bucketsResponse.data;
        const bucketStats = [];
        for (const bucket of buckets) {
            try {
                const filesResponse = await axios_1.default.post(`${supabaseUrl}/storage/v1/object/list/${bucket.name}`, {}, { headers });
                bucketStats.push({
                    name: bucket.name,
                    public: bucket.public,
                    fileCount: filesResponse.data?.length || 0,
                    accessible: true
                });
            }
            catch (error) {
                bucketStats.push({
                    name: bucket.name,
                    public: bucket.public,
                    accessible: false,
                    error: error.response?.status || error.message
                });
            }
        }
        // Check table accessibility
        const tables = ['business_data', 'processed_reports', 'userComment_data', 'employee'];
        const tableStats = [];
        for (const table of tables) {
            try {
                const response = await axios_1.default.get(`${supabaseUrl}/rest/v1/${table}?select=count&limit=1`, { headers });
                tableStats.push({
                    table,
                    accessible: true,
                    status: response.status
                });
            }
            catch (error) {
                tableStats.push({
                    table,
                    accessible: false,
                    error: error.response?.status || error.message
                });
            }
        }
        return {
            url: supabaseUrl,
            buckets: bucketStats,
            tables: tableStats,
            summary: {
                totalBuckets: buckets.length,
                accessibleBuckets: bucketStats.filter(b => b.accessible).length,
                accessibleTables: tableStats.filter(t => t.accessible).length
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            error: error.message,
            status: error.response?.status,
            timestamp: new Date().toISOString()
        };
    }
}
// 4. AI Service Monitor
async function aiServiceMonitor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        return {
            error: 'GEMINI_API_KEY environment variable not set',
            required: ['GEMINI_API_KEY']
        };
    }
    try {
        // Test Gemini API connectivity
        const testResponse = await axios_1.default.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            contents: [{ parts: [{ text: 'Hello, test connection' }] }]
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                key: geminiApiKey
            },
            timeout: 10000
        });
        return {
            gemini: {
                accessible: true,
                status: testResponse.status,
                responseTime: testResponse.headers['x-response-time'] || 'unknown',
                model: 'gemini-pro'
            },
            quota: {
                // Note: Gemini doesn't provide quota info in response headers
                info: 'Quota information not available via API'
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            gemini: {
                accessible: false,
                error: error.message,
                status: error.response?.status,
                quotaExceeded: error.response?.status === 429
            },
            timestamp: new Date().toISOString()
        };
    }
}
// 5. Data Quality Check
async function dataQualityCheck() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return { error: 'SUPABASE_URL or SUPABASE_KEY not set for data quality checks' };
    }
    try {
        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        };
        const issues = [];
        // Check for orphaned business_data records
        const businessDataResponse = await axios_1.default.get(`${supabaseUrl}/rest/v1/business_data?select=id,uploader,fileName`, { headers });
        const processedReportsResponse = await axios_1.default.get(`${supabaseUrl}/rest/v1/processed_reports?select=original_file_id`, { headers });
        const businessDataIds = businessDataResponse.data.map((d) => d.id);
        const processedFileIds = processedReportsResponse.data.map((r) => r.original_file_id);
        const orphanedFiles = businessDataIds.filter((id) => !processedFileIds.includes(id));
        if (orphanedFiles.length > 0) {
            issues.push({
                type: 'orphaned_business_data',
                count: orphanedFiles.length,
                description: 'Business data records without processed reports'
            });
        }
        // Check for missing employee references
        const employeeResponse = await axios_1.default.get(`${supabaseUrl}/rest/v1/employee?select=employee_id`, { headers });
        const validEmployeeIds = employeeResponse.data.map((e) => e.employee_id);
        const referencedEmployees = businessDataResponse.data.map((d) => d.uploader);
        const invalidRefs = referencedEmployees.filter((id) => !validEmployeeIds.includes(parseInt(id)));
        if (invalidRefs.length > 0) {
            issues.push({
                type: 'invalid_employee_references',
                count: invalidRefs.length,
                description: 'Records referencing non-existent employees'
            });
        }
        return {
            issues,
            summary: {
                totalIssues: issues.length,
                businessDataRecords: businessDataResponse.data.length,
                processedReports: processedReportsResponse.data.length,
                validEmployees: validEmployeeIds.length
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
// 6. Frontend Route Validator  
async function frontendRouteValidator() {
    try {
        const componentFiles = await (0, fast_glob_1.glob)('../frontend/src/components/**/*.{jsx,tsx}', {
            absolute: true
        });
        const issues = [];
        const params = new Set();
        for (const file of componentFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const useParamsMatches = content.match(/useParams\(\)\.(\w+)/g);
            if (useParamsMatches) {
                useParamsMatches.forEach(match => {
                    const param = match.replace('useParams().', '');
                    params.add(param);
                    if (param === 'meetingId') {
                        issues.push({
                            file: path.basename(file),
                            param,
                            line: content.split('\n').findIndex(line => line.includes(match)) + 1,
                            issue: 'Should use snake_case: meeting_id',
                            severity: 'warning'
                        });
                    }
                    if (param === 'complaintId') {
                        issues.push({
                            file: path.basename(file),
                            param,
                            line: content.split('\n').findIndex(line => line.includes(match)) + 1,
                            issue: 'Should use snake_case: complaint_id',
                            severity: 'warning'
                        });
                    }
                });
            }
            // Check for navigate calls with dynamic routes
            const navigateMatches = content.match(/navigate\([`'"](.*?)[`'"]\)/g);
            if (navigateMatches) {
                navigateMatches.forEach(match => {
                    if (match.includes('${') && match.includes('/')) {
                        const route = match.match(/[`'"]([^`'"]*)[`'"]/)?.[1];
                        if (route) {
                            params.add('dynamic_route');
                            if (route.includes('${') && !route.includes('meeting_id') && route.includes('meeting')) {
                                issues.push({
                                    file: path.basename(file),
                                    route,
                                    issue: 'Dynamic route may not match useParams convention',
                                    severity: 'error'
                                });
                            }
                        }
                    }
                });
            }
        }
        return {
            filesScanned: componentFiles.length,
            paramsFound: Array.from(params),
            issues,
            summary: {
                totalIssues: issues.length,
                warnings: issues.filter(i => i.severity === 'warning').length,
                errors: issues.filter(i => i.severity === 'error').length
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
// 7. Auth Flow Tester
async function authFlowTester() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return { error: 'Supabase credentials required for auth testing' };
    }
    try {
        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        };
        // Test anonymous access to employee table
        const anonTest = await axios_1.default.get(`${supabaseUrl}/rest/v1/employee?select=employee_id&limit=1`, { headers: { 'apikey': supabaseKey } });
        // Test authenticated access
        const authTest = await axios_1.default.get(`${supabaseUrl}/rest/v1/employee?select=employee_id,email&limit=1`, { headers });
        // Test RLS policies
        const rlsTest = await axios_1.default.get(`${supabaseUrl}/rest/v1/business_data?select=id&limit=1`, { headers });
        return {
            anonymousAccess: {
                accessible: anonTest.status === 200,
                status: anonTest.status,
                recordCount: anonTest.data?.length || 0
            },
            authenticatedAccess: {
                accessible: authTest.status === 200,
                status: authTest.status,
                recordCount: authTest.data?.length || 0
            },
            rlsPolicies: {
                businessDataAccessible: rlsTest.status === 200,
                status: rlsTest.status
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            error: error.message,
            status: error.response?.status,
            timestamp: new Date().toISOString()
        };
    }
}
// 8. Deployment Readiness Check
async function deploymentCheck() {
    const checks = [];
    const envCheck = {
        name: 'environment_variables',
        status: 'pass',
        details: []
    };
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            envCheck.status = 'fail';
            envCheck.details.push(`Missing: ${envVar}`);
        }
        else {
            envCheck.details.push(`Present: ${envVar}`);
        }
    }
    checks.push(envCheck);
    // Django static files check
    try {
        const staticPath = path.resolve(process.cwd(), '../backend/static');
        const staticExists = fs.existsSync(staticPath);
        checks.push({
            name: 'static_files',
            status: staticExists ? 'pass' : 'warning',
            details: staticExists ? 'Static directory exists' : 'Static directory not found'
        });
    }
    catch (error) {
        checks.push({
            name: 'static_files',
            status: 'fail',
            details: error.message
        });
    }
    // Package.json dependencies
    try {
        const frontendPackage = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../frontend/package.json'), 'utf-8'));
        const backendRequirements = fs.existsSync(path.resolve(process.cwd(), '../backend/requirements.txt'));
        checks.push({
            name: 'dependencies',
            status: 'pass',
            details: {
                frontend_deps: Object.keys(frontendPackage.dependencies || {}).length,
                backend_requirements: backendRequirements
            }
        });
    }
    catch (error) {
        checks.push({
            name: 'dependencies',
            status: 'fail',
            details: error.message
        });
    }
    // Overall status
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warningChecks = checks.filter(c => c.status === 'warning');
    return {
        checks,
        summary: {
            total: checks.length,
            passed: checks.filter(c => c.status === 'pass').length,
            warnings: warningChecks.length,
            failed: failedChecks.length,
            deploymentReady: failedChecks.length === 0
        },
        timestamp: new Date().toISOString()
    };
}
// Register all original and new tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            // Original tools
            {
                name: 'drf_probe',
                description: 'Test Django REST Framework endpoints for status, redirects, and response structure',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'Full URL to test' },
                        method: { type: 'string', description: 'HTTP method (GET, POST, PATCH, etc.)', default: 'GET' },
                        body: { type: 'object', description: 'Request body for POST/PATCH' },
                        headers: { type: 'object', description: 'Additional headers' }
                    },
                    required: ['url']
                }
            },
            {
                name: 'django_urls_audit',
                description: 'Scan Django urls.py for common issues like double slashes and missing converters',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'frontend_route_check',
                description: 'Check React components for useParams consistency and route mismatches',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'supabase_audit',
                description: 'Check Supabase table accessibility and basic stats',
                inputSchema: { type: 'object', properties: {} }
            },
            // New enhanced tools
            {
                name: 'djangoHealthCheck',
                description: 'Run Django system checks, migrations status, and URL validation',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'drfSchemaValidator',
                description: 'Comprehensive API endpoint testing with schema validation',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'supabaseStorageAudit',
                description: 'Advanced Supabase storage buckets and table accessibility audit',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'aiServiceMonitor',
                description: 'Monitor AI services (Gemini API) connectivity and health',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'dataQualityCheck',
                description: 'Validate data integrity and find orphaned records',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'frontendRouteValidator',
                description: 'Advanced React Router and useParams consistency validation',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'authFlowTester',
                description: 'Test authentication flows and RLS policies',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'deploymentCheck',
                description: 'Pre-deployment readiness validation',
                inputSchema: { type: 'object', properties: {} }
            }
        ]
    };
});
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        switch (name) {
            // Original tools (keep existing implementations)
            case 'drf_probe':
                result = await drfProbe(args);
                break;
            case 'django_urls_audit':
                result = djangoUrlsAudit();
                break;
            case 'frontend_route_check':
                result = await frontendRouteCheck();
                break;
            case 'supabase_audit':
                result = await supabaseAudit();
                break;
            // New enhanced tools
            case 'djangoHealthCheck':
                result = await djangoHealthCheck();
                break;
            case 'drfSchemaValidator':
                result = await drfSchemaValidator();
                break;
            case 'supabaseStorageAudit':
                result = await supabaseStorageAudit();
                break;
            case 'aiServiceMonitor':
                result = await aiServiceMonitor();
                break;
            case 'dataQualityCheck':
                result = await dataQualityCheck();
                break;
            case 'frontendRouteValidator':
                result = await frontendRouteValidator();
                break;
            case 'authFlowTester':
                result = await authFlowTester();
                break;
            case 'deploymentCheck':
                result = await deploymentCheck();
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`
                }
            ],
            isError: true
        };
    }
});

async function drfProbe(params) {
    const { url, method = 'GET', body, headers = {} } = params;
    try {
        const response = await (0, axios_1.default)({
            url,
            method,
            data: body,
            headers: { 'Content-Type': 'application/json', ...headers },
            validateStatus: () => true,
            maxRedirects: 0
        });
        return {
            status: response.status,
            url: response.config.url,
            redirected: response.status === 301 || response.status === 302,
            location: response.headers.location,
            data: response.data,
            size: JSON.stringify(response.data).length
        };
    }
    catch (error) {
        return { error: error.message, code: error.code };
    }
}
function djangoUrlsAudit() {
    try {
        const urlsPath = path.resolve(process.cwd(), '../backend/urls.py');
        if (!fs.existsSync(urlsPath)) {
            return { error: 'urls.py not found at ../backend/urls.py' };
        }
        const content = fs.readFileSync(urlsPath, 'utf-8');
        const issues = [];
        const fixes = [];
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes('path(') && line.includes('//')) {
                issues.push({
                    line: idx + 1,
                    content: line.trim(),
                    problem: 'Double slashes in URL pattern',
                    suggestion: 'Replace // with proper path converter like <int:pk>/ or <str:param>/'
                });
            }
            const pathMatch = line.match(/path\('([^']+)'/);
            if (pathMatch) {
                const pattern = pathMatch[1];
                if (pattern.includes('//')) {
                    const fixed = pattern.replace('//', '/<int:pk>/');
                    fixes.push({
                        line: idx + 1,
                        original: pattern,
                        suggested: fixed
                    });
                }
            }
        });
        return { file: urlsPath, issues, fixes, totalLines: lines.length };
    }
    catch (error) {
        return { error: error.message };
    }
}
async function frontendRouteCheck() {
    try {
        const componentFiles = await (0, fast_glob_1.glob)('../frontend/src/components/**/*.{jsx,tsx}', { absolute: true });
        const issues = [];
        const params = new Set();
        for (const file of componentFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const useParamsMatches = content.match(/useParams\(\)\.(\w+)/g);
            if (useParamsMatches) {
                useParamsMatches.forEach(match => {
                    const param = match.replace('useParams().', '');
                    params.add(param);
                    if (param === 'meetingId' || param === 'meeting_id') {
                        issues.push({
                            file: path.basename(file),
                            param,
                            line: content.split('\n').findIndex(line => line.includes(match)) + 1,
                            suggestion: param === 'meetingId' ? 'Use meeting_id for consistency' : 'Ensure Router path uses :meeting_id'
                        });
                    }
                });
            }
        }
        return { filesScanned: componentFiles.length, paramsFound: Array.from(params), issues };
    }
    catch (error) {
        return { error: error.message };
    }
}
async function supabaseAudit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return { error: 'SUPABASE_URL or SUPABASE_KEY environment variables not set' };
    }
    try {
        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        };
        const tables = ['business_data', 'processed_reports', 'userComment_data'];
        const results = {};
        for (const table of tables) {
            try {
                const response = await axios_1.default.get(`${supabaseUrl}/rest/v1/${table}?select=count`, { headers });
                results[table] = { accessible: true, count: response.data?.length || 0 };
            }
            catch (error) {
                results[table] = { accessible: false, error: error.response?.status || error.message };
            }
        }
        return { url: supabaseUrl, tables: results, timestamp: new Date().toISOString() };
    }
    catch (error) {
        return { error: error.message };
    }
}

async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('Enhanced Project Tools MCP Server v2.0 running on stdio');
}
main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
