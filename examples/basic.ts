import { axioguard, Axioguard, MemoryCacheAdapter } from 'axioguard';

async function run() {
  const shared = await axioguard.get('https://jsonplaceholder.typicode.com/todos/1', {
    cache: true,
    cacheTTL: 30_000,
  });
  console.log('Shared instance title:', shared.data.title);

  const custom = new Axioguard({
    baseURL: 'https://jsonplaceholder.typicode.com',
    cache: {
      enabled: true,
      adapter: new MemoryCacheAdapter(),
      defaultTTL: 10_000,
    },
    deduplicate: true,
  });

  const [a, b] = await Promise.all([
    custom.get('/posts/1', { cache: true, deduplicate: true }),
    custom.get('/posts/1', { cache: true, deduplicate: true }),
  ]);

  console.log('Custom instance titles:', a.data.title, b.data.title);
}

run().catch((error) => {
  console.error('Example failed', error);
});
