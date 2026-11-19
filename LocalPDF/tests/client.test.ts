import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { workerTask } from '../src/pdf/client.ts';

function workers(t: TestContext, failSend = false) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  const instances: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessageerror: (() => void) | null = null;
    terminated = false;
    sent = false;
    constructor() { instances.push(this); }
    postMessage() { if (failSend) throw new DOMException('Cannot transfer', 'DataCloneError'); this.sent = true; }
    terminate() { this.terminated = true; }
    emit(data: unknown) { this.onmessage?.(new MessageEvent('message', { data })); }
  }
  Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value: FakeWorker });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else Reflect.deleteProperty(globalThis, 'Worker'); });
  return instances;
}

test('worker progress is separate from completion; completion releases owned worker', async t => {
  const instances = workers(t), values: number[] = [];
  const promise = workerTask<{pages:number}>({inspect:[]}, new AbortController().signal, n=>values.push(n));
  instances[0].emit({progress:50});
  assert.equal(instances[0].terminated,false);
  instances[0].emit({info:{pages:3}});
  assert.deepEqual(await promise,{pages:3});
  assert.deepEqual(values,[50]);assert.equal(instances[0].terminated,true);
});
test('cancellation stops the owned worker and rejects without a success result', async t => {
  const instances=workers(t), abort=new AbortController();
  const promise=workerTask({inspect:[]},abort.signal);
  abort.abort();
  await assert.rejects(promise,{code:'CANCELLED'});
  assert.equal(instances[0].terminated,true);
});
test('already cancelled work never creates a worker', async t => {
  const instances=workers(t), abort=new AbortController();abort.abort();
  await assert.rejects(workerTask({inspect:[]},abort.signal),{code:'CANCELLED'});
  assert.equal(instances.length,0);
});
test('synchronous transfer failures release the worker immediately', async t => {
  const instances=workers(t,true);
  await assert.rejects(workerTask({inspect:[]},new AbortController().signal),{code:'WORKER'});
  assert.equal(instances[0].terminated,true);
});
test('worker parser errors are returned without a false successful result', async t => {
  const instances=workers(t);
  const promise=workerTask({inspect:[]},new AbortController().signal);
  instances[0].emit({error:'ENCRYPTED'});
  await assert.rejects(promise,{code:'ENCRYPTED'});assert.equal(instances[0].terminated,true);
});
test('timeout terminates the worker instead of leaving it running', async t => {
  const instances=workers(t);
  t.mock.timers.enable({apis:['setTimeout']});
  const promise=workerTask({inspect:[]},new AbortController().signal);
  t.mock.timers.tick(120001);
  await assert.rejects(promise,{code:'TIMEOUT'});assert.equal(instances[0].terminated,true);
});
