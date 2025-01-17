import type {
  TRunResult,
  TRunResults,
  TTestAction,
  TTestTestObj,
  TParkinTestCB,
  TParentTestObj,
  TTestHookMethod,
  TPromiseRetryCB,
  TDescribeAction,
  TParkinTestAbort,
  TParkinTestConfig,
  TParkinTestFactory,
  TRunResultActionMeta,
  TParkinDescribeFactory,
} from '../types'

import { run } from './run'
import { runResult } from './runResult'
import { PromiseRetry } from '../utils/promiseRetry'
import { PromiseTimeout } from '../utils/promiseTimeout'
import { noOp, noOpObj, isStr, checkCall, isNum, isObj, exists } from '@keg-hub/jsutils'
import {
  Types,
  createRoot,
  createItem,
  createDescribe,
  throwError,
  hookTypes,
  validateHook,
} from './utils'

type TTestSkipFactory = (description:string, action?:TTestAction, timeout?:number) => void

export class ParkinTest {
  // Defaults set to 0, is the same as disabled
  bail = 0
  testRetry = 0
  suiteRetry = 0
  #onTestRetry:TPromiseRetryCB<TRunResult>
  #onSuiteRetry:TPromiseRetryCB<TRunResults>

  // Default test timeout to be 5 seconds
  testTimeout = 5000
  // Default suite test timeout is 1hr
  suiteTimeout = 3600000
  #autoClean = true
  #testOnly = false
  #abortRun = false
  #describeOnly = false
  #exitOnFailed = false
  #skipAfterFailed = false
  #root = createRoot()
  xit:TTestSkipFactory
  it:TParkinTestFactory
  #onRunDone:TParkinTestCB = noOp
  #onRunStart:TParkinTestCB = noOp
  #onSpecDone:TParkinTestCB = noOp
  #onSuiteDone:TParkinTestCB = noOp
  #onSpecStart:TParkinTestCB = noOp
  #onSuiteStart:TParkinTestCB = noOp
  #onAbort:TParkinTestAbort = noOp
  afterAll:TTestHookMethod = noOp
  afterEach:TTestHookMethod = noOp
  beforeAll:TTestHookMethod = noOp
  beforeEach:TTestHookMethod = noOp
  #activeParent:TParentTestObj = undefined

  constructor(config:TParkinTestConfig = noOpObj) {
    this.#root.description = config.description || `root`

    this.#addOnly()
    this.#addSkip()
    this.#addHelpers()
    this.it = this.test
    this.xit = this.xtest
    this.#activeParent = this.#root
    this.setConfig(config)
  }

  run = (config:TParkinTestConfig = noOpObj) => {

    if (config.description) this.#root.description = config.description

    this.setConfig(config)
    const runSuite = async () => {
      const promise = run({
        bail: this.bail,
        root: this.#root,
        onAbort: this.#onAbort,
        testOnly: this.#testOnly,
        testRetry: this.testRetry,
        onRunDone: this.#onRunDone,
        onRunStart: this.#onRunStart,
        onSpecDone: this.#onSpecDone,
        onSpecStart: this.#onSpecStart,
        onTestRetry: this.#onTestRetry,
        shouldAbort: this.#shouldAbort,
        onSuiteDone: this.#onSuiteDone,
        onSuiteStart: this.#onSuiteStart,
        exitOnFailed: this.#exitOnFailed,
        describeOnly: this.#describeOnly,
        skipAfterFailed: this.#skipAfterFailed,
        stats: {
          runEnd: 0,
          failedSpecs: 0,
          passedSpecs: 0,
          passedSuites: 0,
          failedSuites: 0,
          runStart: new Date().getTime(),
        },
      })

      const result = this.suiteTimeout
        ? PromiseTimeout<TRunResults>({
            promise,
            timeout: this.suiteTimeout,
            name: this.#root.description,
            error: `Test Execution failed, the suite timeout ${this.suiteTimeout}ms was exceeded`
          })
        : promise

      this.#autoClean && this.clean()

      return result
    }

    return PromiseRetry({
      promise: runSuite,
      retry: this.suiteRetry,
      onRetry: this.#onSuiteRetry
    })
  }

  /**
   * Expose the helper method to build a test result
   * Helpful in cases where ParkinTest is wrapped by another tool
   * Allows for a consistent iterface of events
   */
  buildResult = runResult

  #shouldAbort = () => this.#abortRun

  abort = () => {
    this.#abortRun = true
  }

  /**
   * Resets the instance to it's initial state
   * Clears all previously loaded tests and describes
   */
  clean = () => {
    this.testTimeout = 5000
    this.suiteTimeout = 3600000
    this.#autoClean = true
    this.#abortRun = false
    this.#testOnly = false
    this.#describeOnly = false

    this.#activeParent = undefined
    this.#root = undefined
    this.#root = createRoot()
    this.#activeParent = this.#root
  }

  /**
   * Gets the current activeParent, which should almost always be this.#root
   */
  getActiveParent = () => {
    return this.#activeParent
  }

  /**
   * Adds passed in framework hooks to the class instance
   */
  setConfig = ({
    bail,
    timeout,
    testRetry,
    suiteRetry,
    testTimeout,
    suiteTimeout,
    onTestRetry,
    onSuiteRetry,
    exitOnFailed,
    skipAfterFailed,
    onAbort,
    autoClean,
    onSpecDone,
    onSuiteDone,
    onRunDone,
    onRunStart,
    onSpecStart,
    onSuiteStart,
  }:TParkinTestConfig=noOpObj) => {

    if(onAbort) this.#onAbort = onAbort
    
    if(isNum(testTimeout)) this.testTimeout = testTimeout
    else if(isNum(timeout)) this.testTimeout = timeout

    if(isNum(suiteTimeout)) this.suiteTimeout = suiteTimeout
    else if(isNum(timeout)) this.suiteTimeout = timeout

    if (isNum(bail)) this.bail = bail
    if (isNum(testRetry)) this.testRetry = testRetry
    if (isNum(suiteRetry)) this.suiteRetry = suiteRetry

    if (onTestRetry) this.#onTestRetry = onTestRetry
    if (onSuiteRetry) this.#onSuiteRetry = onSuiteRetry

    if (onSpecDone) this.#onSpecDone = onSpecDone
    if (onSpecStart) this.#onSpecStart = onSpecStart

    if (onSuiteDone) this.#onSuiteDone = onSuiteDone
    if (onSuiteStart) this.#onSuiteStart = onSuiteStart

    if (onRunDone) this.#onRunDone = onRunDone
    if (onRunStart) this.#onRunStart = onRunStart

    if (autoClean === false) this.#autoClean = autoClean

    if(exitOnFailed) this.#exitOnFailed = exitOnFailed
    if(skipAfterFailed) this.#skipAfterFailed = skipAfterFailed
  }

  /**
   * Adds the only method to describe and test methods
   * Ensures they are the only methods called when run
   */
  #addOnly = () => {

    this.describe.only = (...args:[string, TDescribeAction]) => {
      this.describe(...args)
      // Get the last item just added to the this.#activeParent
      const item =
        this.#activeParent.describes[this.#activeParent.describes.length - 1]
      item.only = true
      this.#describeOnly = true
      // Call the parent hasOnlyChild method to ensure it gets passed on the chain
      checkCall(this.#activeParent.hasOnlyChild)
    }

    this.test.only = (...args:[description:string, action?:TTestAction, meta?:TRunResultActionMeta|number]) => {
      this.test(...args)
      // Get the last item just added to the this.#activeParent
      const item = this.#activeParent.tests[this.#activeParent.tests.length - 1]
      item.only = true
      this.#testOnly = true
      // Call the parent hasOnlyChild method to ensure it gets passed on the chain
      checkCall(this.#activeParent.hasOnlyChild)
    }
  }

  /**
   * Adds the skip method to describe and test methods
   * Ensures they are skipped run method is called
   */
  #addSkip = () => {

    this.describe.skip = (...args:[string, TDescribeAction]) => {
      this.describe(...args)
      // Get the last item just added to the this.#activeParent
      const item =
        this.#activeParent.describes[this.#activeParent.describes.length - 1]
      item.skip = true
    }

    this.test.skip = (...args:[description:string, action?:TTestAction, meta?:TRunResultActionMeta|number]) => {
      this.test(...args)
      // Get the last item just added to the this.#activeParent
      const item = this.#activeParent.tests[this.#activeParent.tests.length - 1]
      item.skip = true
    }
  }

  /**
   * TODO: @lance-Tipton
   * Add each methods to describe and test
   */
  #addEach = () => {}

  /**
   * Adds the helper methods to the class instance
   * Methods: beforeAll, beforeEach, afterAll, afterEach
   */
  #addHelpers = () => {
    Object.values(hookTypes).map(type => {
      this[type] = (action) => {
        validateHook(type, action)
        this.#activeParent[type].push(action)
      }
    })
  }

  /**
   * Method the wraps test and helper methods
   * Acts as a top level method for defining tests
   *
   * @returns {void}
   */
  describe = ((
    description:string,
    action:TDescribeAction
  ) => {

    // Build the describe item and add defaults
    const item = createDescribe(description, action)
    this.#activeParent.describes.push(item)

    // Cache the lastParent, so we can reset it
    const lastParent = this.#activeParent

    item.hasOnlyChild = () => {
      item.onlyChild = true
      checkCall(lastParent.hasOnlyChild)
    }

    // Set the current activeParent to the item
    this.#activeParent = item

    // Call the action to register all test method calls while the items active
    action()

    // Reset the last activeParent
    // Should end up with the #root being the final activeParent
    this.#activeParent = lastParent
  }) as TParkinDescribeFactory

  /**
   * Method that executes some test logic
   * Must be called within a Test#describe method
   *
   * @returns {void}
   */
  test = ((
    description:string,
    action:TTestAction,
    meta:TRunResultActionMeta|number
  ) => {

    let retry:number = this.testRetry || 0
    let timeout:number = this.testTimeout

    if(isObj(meta) && !exists(action.metaData) && !exists(action.ParkinMetaData)){
      action.metaData = meta
      if(meta?.timeout) timeout = meta.timeout
      if(meta?.retry) retry = meta.retry
    }
    else if(isNum(meta)) timeout = meta

    if (!this.#activeParent || this.#activeParent.type === Types.root)
      throwError(`All ${Types.test} method calls must be called within a ${Types.describe} method`)

    const item = createItem<TTestTestObj>(
      Types.test,
      {
        retry,
        action,
        timeout,
        description
      }
    )

    item.disabled = () => (item.skip = true)

    this.#activeParent.tests.push(item)
  }) as TParkinTestFactory

  /**
   * Called when a test method should be skipped
   * Must be called within a Test#describe method
   *
   * @returns {void}
   */
  xtest = (
    description:string,
    action?:TTestAction,
    timeout?:number
  ) => {
    if (!this.#activeParent || this.#activeParent.type === Types.root)
      throwError(
        `All ${Types.test} method calls must be called within a ${Types.describe} method`
      )

    !isStr(description) &&
      throwError(
        `The ${Types.test} method requires a "string" as the first argument`
      )
    const item = createItem<TTestTestObj>(Types.test, { description, skip: true }, false)
    item.disabled = () => (item.skip = true)

    this.#activeParent.tests.push(item)
  }

}
