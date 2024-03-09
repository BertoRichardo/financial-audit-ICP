import { getDefaultAgent } from '@dfinity/agent';
import {
  Canister,
  query,
  text,
  update,
  Result,
  Principal,
  StableBTreeMap,
  nat64,
  Vec,
  int64,
  ic,
  int8,
} from 'azle';
import { v4 as uuidv4 } from 'uuid';

// Enum for user roles
enum Role {
  Executive = 'management',
  Auditor = 'auditor',
  DivisionManager = 'division_manager',
}

// Enum for request status
enum Status {
  Waiting = 0,
  Accepted = 1,
  Rejected = 2,
}

// Record type for User entity
const User = Record({
  id: Principal,
  role: text,
  relatedId: text,
  createdAt: nat64,
});

// Record type for Company entity
const Company = Record({
  id: Principal,
  name: text,
  category: text,
  address: text,
  city: text,
  province: text,
  country: text,
  postalCode: text,
  email: text,
  telpNo: int64,
  divNameList: Vec(text),
  createdAt: nat64,
  updatedAt: nat64,
});

// Record type for creating a Company (payload)
const CompanyPayload = Record({
  name: text,
  category: text,
  address: text,
  city: text,
  province: text,
  country: text,
  postalCode: text,
  email: text,
  telpNo: int64,
  divNameList: Vec(text),
});

// Record type for Division entity
const Division = Record({
  id: Principal,
  companyId: text,
  divisionName: text,
  verifiedAt: nat64,
});

// Record type for Auditor entity
const Auditor = Record({
  id: Principal,
  companyId: text,
  verifiedAt: nat64,
});

// Record type for Request entity
const Request = Record({
  id: Principal,
  userId: text,
  role: text,
  status: int8,
  companyId: text,
  divisionName: text,
  createdAt: nat64,
});

// Record type for FinancialStatement entity
const FinancialStatement = Record({
  id: Principal,
  companyId: text,
  URL: text,
  uploadedBy: text,
  uploadedAt: nat64,
});

// Record type for AuditStatement entity
const AuditStatement = Record({
  id: Principal,
  companyId: text,
  URL: text,
  uploadedBy: text,
  uploadedAt: nat64,
});

// Storage for different entities
const userStorage = StableBTreeMap(Principal, User, 0);
const companyStorage = StableBTreeMap(Principal, Company, 1);
const divisionStorage = StableBTreeMap(Principal, Division, 2);
const auditorStorage = StableBTreeMap(Principal, Auditor, 3);
const requestStorage = StableBTreeMap(Principal, Request, 4);
const financialStatementStorage = StableBTreeMap(Principal, FinancialStatement, 5);
const auditStatementStorage = StableBTreeMap(Principal, AuditStatement, 6);

export default Canister({
  /**
   * Create a new company.
   * @param companyPayload - Payload for creating a new company.
   * @returns Result indicating success or failure.
   */
  createCompany: update([CompanyPayload], Result(text, text), (companyPayload) => {
    // Validate payload
    if (!companyPayload.name || !companyPayload.category) {
      return Result.Err('Bad payload');
    }

    // Generate unique IDs
    const userId = uuidv4();
    const companyId = uuidv4();

    // Create a new user account
    const newAccount: typeof User = {
      id: Principal.fromText(userId),
      role: Role.Executive,
      relatedId: companyId,
      createdAt: ic.time(),
    };

    // Create a new company
    const newCompany: typeof Company = {
      id: Principal.fromText(companyId),
      createdAt: ic.time(),
      updatedAt: ic.time(),
      ...companyPayload,
    };

    // Insert data into storage
    userStorage.insert(newAccount.id, newAccount);
    companyStorage.insert(newCompany.id, newCompany);

    return Result.Ok('Company created successfully');
  }),

  /**
   * Update an existing company.
   * @param id - ID of the company to update.
   * @param payload - Payload with updated company information.
   * @returns Result indicating success or failure.
   */
  updateCompany: update([text, CompanyPayload], Result(text, text), (id, payload) => {
    // Validate payload
    if (!id) {
      return Result.Err('Bad payload');
    }

    // Retrieve existing company data
    const company = companyStorage.get(id);
    if ('None' in company) {
      return Result.Err('Company not found');
    }
    const companyData: typeof Company = company.Some;

    // Create updated company data
    const newCompanyData: typeof Company = {
      id: Principal.fromText(id),
      createdAt: companyData.createdAt,
      updatedAt: ic.time(),
      ...payload,
    };

    // Update company in storage
    companyStorage.insert(newCompanyData.id, newCompanyData);

    return Result.Ok('Company updated successfully');
  }),

  /**
   * Get information about a specific company.
   * @param id - ID of the company to retrieve.
   * @returns Result containing company information or an error message.
   */
  getCompany: query([Principal], Result(Company, text), (id) => {
    // Validate payload
    if (!id) {
      return Result.Err('Bad payload');
    }

    // Retrieve company data
    const company = companyStorage.get(id);
    if ('None' in company) {
      return Result.Err('Company not found');
    }
    const companyData: typeof Company = company.Some;

    return Result.Ok(companyData);
  }),

  /**
   * Create a request for a new division.
   * @param companyId - ID of the company for which the division is requested.
   * @param divName - Name of the division.
   * @returns Result indicating success or failure.
   */
  createDivisionRequest: update([text, text], Result(text, text), (companyId, divName) => {
    // Validate payload
    if (!companyId || !divName) {
      return Result.Err('Bad payload');
    }

    // Retrieve company data
    const company = companyStorage.get(Principal.fromText(companyId));
    if ('None' in company) {
      return Result.Err('Company not found');
    }
    const companyData: typeof Company = company.Some;

    // Generate unique IDs
    const userId = uuidv4();
    const requestId = uuidv4();

    // Create a new user for division manager
    const newUser: typeof User = {
      id: Principal.fromText(userId),
      role: Role.DivisionManager,
      relatedId: '',
      createdAt: ic.time(),
    };

    // Create a new request for division
    const newRequest: typeof Request = {
      id: Principal.fromText(requestId),
      userId,
      role: Role.DivisionManager,
      status: Status.Waiting,
      companyId,
      divisionName: divName,
      createdAt: ic.time(),
    };

    // Insert data into storage
    userStorage.insert(newUser.id, newUser);
    requestStorage.insert(newRequest.id, newRequest);

    return Result.Ok('Division request successfully created');
  }),

  /**
   * Create a request for a new auditor.
   * @param companyId - ID of the company for which the auditor is requested.
   * @returns Result indicating success or failure.
   */
  createAuditorRequest: update([text], Result(text, text), (companyId) => {
    // Validate payload
    if (!companyId) {
      return Result.Err('Bad payload');
    }

    // Retrieve company data
    const company = companyStorage.get(Principal.fromText(companyId));
    if ('None' in company) {
      return Result.Err('Company not found');
    }

    // Generate unique IDs
    const userId = uuidv4();
    const requestId = uuidv4();

    // Create a new user for auditor
    const newUser: typeof User = {
      id: Principal.fromText(userId),
      role: Role.Auditor,
      relatedId: '',
      createdAt: ic.time(),
    };

    // Create a new request for auditor
    const newRequest: typeof Request = {
      id: Principal.fromText(requestId),
      userId,
      role: Role.Auditor,
      status: Status.Waiting,
      companyId,
      divisionName: 'auditor',
      createdAt: ic.time(),
    };

    // Insert data into storage
    userStorage.insert(newUser.id, newUser);
    requestStorage.insert(newRequest.id, newRequest);

    return Result.Ok('Auditor request successfully created');
  }),

  /**
   * Get all requests associated with a user.
   * @param userId - ID of the user.
   * @returns Result containing a list of requests or an error message.
   */
  getAllRequests: query([text], Result(Vec(Request), text), (userId) => {
    // Validate payload
    if (!userId) {
      return Result.Err('Bad payload');
    }

    // Retrieve user data
    const user = userStorage.get(Principal.fromText(userId));
    if ('None' in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;

    // Check user role
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    // Retrieve requests for the associated company
    const requests = requestStorage.values().find((a: typeof Request) => a.companyId === userData.relatedId);

    return Result.Ok(requests);
  }),

  /**
   * Get waiting requests associated with a user.
   * @param userId - ID of the user.
   * @returns Result containing a list of waiting requests or an error message.
   */
  getWaitingRequests: query([text], Result(Vec(Request), text), (userId) => {
    // Validate payload
    if (!userId) {
      return Result.Err('Bad payload');
    }

    // Retrieve user data
    const user = userStorage.get(Principal.fromText(userId));
    if ('None' in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;

    // Check user role
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    // Retrieve waiting requests for the associated company
    const requests = requestStorage.values().find((a: typeof Request) => a.companyId === userData.relatedId && a.status === Status.Waiting);

    return Result.Ok(requests);
  }),

  /**
   * Accept a request.
   * @param userId - ID of the user accepting the request.
   * @param requestId - ID of the request to accept.
   * @returns Result indicating success or failure.
   */
  acceptRequest: update([text, text], Result(text, text), (userId, requestId) => {
    // Validate payload
    if (!userId) {
      return Result.Err('Bad payload');
    }

    // Retrieve user data
    const user = userStorage.get(Principal.fromText(userId));
    if ('None' in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;

    // Check user role
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    // Retrieve request data
    const request = requestStorage.get(Principal.fromText(requestId));
    if ('None' in request) {
      return Result.Err('No request found');
    }
    const requestData: typeof Request = request.Some;

    // Check if the user has access to the request
    if (requestData.companyId !== userData.relatedId) {
      return Result.Err('You have no access to this resource');
    }

    // Process request based on the role
    if (requestData.role === Role.DivisionManager) {
      // Generate unique ID for division
      const divId = uuidv4();

      // Create new division data
      const newDivision: typeof Division = {
        id: Principal.fromText(divId),
        companyId: userData.relatedId,
        divisionName: requestData.divisionName,
        verifiedAt: ic.time(),
      };

      // Retrieve related user data
      const relatedUser = userStorage.get(Principal.fromText(requestData.userId));
      if ('None' in relatedUser) {
        return Result.Err('User not found');
      }
      const relatedUserData: typeof User = relatedUser.Some;

      // Update user data
      const newUserData: typeof User = {
        id: relatedUserData.id,
        role: Role.DivisionManager,
        relatedId: divId,
        createdAt: relatedUserData.createdAt,
      };

      // Insert data into storage
      divisionStorage.insert(newDivision.id, newDivision);
      userStorage.insert(newUserData.id, newUserData);
    } else {
      // Generate unique ID for auditor
      const auditorId = uuidv4();

      // Create new auditor data
      const newAuditor: typeof Auditor = {
        id: Principal.fromText(auditorId),
        companyId: userData.relatedId,
        verifiedAt: ic.time(),
      };

      // Retrieve related user data
      const relatedUser = userStorage.get(Principal.fromText(requestData.userId));
      if ('None' in relatedUser) {
        return Result.Err('User not found');
      }
      const relatedUserData: typeof User = relatedUser.Some;

      // Update user data
      const newUserData: typeof User = {
        id: relatedUserData.id,
        role: Role.DivisionManager,
        relatedId: auditorId,
        createdAt: relatedUserData.createdAt,
      };

      // Insert data into storage
      auditorStorage.insert(newAuditor.id, newAuditor);
      userStorage.insert(newUserData.id, newUserData);
    }

    return Result.Ok('Request successfully accepted');
  }),

  /**
   * Reject a request.
   * @param userId - ID of the user rejecting the request.
   * @param requestId - ID of the request to reject.
   * @returns Result indicating success or failure.
   */
  rejectRequest: update([text, text], Result(text, text), (userId, requestId) => {
    // Validate payload
    if (!userId) {
      return Result.Err('Bad payload');
    }

    // Retrieve user data
    const user = userStorage.get(Principal.fromText(userId));
    if ('None' in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;

    // Check user role
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    // Retrieve request data
    const request = requestStorage.get(Principal.fromText(requestId));
    if ('None' in request) {
      return Result.Err('No request found');
    }
    const requestData: typeof Request = request.Some;

    // Check if the user has access to the request
    if (requestData.companyId !== userData.relatedId) {
      return Result.Err('You have no access to this resource');
    }

    // Create new request data with status rejected
    const newRequestData: typeof Request = {
      id: requestData.id,
      userId: requestData.userId,
      role: requestData.role,
      status: Status.Rejected,
      companyId: userData.relatedId,
      divisionName: requestData.divisionName,
      createdAt: requestData.createdAt,
    };

    // Update request in storage
    requestStorage.insert(newRequestData.id, newRequestData);

    return Result.Ok('Request successfully rejected');
  }),

  /**
   * Upload a financial statement.
   * @param userId - ID of the division manager uploading the statement.
   * @param URL - URL of the financial statement.
   * @returns Result indicating success or failure.
   */
  uploadFinancialStatement: update([text, text], Result(text, text), (userId, URL) => {
    // Validate payload
    if (!userId || !URL) {
      return Result.Err('Bad payload');
    }

    // Retrieve user data
    const user = userStorage.get(Principal.fromText(userId));
    if ('None' in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;

    // Check user role
    if (userData.role !== Role.DivisionManager) {
      return Result.Err('Fail to upload financial statement');
    }

    // Retrieve division data
    const division = divisionStorage.get(Principal.fromText(userData.relatedId));
    if ('None' in division) {
      return Result.Err('Error');
    }
    const divisionData: typeof Division = division.Some;

    // Create new financial statement data
    const newFinStatement: typeof FinancialStatement = {
      id: Principal.fromText(uuidv4()),
      companyId: divisionData.companyId,
      URL,
      uploadedBy: divisionData.id.toText(),
      uploadedAt: ic.time(),
    };

    // Insert data into storage
    financialStatementStorage.insert(newFinStatement.id, newFinStatement);

    return Result.Ok('Successfully uploaded financial statement');
  }),

  /**
   * Upload an audit statement.
   * @param userId - ID of the auditor uploading the statement.
   * @param URL - URL of the audit statement.
   * @returns Result indicating success or failure.
   */
  uploadAuditStatement: update([text, text], Result(text, text), (userId, URL) => {
    // Validate payload
    if (!userId || !URL) {
      return Result.Err('Bad payload');
    }

    // Retrieve user data
    const user = userStorage.get(Principal.fromText(userId));
    if ('None' in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;

    // Check user role
    if (userData.role !== Role.Auditor) {
      return Result.Err('Fail to upload audit statement');
    }

    // Retrieve auditor data
    const auditor = auditorStorage.get(Principal.fromText(userData.relatedId));
    if ('None' in auditor) {
      return Result.Err('Error');
    }
    const auditorData: typeof Division = auditor.Some;

    // Create new audit statement data
    const newAuditStatement: typeof AuditStatement = {
      id: Principal.fromText(uuidv4()),
      companyId: auditorData.companyId,
      URL,
      uploadedBy: auditorData.id.toText(),
      uploadedAt: ic.time(),
    };

    // Insert data into storage
    auditStatementStorage.insert(newAuditStatement.id, newAuditStatement);

    return Result.Ok('Successfully uploaded audit statement');
  }),
});
