import { detectAndImport, parseUri, type ParsedServer } from './config-parser.ts';

declare const process: { exitCode?: number };
declare const Buffer: { from(value: string, encoding?: string): { toString(encoding: string): string } };

type Test = { name: string; fn: () => void | Promise<void> };
const tests: Test[] = [];
const test = (name: string, fn: Test['fn']): void => { tests.push({ name, fn }); };
const assertTruthy = (value: unknown, message = 'Expected a truthy value'): void => {
  if (!value) throw new Error(message);
};
const assertServer: (value: ParsedServer | null) => asserts value is ParsedServer = (value) => {
  if (value === null) throw new Error('Expected a parsed server');
};
const assertEqual = (actual: unknown, expected: unknown, message?: string): void => {
  if (actual !== expected) throw new Error(message ?? `Expected ${String(expected)}, received ${String(actual)}`);
};

test('parses VLESS Reality fields', () => {
  const server = parseUri('vless://11111111-1111-1111-1111-111111111111@example.com:443?security=reality&sni=cdn.example.com&pbk=public-key&sid=abcd&fp=chrome#Reality');
  assertServer(server);
  assertEqual(server.raw.uuid, '11111111-1111-1111-1111-111111111111');
  assertEqual(server.raw.sni, 'cdn.example.com');
  assertEqual(server.raw.pbk, 'public-key');
  assertEqual(server.raw.sid, 'abcd');
});

test('parses VMess base64 JSON', () => {
  const uri = `vmess://${Buffer.from(JSON.stringify({ v: '2', ps: 'VMess', add: 'vm.example.com', port: '443', id: 'uuid', aid: '0', net: 'ws', tls: 'tls' })).toString('base64')}`;
  const server = parseUri(uri);
  assertServer(server);
  assertEqual(server.protocol, 'vmess');
  assertEqual(server.server, 'vm.example.com');
  assertEqual(server.raw.uuid, 'uuid');
});

test('parses Trojan allowInsecure', () => {
  const server = parseUri('trojan://secret@example.com:443?sni=sni.example.com&allowInsecure=1#Trojan');
  assertServer(server);
  assertEqual(server.raw.password, 'secret');
  assertEqual(server.raw.allowInsecure, '1');
});

test('parses both Shadowsocks URI forms', () => {
  const credentials = Buffer.from('aes-128-gcm:password').toString('base64');
  const compact = Buffer.from('aes-128-gcm:password@ss.example.com:8388').toString('base64');
  const first = parseUri(`ss://${credentials}@ss.example.com:8388#One`);
  const second = parseUri(`ss://${compact}#Two`);
  assertServer(first);
  assertServer(second);
  assertEqual(first.raw.method, 'aes-128-gcm');
  assertEqual(second.server, 'ss.example.com');
  assertEqual(second.raw.password, 'password');
});

test('parses hysteria2 hy2 alias', () => {
  const server = parseUri('hy2://password@hy.example.com:443?sni=hy.example.com&obfs=salamander#HY2');
  assertServer(server);
  assertEqual(server.protocol, 'hysteria2');
  assertEqual(server.raw.password, 'password');
});

test('parses TUIC credentials', () => {
  const server = parseUri('tuic://uuid:password@tuic.example.com:443?sni=tuic.example.com#TUIC');
  assertServer(server);
  assertEqual(server.raw.uuid, 'uuid');
  assertEqual(server.raw.password, 'password');
});

test('imports a raw VLESS URI', async () => {
  const result = await detectAndImport('vless://uuid@example.com:443?security=tls#VLESS');
  assertEqual(result.source, 'uri');
  assertEqual(result.servers.length, 1);
});

test('imports a base64 subscription', async () => {
  const input = Buffer.from('vless://one@example.com:443\ntrojan://password@two.example.com:443').toString('base64');
  const result = await detectAndImport(input);
  assertEqual(result.source, 'base64');
  assertEqual(result.servers.length, 2);
});

test('imports sing-box JSON outbounds', async () => {
  const result = await detectAndImport(JSON.stringify({ outbounds: [{ type: 'vless', tag: 'json', server: 'json.example.com', server_port: 443, uuid: 'uuid' }, { type: 'direct', tag: 'direct' }] }));
  assertEqual(result.source, 'json');
  assertEqual(result.servers.length, 1);
});

test('imports multiline URIs as a batch', async () => {
  const result = await detectAndImport('vless://one@example.com:443\ntrojan://password@two.example.com:443');
  assertEqual(result.source, 'batch');
  assertEqual(result.servers.length, 2);
});

test('reports garbage input', async () => {
  const result = await detectAndImport('this is not a config');
  assertEqual(result.servers.length, 0);
  assertTruthy(result.errors.length > 0);
});

const main = async (): Promise<void> => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures > 0) process.exitCode = 1;
};

void main();
