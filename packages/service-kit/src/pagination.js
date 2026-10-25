// Helpers for server-side pagination, safe regex search and whitelisted sorting.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildSort(sort, allowed, fallback = '-createdAt') {
  const value = sort && allowed.includes(sort.replace(/^-/, '')) ? sort : fallback;
  return { [value.replace(/^-/, '')]: value.startsWith('-') ? -1 : 1, _id: -1 };
}

async function paginate(Model, filter, { page, limit, sort }) {
  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Model.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = { escapeRegex, buildSort, paginate };
