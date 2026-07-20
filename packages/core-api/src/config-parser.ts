export type ProtocolType = 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'hysteria2' | 'tuic';

export interface ParsedServer {
  id: string;
  name: string;
  protocol: ProtocolType;
  server: string;
  port: number;
  raw: Record<string, unknown>;
  originalUri?: string;
}

const generateServerId = (protocol: string, server: string, port: number, raw: Record<string, unknown>): string => {
  const str = JSON.stringify(raw);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
  return `${protocol}-${server}-${port}-${Math.abs(hash).toString(36)}`;
};

export interface ImportResult {
  servers: ParsedServer[];
  errors: string[];
  source: 'uri' | 'subscription' | 'json' | 'batch' | 'base64' | 'unknown';
}

export interface BuildConfigOptions {
  logLevel?: 'info' | 'debug' | 'warn';
  enableTun?: boolean;
  mtu?: number;
}

type UriParts = {
  userinfo: string;
  host: string;
  port: number;
  query: Record<string, string>;
  fragment: string;
};

const URI_SCHEMES = ['vless://', 'vmess://', 'trojan://', 'ss://', 'hysteria2://', 'hy2://', 'tuic://'];
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parsePort = (value: string): number | null => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
};

const parseQuery = (query: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    const key = safeDecodeURIComponent(separator === -1 ? pair : pair.slice(0, separator));
    const value = safeDecodeURIComponent(separator === -1 ? '' : pair.slice(separator + 1));
    result[key] = value;
  }
  return result;
};

/** Splits a proxy URI authority while keeping bracketed IPv6 hosts intact. */
const splitUri = (input: string): UriParts | null => {
  const schemeSeparator = input.indexOf('://');
  if (schemeSeparator === -1) return null;
  let remainder = input.slice(schemeSeparator + 3);
  let fragment = '';
  const hashIndex = remainder.indexOf('#');
  if (hashIndex !== -1) {
    fragment = safeDecodeURIComponent(remainder.slice(hashIndex + 1));
    remainder = remainder.slice(0, hashIndex);
  }
  let query: Record<string, string> = {};
  const queryIndex = remainder.indexOf('?');
  if (queryIndex !== -1) {
    query = parseQuery(remainder.slice(queryIndex + 1));
    remainder = remainder.slice(0, queryIndex);
  }

  const atIndex = remainder.lastIndexOf('@');
  if (atIndex === -1) return null;
  const userinfo = safeDecodeURIComponent(remainder.slice(0, atIndex));
  const hostPort = remainder.slice(atIndex + 1);
  let host = '';
  let portText = '';
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end === -1 || hostPort[end + 1] !== ':') return null;
    host = hostPort.slice(1, end);
    portText = hostPort.slice(end + 2);
  } else {
    const colon = hostPort.lastIndexOf(':');
    if (colon === -1) return null;
    host = hostPort.slice(0, colon);
    portText = hostPort.slice(colon + 1);
  }
  const port = parsePort(portText);
  return userinfo && host && port !== null ? { userinfo, host, port, query, fragment } : null;
};

const decodeBase64 = (input: string): string | null => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  if (!normalized || /[^A-Za-z0-9+/=]/.test(normalized)) return null;
  const withoutPadding = normalized.replace(/=+$/, '');
  if (withoutPadding.length % 4 === 1) return null;
  const padded = withoutPadding + '='.repeat((4 - (withoutPadding.length % 4)) % 4);
  let bits = 0;
  let bitCount = 0;
  let output = '';
  for (const char of padded) {
    if (char === '=') break;
    const value = BASE64_ALPHABET.indexOf(char);
    if (value === -1) return null;
    bits = (bits << 6) | value;
    bitCount += 6;
    while (bitCount >= 8) {
      bitCount -= 8;
      output += String.fromCharCode((bits >> bitCount) & 0xff);
    }
  }
  try {
    const bytes = Array.from(output, (character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
    return decodeURIComponent(bytes);
  } catch {
    return output;
  }
};

const utf8Bytes = (input: string): number[] => {
  const bytes: number[] = [];
  for (const character of input) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint <= 0xffff) bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    else bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
  }
  return bytes;
};

const encodeBase64 = (input: string): string => {
  const bytes = utf8Bytes(input);
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const value = (a << 16) | (b << 8) | c;
    output += BASE64_ALPHABET[(value >> 18) & 63];
    output += BASE64_ALPHABET[(value >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(value >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? BASE64_ALPHABET[value & 63] : '=';
  }
  return output;
};

const looksLikeBase64 = (value: string): boolean =>
  value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/=_-]+$/.test(value);

const nameFor = (protocol: ProtocolType, host: string, fragment: string): string => fragment || `${protocol}-${host}`;

const serverFromParts = (
  protocol: ProtocolType,
  parts: UriParts,
  raw: Record<string, unknown>,
  originalUri: string,
): ParsedServer => ({
  id: generateServerId(protocol, parts.host, parts.port, raw),
  name: nameFor(protocol, parts.host, parts.fragment),
  protocol,
  server: parts.host,
  port: parts.port,
  raw,
  originalUri,
});

const parseVmess = (uri: string): ParsedServer | null => {
  const payload = uri.slice('vmess://'.length);
  const decoded = decodeBase64(payload);
  if (decoded) {
    try {
      const value: unknown = JSON.parse(decoded);
      if (isRecord(value) && typeof value.add === 'string' && typeof value.id === 'string') {
        const port = parsePort(String(value.port ?? ''));
        if (port !== null) {
          return {
            id: generateServerId('vmess', value.add, port, {
              uuid: value.id,
              alter_id: value.aid,
              network: value.net,
              type: value.type,
              host: value.host,
              path: value.path,
              security: value.tls,
              sni: value.sni,
            }),
            name: typeof value.ps === 'string' && value.ps ? value.ps : nameFor('vmess', value.add, ''),
            protocol: 'vmess',
            server: value.add,
            port,
            raw: {
              uuid: value.id,
              alter_id: value.aid,
              network: value.net,
              type: value.type,
              host: value.host,
              path: value.path,
              security: value.tls,
              sni: value.sni,
            },
            originalUri: uri,
          };
        }
      }
    } catch {
      // Plaintext VMess is attempted below.
    }
  }
  const parts = splitUri(uri);
  return parts ? serverFromParts('vmess', parts, { uuid: parts.userinfo, ...parts.query }, uri) : null;
};

const parseShadowsocks = (uri: string): ParsedServer | null => {
  const payload = uri.slice('ss://'.length);
  const hashIndex = payload.indexOf('#');
  const withoutFragment = hashIndex === -1 ? payload : payload.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : safeDecodeURIComponent(payload.slice(hashIndex + 1));
  const direct = splitUri(uri);
  if (direct) {
    const credentials = decodeBase64(direct.userinfo) ?? direct.userinfo;
    const separator = credentials.indexOf(':');
    if (separator > 0) {
      return serverFromParts('shadowsocks', direct, {
        method: credentials.slice(0, separator),
        password: credentials.slice(separator + 1),
        ...direct.query,
      }, uri);
    }
  }
  const decoded = decodeBase64(withoutFragment);
  if (!decoded) return null;
  return parseShadowsocks(`ss://${decoded}${fragment ? `#${encodeURIComponent(fragment)}` : ''}`);
};

export const parseUri = (uri: string): ParsedServer | null => {
  const input = uri.trim();
  const scheme = input.slice(0, input.indexOf('://')).toLowerCase();
  if (!URI_SCHEMES.includes(`${scheme}://`)) return null;
  if (scheme === 'vmess') return parseVmess(input);
  if (scheme === 'ss') return parseShadowsocks(input);
  const parts = splitUri(input);
  if (!parts) return null;
  switch (scheme) {
    case 'vless':
      return serverFromParts('vless', parts, { uuid: parts.userinfo, ...parts.query }, input);
    case 'trojan':
      return serverFromParts('trojan', parts, { password: parts.userinfo, ...parts.query }, input);
    case 'hysteria2':
    case 'hy2':
      return serverFromParts('hysteria2', parts, { password: parts.userinfo, ...parts.query }, input);
    case 'tuic': {
      const separator = parts.userinfo.indexOf(':');
      if (separator === -1) return null;
      return serverFromParts('tuic', parts, {
        uuid: parts.userinfo.slice(0, separator),
        password: parts.userinfo.slice(separator + 1),
        ...parts.query,
      }, input);
    }
    default:
      return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractJsonServers = (value: unknown): ImportResult => {
  if (!isRecord(value) || !Array.isArray(value.outbounds)) {
    return { servers: [], errors: ['JSON does not contain an outbounds array.'], source: 'unknown' };
  }
  const servers: ParsedServer[] = [];
  const errors: string[] = [];
  for (const outbound of value.outbounds) {
    if (!isRecord(outbound) || typeof outbound.type !== 'string') continue;
    if (['direct', 'block', 'dns'].includes(outbound.type)) continue;
    const protocol = outbound.type === 'ss' ? 'shadowsocks' : outbound.type;
    if (!['vless', 'vmess', 'trojan', 'shadowsocks', 'hysteria2', 'tuic'].includes(protocol)) {
      errors.push(`Unsupported outbound type: ${outbound.type}`);
      continue;
    }
    const server = typeof outbound.server === 'string' ? outbound.server : '';
    const port = typeof outbound.server_port === 'number' ? outbound.server_port : NaN;
    if (!server || !Number.isInteger(port) || port <= 0) {
      errors.push(`Outbound ${typeof outbound.tag === 'string' ? outbound.tag : outbound.type} is missing server or server_port.`);
      continue;
    }
    const raw = { ...outbound };
    servers.push({
      id: generateServerId(protocol, server, port, raw),
      name: typeof outbound.tag === 'string' && outbound.tag ? outbound.tag : `${protocol}-${server}`,
      protocol: protocol as ProtocolType,
      server,
      port,
      raw,
    });
  }
  return { servers, errors, source: 'json' };
};

const unknownResult = (): ImportResult => ({
  servers: [],
  errors: ['Unrecognized format. Paste a URI, subscription URL, or sing-box JSON.'],
  source: 'unknown',
});

const detect = async (input: string, fetchImpl: typeof fetch, depth: number): Promise<ImportResult> => {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  if (!/\r?\n/.test(trimmed) && URI_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    const server = parseUri(trimmed);
    return server
      ? { servers: [server], errors: [], source: 'uri' }
      : { servers: [], errors: ['Unable to parse proxy URI.'], source: 'uri' };
  }
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const response = await fetchImpl(trimmed);
      if (!response.ok) return { servers: [], errors: [`Subscription request failed (${response.status}).`], source: 'subscription' };
      const nested = await detect(await response.text(), fetchImpl, depth + 1);
      return { ...nested, source: 'subscription' };
    } catch (error) {
      return {
        servers: [],
        errors: [`Subscription request failed: ${error instanceof Error ? error.message : String(error)}`],
        source: 'subscription',
      };
    }
  }
  if (/\r?\n/.test(trimmed)) {
    const servers: ParsedServer[] = [];
    const errors: string[] = [];
    for (const line of trimmed.split(/\r?\n/)) {
      const value = line.trim();
      if (!value) continue;
      const server = parseUri(value);
      if (server) servers.push(server);
      else errors.push(`Unable to parse URI: ${value.slice(0, 80)}`);
    }
    return { servers, errors, source: 'batch' };
  }
  try {
    const jsonResult = extractJsonServers(JSON.parse(trimmed) as unknown);
    if (jsonResult.source === 'json') return jsonResult;
  } catch {
    // Continue to base64 detection.
  }
  if (depth < 2 && looksLikeBase64(trimmed)) {
    const decoded = decodeBase64(trimmed);
    if (decoded !== null) {
      const nested = await detect(decoded, fetchImpl, depth + 1);
      return { ...nested, source: 'base64' };
    }
  }
  return unknownResult();
};

export const detectAndImport = async (input: string, fetchImpl: typeof fetch = fetch): Promise<ImportResult> =>
  detect(input, fetchImpl, 0);

const stringValue = (raw: Record<string, unknown>, key: string): string | undefined => {
  const value = raw[key];
  return typeof value === 'string' && value ? value : undefined;
};

const transportFor = (raw: Record<string, unknown>): Record<string, unknown> | undefined => {
  const type = stringValue(raw, 'type');
  if (!type || !['ws', 'grpc', 'httpupgrade'].includes(type)) return undefined;
  if (type === 'grpc') return { type, service_name: stringValue(raw, 'serviceName') ?? '' };
  const transport: Record<string, unknown> = { type, path: stringValue(raw, 'path') ?? '/' };
  const host = stringValue(raw, 'host');
  if (host) transport.headers = { Host: host };
  return transport;
};

const tlsFor = (server: ParsedServer, reality: boolean): Record<string, unknown> => {
  const raw = server.raw;
  const fingerprint = stringValue(raw, 'fp');
  const tls: Record<string, unknown> = {
    enabled: true,
    server_name: stringValue(raw, 'sni') ?? server.server,
  };
  if (fingerprint) tls.utls = { enabled: true, fingerprint };
  if (reality) {
    tls.reality = {
      enabled: true,
      public_key: stringValue(raw, 'pbk') ?? '',
      short_id: stringValue(raw, 'sid') ?? '',
    };
  }
  return tls;
};

export const toSingBoxOutbound = (server: ParsedServer): Record<string, unknown> => {
  const raw = server.raw;
  const base: Record<string, unknown> = { tag: 'proxy', server: server.server, server_port: server.port };
  let outbound: Record<string, unknown>;
  switch (server.protocol) {
    case 'vless': {
      const reality = stringValue(raw, 'security') === 'reality';
      outbound = { type: 'vless', ...base, uuid: stringValue(raw, 'uuid') ?? '' };
      const flow = stringValue(raw, 'flow');
      if (flow) outbound.flow = flow;
      if (reality || stringValue(raw, 'security') === 'tls') outbound.tls = tlsFor(server, reality);
      break;
    }
    case 'vmess':
      outbound = { type: 'vmess', ...base, uuid: stringValue(raw, 'uuid') ?? '' };
      if (stringValue(raw, 'security') === 'tls') outbound.tls = tlsFor(server, false);
      break;
    case 'trojan':
      outbound = { type: 'trojan', ...base, password: stringValue(raw, 'password') ?? '', tls: tlsFor(server, false) };
      break;
    case 'shadowsocks':
      outbound = {
        type: 'shadowsocks',
        ...base,
        method: stringValue(raw, 'method') ?? '',
        password: stringValue(raw, 'password') ?? '',
      };
      break;
    case 'hysteria2':
      outbound = { type: 'hysteria2', ...base, password: stringValue(raw, 'password') ?? '', tls: tlsFor(server, false) };
      break;
    case 'tuic':
      outbound = {
        type: 'tuic',
        ...base,
        uuid: stringValue(raw, 'uuid') ?? '',
        password: stringValue(raw, 'password') ?? '',
        tls: tlsFor(server, false),
      };
      break;
  }
  const transport = transportFor(raw);
  if (transport) outbound.transport = transport;
  return outbound;
};

export const buildSingBoxConfig = (server: ParsedServer, options: BuildConfigOptions = {}): string => {
  const config: Record<string, unknown> = {
    log: { level: options.logLevel ?? 'info', timestamp: true },
    dns: {
      servers: [
        { tag: 'google', address: 'tls://8.8.8.8', detour: 'proxy' },
        { tag: 'local', address: 'local', detour: 'direct' },
      ],
      rules: [
        { outbound: 'direct', server: 'local' },
      ],
    },
    inbounds: options.enableTun === false ? [] : [{
      type: 'tun',
      tag: 'tun-in',
      interface_name: 'tun0',
      inet4_address: '172.19.0.1/28',
      mtu: options.mtu ?? 9000,
      auto_route: true,
      strict_route: true,
      stack: 'system',
      sniff: true,
      endpoint_independent_nat: true,
    }],
    outbounds: [
      toSingBoxOutbound(server),
      { type: 'direct', tag: 'direct' },
      { type: 'block', tag: 'block' },
      { type: 'dns', tag: 'dns-out' },
    ],
    route: {
      auto_detect_interface: false,
      final: 'proxy',
      rules: [
        { protocol: 'dns', outbound: 'dns-out' },
      ],
    },
  };
  return JSON.stringify(config, null, 2);
};
