import { AiGateway } from './ai.gateway';

function mockConfig(opts: { key?: string; url?: string; model?: string } = {}) {
  return {
    value: {
      AI_API_KEY: opts.key,
      AI_API_BASE_URL: opts.url,
      AI_MODEL: opts.model,
    },
  } as any;
}

describe('AiGateway', () => {
  it('reports unavailable when any of key/url/model is missing', () => {
    expect(new AiGateway(mockConfig()).available).toBe(false);
    expect(new AiGateway(mockConfig({ key: 'k' })).available).toBe(false);
    expect(new AiGateway(mockConfig({ key: 'k', url: 'http://x', model: 'm' })).available).toBe(true);
  });

  it('returns a clearly-labelled mocked result when no provider is configured', async () => {
    const gw = new AiGateway(mockConfig());
    const result = await gw.chat('be helpful', 'summarize this');
    expect(result.mocked).toBe(true);
    expect(result.model).toBe('mock');
    expect(result.content).toContain('MOCK AI');
  });
});
