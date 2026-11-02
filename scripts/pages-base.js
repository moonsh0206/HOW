export function pagesBase(value = '/HOW/') {
  if (typeof value !== 'string' || !/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(value) || value.includes('/../') || value.includes('/./')) {
    throw new Error('VITE_BASE_PATH must be / or a slash-delimited repository path such as /HOW/.');
  }
  return value;
}
