/**
 * Test Utilities Index
 *
 * Central export point for all test utility modules.
 * Import from '@/test/utilities' for convenience.
 */

// DTO Testing
export {
  validateDTO,
  expectValidDTO,
  expectDTOError,
  expectDTOTransforms,
  expectDTOComputed,
  createDTOTestBatch,
  runDTOBatchTests,
  compareDTOs,
  createPartialDTO,
  expectCompleteDTO,
  createDTOFactory,
  type DTOTestResult,
  type DTOTestCase
} from './dto-test.utils'

// Service Testing
export {
  createServiceTestBed,
  createMockDataLayer,
  verifyDataLayerCall,
  createSupabaseErrorStub,
  runServiceScenarios,
  createMockRequest,
  expectServiceCall,
  createServiceTestHelper,
  type ServiceTestBed,
  type ServiceScenario
} from './service-test.utils'

// Controller Testing
export {
  createControllerTest,
  expectHTTPResponse,
  expectErrorResponse,
  createAuthenticatedRequest,
  createMockResponse,
  ControllerCacheTest,
  expectPaginatedResponse,
  uploadFile,
  type ControllerTestBed,
  type ControllerTestResult,
  type HTTPResponseExpectation,
  type ErrorResponseExpectation,
  type PaginationExpectation
} from './controller-test.utils'

// Data Layer Testing
export {
  createSupabaseRPCResponse,
  createSupabaseRPCError,
  createMockSupabaseClient,
  expectRPCCall,
  runDataLayerScenarios,
  RLSEnforcementTest,
  N1QueryTest,
  createDataLayerResponseFactory,
  expectDataLayerPagination,
  createBatchOperationMock,
  type SupabaseRPCResponse,
  type DataLayerScenario,
  type DataLayerPaginationExpectation
} from './data-layer-test.utils'
