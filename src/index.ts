import { getDefaultAgent } from '@dfinity/agent';
import { Canister, query, text, update, Void, Vec, Record, StableBTreeMap, Result, nat64, float64, ic, Opt, Principal, AzleResult, Ok, Err, int8, bool, int64, int16, int32} from 'azle';
import { v4 as uuidv4 } from 'uuid';

enum Role {
  Executive = "management",
  Auditor = "auditor",
  DivisionManager = "division_manager"
}

enum Status {
  waiting = 0,
  accepted = 1,
  rejected = 2,
}

const User = Record({
  id: Principal,
  role: text,
  relatedId: text, // can be company, division or auditor\
  createdAt: nat64
});

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
  divNameList: Vec(text)
});

const Division = Record({
  id: Principal,
  companyId: text,
  divisionName: text,
  verifiedAt: nat64,
});

const Auditor = Record({
  id: Principal,
  companyId: text,
  verifiedAt: nat64,
});

const Request = Record({
  id: Principal,
  userId: text,
  role: text,
  status: int8,
  companyId: text,
  divisionName: text,
  createdAt: nat64
});

const FinancialStatement = Record({
  id: Principal,
  companyId: text,
  URL: text,
  uploadedBy: text,
  uploadedAt: nat64,
});

const AuditStatement = Record({
  id: Principal,
  companyId: text,
  URL: text,
  uploadedBy: text,
  uploadedAt: nat64
});

const userStorage = StableBTreeMap(Principal, User, 0);
const companyStorage = StableBTreeMap(Principal, Company, 1);
const divisionStorage = StableBTreeMap(Principal, Division, 2);
const auditorStorage = StableBTreeMap(Principal, Auditor, 3);
const requestStorage = StableBTreeMap(Principal, Request, 4);
const financialStatementStorage = StableBTreeMap(Principal, FinancialStatement, 5);
const auditStatementStorage = StableBTreeMap(Principal, AuditStatement, 6);

export default Canister({
  createCompany: update([CompanyPayload], Result(text, text), (companyPayload) => {
    if (!companyPayload.name || !companyPayload.category) {
      return Result.Err('Bad payload');
    }
    const userId = uuidv4();
    const companyId = uuidv4();
    const newAccount: typeof User = {
      id: Principal.fromText(userId),
      role: Role.Executive,
      relatedId: companyId,
      createdAt: ic.time(),
    };
    const newCompany: typeof Company = {
      id: Principal.fromText(companyId),
      createdAt: ic.time(),
      updatedAt: ic.time(),
      ...companyPayload
    };
    userStorage.insert(newAccount.id, newAccount);
    companyStorage.insert(newCompany.id, newCompany);
    return Result.Ok('Company created successfully');
  }),

  updateCompany: update([text, CompanyPayload], Result(text, text), (id, payload) => {
    if (!id) {
      return Result.Err('Bad payload');
    }

    const company = companyStorage.get(id);
    if ("None" in company) {
      return Result.Err('Company not found');
    }
    const companyData: typeof Company = company.Some;

    const newCompanyData: typeof Company = {
      id: Principal.fromText(id),
      createdAt:  companyData.createdAt,
      updatedAt: ic.time(),
      ...payload,
    };

    companyStorage.insert(newCompanyData.id, newCompanyData);
    return Result.Ok('Company updated successfully');
  }),

  getCompany: query([Principal], Result(Company, text), (id) => {
    if (!id) {
      return Result.Err('Bad payload');
    }
    const company = companyStorage.get(id);
    if ("None" in company) {
      return Result.Err('Company not found');
    }
    const companyData: typeof Company = company.Some;
    return Result.Ok(companyData);
  }),

  createDivisionRequest: update([text, text], Result(text, text), (companyId, divName) => {
    if (!companyId || !divName) {
      return Result.Err('Bad payload');
    }

    const company = companyStorage.get(Principal.fromText(companyId));
    if ("None" in company) {
      return Result.Err('Company not found');
    }
    const companyData: typeof Company = company.Some;

    const userId = uuidv4();
    const newUser: typeof User = {
      id: Principal.fromText(userId),
      role: Role.DivisionManager,
      relatedId: "",
      createdAt: ic.time(),
    };
    userStorage.insert(newUser.id, newUser);

    const requestId = uuidv4();
    const newRequest: typeof Request = {
      id: Principal.fromText(requestId),
      userId,
      role: Role.DivisionManager,
      status: Status.waiting,
      companyId,
      divisionName: divName,
      createdAt: ic.time(),
    }
    requestStorage.insert(newRequest.id, newRequest);
    return Result.Ok('Division request successfully created');
  }),

  createAuditorRequest: update([text], Result(text, text), (companyId) => {
    if (!companyId) {
      return Result.Err('Bad payload');
    }
    const company = companyStorage.get(Principal.fromText(companyId));
    if ("None" in company) {
      return Result.Err('Company not found');
    }

    const userId = uuidv4();
    const newUser: typeof User = {
      id: Principal.fromText(userId),
      role: Role.Auditor,
      relatedId: "",
      createdAt: ic.time(),
    }
    userStorage.insert(newUser.id, newUser);

    const requestId = uuidv4();
    const newRequest: typeof Request = {
      id: Principal.fromText(requestId),
      userId,
      role: Role.Auditor,
      status: Status.waiting,
      companyId,
      divisionName: "auditor",
      createdAt: ic.time()
    }
    requestStorage.insert(newRequest.id, newRequest);
    return Result.Ok('Auditor request successfully created');
  }),

  getAllRequests: query([text], Result(Vec(Request), text), (userId) => {
    if (!userId) {
      return Result.Err('Bad payload');
    }
    // get user data
    const user = userStorage.get(Principal.fromText(userId));
    if ("None" in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    const requests = requestStorage.values().find((a: typeof Request) => a.companyId === userData.relatedId);
    return Result.Ok(requests);
  }),

  getWaitingRequests: query([text], Result(Vec(Request), text), (userId) => {
    if (!userId) {
      return Result.Err('Bad payload');
    }
    // get user data
    const user = userStorage.get(Principal.fromText(userId));
    if ("None" in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    const requests = requestStorage.values().find((a: typeof Request) => a.companyId === userData.relatedId && a.status === Status.waiting);
    return Result.Ok(requests);
  }),

  acceptRequest: update([text, text], Result(text, text), (userId, requestId) => {
    if (!userId) {
      return Result.Err('Bad payload');
    }
    // get user data
    const user = userStorage.get(Principal.fromText(userId));
    if ("None" in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    const request = requestStorage.get(Principal.fromText(requestId));
    if ("None" in request) {
      return Result.Err('No request found');
    }
    const requestData: typeof Request = request.Some;
    if (requestData.companyId !== userData.relatedId) {
      return Result.Err('You have no access to this resource');
    }

    if (requestData.role === Role.DivisionManager) {
      const divId = uuidv4();
      // new division data
      const newDivision: typeof Division = {
        id: Principal.fromText(divId),
        companyId: userData.relatedId,
        divisionName: requestData.divisionName,
        verifiedAt: ic.time(),
      }
      const relatedUser = userStorage.get(Principal.fromText(requestData.userId));
      if ("None" in relatedUser) {
        return Result.Err('User not found');
      }
      const relatedUserData: typeof User = relatedUser.Some;
      // updated user data
      const newUserData: typeof User = {
        id: relatedUserData.id,
        role: Role.DivisionManager,
        relatedId: divId,
        createdAt: relatedUserData.createdAt
      }

      // insert data
      divisionStorage.insert(newDivision.id, newDivision);
      userStorage.insert(newUserData.id, newUserData);
    }
    else {
      const auditorId = uuidv4();
      // new division data
      const newAuditor: typeof Auditor = {
        id: Principal.fromText(auditorId),
        companyId: userData.relatedId,
        verifiedAt: ic.time(),
      }
      const relatedUser = userStorage.get(Principal.fromText(requestData.userId));
      if ("None" in relatedUser) {
        return Result.Err('User not found');
      }
      const relatedUserData: typeof User = relatedUser.Some;
      // updated user data
      const newUserData: typeof User = {
        id: relatedUserData.id,
        role: Role.DivisionManager,
        relatedId: auditorId,
        createdAt: relatedUserData.createdAt
      }

      // insert data
      auditorStorage.insert(newAuditor.id, newAuditor);
      userStorage.insert(newUserData.id, newUserData);
    }
    return Result.Ok('Request successfully accepted');
  }),

  rejectRequest: update([text, text], Result(text, text), (userId, requestId) => {
    if (!userId) {
      return Result.Err('Bad payload');
    }
    // get user data
    const user = userStorage.get(Principal.fromText(userId));
    if ("None" in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;
    if (userData.role !== Role.Executive) {
      return Result.Err('You have no access to this resource');
    }

    const request = requestStorage.get(Principal.fromText(requestId));
    if ("None" in request) {
      return Result.Err('No request found');
    }
    const requestData: typeof Request = request.Some;
    if (requestData.companyId !== userData.relatedId) {
      return Result.Err('You have no access to this resource');
    }

    const newRequestData: typeof Request = {
      id: requestData.id,
      userId: requestData.userId,
      role: requestData.role,
      status: Status.rejected,
      companyId: userData.relatedId,
      divisionName: requestData.divisionName,
      createdAt: requestData.createdAt
    }

    requestStorage.insert(newRequestData.id, newRequestData);
    return Result.Ok('Request successfully rejected');
  }),

  uploadFinancialStatement: update([text, text], Result(text, text), (userId, URL) => {
    if (!userId || !URL) {
      return Result.Err('Bad payload');
    }

    const user = userStorage.get(Principal.fromText(userId));
    if ("None" in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;
    if (userData.role !== Role.DivisionManager) {
      return Result.Err('Fail to upload financial statement');
    }

    const division = divisionStorage.get(Principal.fromText(userData.relatedId));
    if ("None" in division) {
      return Result.Err('Error');
    }
    const divisionData: typeof Division = division.Some;
    
    const newFinStatement: typeof FinancialStatement = {
      id: Principal.fromText(uuidv4()),
      companyId: divisionData.companyId,
      URL,
      uploadedBy: divisionData.id.toText(),
      uploadedAt: ic.time(),
    }

    financialStatementStorage.insert(newFinStatement.id, newFinStatement);
    return Result.Ok('Successfully uploaded financial statement');
  }),

  uploadAuditStatement: update([text, text], Result(text, text), (userId, URL) => {
    if (!userId || !URL) {
      return Result.Err('Bad payload');
    }

    const user = userStorage.get(Principal.fromText(userId));
    if ("None" in user) {
      return Result.Err('User not found');
    }
    const userData: typeof User = user.Some;
    if (userData.role !== Role.Auditor) {
      return Result.Err('Fail to upload audit statement');
    }

    const auditor = auditorStorage.get(Principal.fromText(userData.relatedId));
    if ("None" in auditor) {
      return Result.Err('Error');
    }
    const auditorData: typeof Division = auditor.Some;
    
    const newAuditStatement: typeof AuditStatement = {
      id: Principal.fromText(uuidv4()),
      companyId: auditorData.companyId,
      URL,
      uploadedBy: auditorData.id.toText(),
      uploadedAt: ic.time(),
    }

    auditStatementStorage.insert(newAuditStatement.id, newAuditStatement);
    return Result.Ok('Successfully uploaded audit statement');
  }),
});