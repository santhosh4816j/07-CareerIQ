import test from 'node:test';import assert from 'node:assert/strict';import {makeRecord,stats,insight,csv} from '../engine.js';import config from '../config.json' with {type:'json'};
test('creates valid domain record',()=>{const r=makeRecord(config.fields,config.seed[0]);assert.ok(r.id);assert.equal(r[config.fields[0]],config.seed[0][config.fields[0]])});
test('rejects missing fields',()=>assert.throws(()=>makeRecord(config.fields,{}),/required/));
test('calculates stats',()=>assert.equal(stats(config.seed,config.fields).total,config.seed.length));
test('provides domain insight',()=>assert.ok(insight(config.domain,config.seed[0]).label));
test('exports CSV',()=>assert.ok(csv(config.seed,config.fields).includes(config.fields[0])));
