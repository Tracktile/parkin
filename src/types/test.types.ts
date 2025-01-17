import type { Types } from '../test/utils'
import { TPromiseRetryCB } from './promise.types'
import type { ParkinError } from '../utils/errors'
import type { EAstObject, EStepType } from './helpers.types'

export enum EResultAction {
  test=`test`,
  skipped=`skipped`,
  start=`start`,
  end=`end`,
  abort=`abort`
}

export enum EResultStatus {
  skipped=`skipped`,
  passed=`passed`,
  failed=`failed`,
  warning=`warning`,
}

export enum EResultType {
  it=`it`,
  xit=`xit`,
  root=`root`,
  test=`test`,
  xtest=`xtest`,
  describe=`describe`,
  xdescribe=`xdescribe`
}

export enum ETestType {
  it = `it`,
  itx = `itx`,
  test = `test`,
  testx = `testx`,
  describe = `describe`,
  describex = `describex`,
  beforeAll = `beforeAll`,
  afterAll = `afterAll`,
  beforeEach = `beforeEach`,
  afterEach = `afterEach`,
}

export type TParkinResultMeta = {
  uuid:string
  index:number
  type:EStepType
}

export type TRunResultStepMeta = TParkinResultMeta & {
  step:string
  definition?:string
  warnOnFailed?:boolean
}

export type TRunResultScenarioMeta = TParkinResultMeta & {
  tags?:string[]
  scenario:string
  warnOnFailed?:never
}

export type TRunResultBackgroundMeta = TParkinResultMeta & {
  tags?:string[]
  background:string
  warnOnFailed?:never
}

export type TRunResultRuleMeta = TParkinResultMeta & {
  tags?:string[]
  rule:string
  warnOnFailed?:never
}

export type TRunResultFeatureMeta = TParkinResultMeta & {
  tags?:string[]
  feature:string
  errors?:string[]
  warnOnFailed?:never
}

export type TRunMeta = {
  warnOnFailed?:boolean
  [K:string]: any
}
export type TRunGeneralMeta<T extends Record<string, any>> = T

export type TRunResultActionMeta<T extends Record<string, any>=any> = TRunResultFeatureMeta
  | TRunResultRuleMeta
  | TRunResultBackgroundMeta
  | TRunResultScenarioMeta
  | TRunResultStepMeta
  | TRunGeneralMeta<T>
  | TRunMeta

export type TFailedErrorResult = Partial<TRunResult> & {
  error: Error|ParkinError
}

export type TRunResultTestMeta = Omit<Partial<TRunResult>, `passed`|`failed`> & {
  failed?:TFailedErrorResult
  passed?:Partial<TRunResult>|boolean
}

export type TRunResult = {
  id:string
  testPath:string
  fullName:string
  failed?:boolean
  passed?:boolean
  skipped?:boolean
  timestamp:number
  children?:TSpec[]
  stats: TTestStats
  tests?:TRunResult[]
  description: string
  action:EResultAction
  status?:EResultStatus
  describes?:TRunResult[]
  metaData?:TRunResultActionMeta
  type:keyof typeof Types | EAstObject,
  failedExpectations?:Partial<TRunResult>[]
  passedExpectations?:Partial<TRunResult>[]
}

export type TSpecResult = TRunResult & {
  status?:EResultStatus
}

export type TSpec = {
  result: TSpecResult
  disable: () => void
}

export type TSuite = {
  description: string
  children: TSpec[]
}

export type TParkinTestAbort = () => Promise<any>|any
export type TParkinTestCB = (result:TRunResult) => Promise<any>|any

export type TDescribeAction = (() => void) & {
  metaData?:TRunResultActionMeta
  ParkinMetaData?:TRunResultActionMeta
}

export type TTestAction = ((done?:()=> void) => any) & {
  metaData?:TRunResultActionMeta
  ParkinMetaData?:TRunResultActionMeta
}

export type TTestHookMethod = ((fn:(...args:any[]) => any, ...args:any[]) => any) & {
  metaData?:TRunResultActionMeta
  ParkinMetaData?:TRunResultActionMeta
}

type TDescribeFactory = (description:string, action:TDescribeAction) => void
export type TParkinDescribeFactory = TDescribeFactory & {
  skip:TDescribeFactory
  only:TDescribeFactory
}

type TTestFactory = (description:string, action:TTestAction, timeout?:number) => void
export type TParkinTestFactory = TTestFactory & {
  skip:TTestFactory
  only:TTestFactory
}


export type TParkinTestConfig = {
  bail?:number
  timeout?:number
  testRetry?:number
  suiteRetry?:number
  autoClean?:boolean
  description?:string
  testTimeout?:number
  suiteTimeout?:number
  exitOnFailed?:boolean
  skipAfterFailed?:boolean
  onAbort?:TParkinTestAbort
  onRunDone?:TParkinTestCB
  onSpecDone?:TParkinTestCB
  onRunStart?:TParkinTestCB
  onSuiteDone?:TParkinTestCB
  onSpecStart?:TParkinTestCB
  onSuiteStart?:TParkinTestCB
  onTestRetry?:TPromiseRetryCB<TRunResult>
  onSuiteRetry?:TPromiseRetryCB<TRunResults>
}

// TODO: fix these types
export type TBaseTestObj = {
  only?:boolean
  skip?: boolean
  timeout?:number
  description:string
  onlyChild?: boolean
  disabled: () => void
  hasOnlyChild: () => void
  // type:keyof typeof Types,
}

export type TTestTestObj = TBaseTestObj & {
  retry?:number
  action:TTestAction
  type: `test` | `it` | `xtest` | `xit`
}

export type THookTestObj = {
  type: `beforeAll` | `beforeEach` | `afterAll` | `afterEach`
  description?:string
  action:TTestHookMethod
}

export type TDescribeTestObj = TBaseTestObj & {
  type: `describe`
  childError?:Error
  tests?:TTestTestObj[]
  action:TDescribeAction
  describes?:TDescribeTestObj[]
  afterAll?:TTestHookMethod[]
  beforeAll?:TTestHookMethod[]
  afterEach?:TTestHookMethod[]
  beforeEach?:TTestHookMethod[]
}

export type TRootTestObj = TBaseTestObj & {
  type: `root`
  childError?:Error
  tests?:TTestTestObj[]
  action:TDescribeAction
  describes?:TDescribeTestObj[]
  afterAll?:TTestHookMethod[]
  beforeAll?:TTestHookMethod[]
  afterEach?:TTestHookMethod[]
  beforeEach?:TTestHookMethod[]
}

export type TParentTestObj = TRootTestObj | TDescribeTestObj

export type TNonRootTestObj = TDescribeTestObj | TTestTestObj

export type TTestObj = TRootTestObj
  | TNonRootTestObj
  | THookTestObj



export type THookTypes = {
  beforeAll:`beforeAll`
  beforeEach:`beforeEach`
  afterAll:`afterAll`
  afterEach:`afterEach`
}

export type TGlobalTypes = THookTypes & {
  test:`test`
  it:`it`
  xtest:`xtest`
  xit:`xit`
  describe:`describe`
}

export type TType = TGlobalTypes & {
  root: `root`
}


export type TRunResults = (TRunResult[] & TTestStats & {
  aborted?:boolean
  bailed?:boolean
})

export type TTestStats = {
  runEnd?:number
  runStart?:number
  passedSpecs?:number
  failedSpecs?:number
  failedSuites?:number
  passedSuites?:number
}

export type TLoopTests = {
  bail:number
  suiteId:string
  testOnly:boolean
  testRetry?:number
  exitOnFailed?:boolean
  skipAfterFailed?:boolean
  stats: TTestStats
  onSpecDone:TParkinTestCB
  shouldAbort:() => boolean
  onSpecStart:TParkinTestCB
  describe:TDescribeTestObj
  onTestRetry?:TPromiseRetryCB<TRunResult>
}

export type TRun = {
  bail?:number
  stats: TTestStats
  testOnly:boolean
  testRetry?:number
  describeOnly:boolean
  exitOnFailed?:boolean
  skipAfterFailed?:boolean
  onSpecDone:TParkinTestCB
  onRunDone:TParkinTestCB
  onSuiteDone:TParkinTestCB
  onAbort:TParkinTestAbort
  parentIdx?:string|number
  shouldAbort:() => boolean
  onSpecStart:TParkinTestCB
  onRunStart:TParkinTestCB
  onSuiteStart:TParkinTestCB
  root:TRootTestObj|TDescribeTestObj
  onTestRetry?:TPromiseRetryCB<TRunResult>
}
