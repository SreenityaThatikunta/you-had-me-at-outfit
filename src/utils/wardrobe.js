export function groupByCategory(items) {
  return items.reduce((groups, item) => {
    groups[item.category] = groups[item.category] || [];
    groups[item.category].push(item);
    return groups;
  }, {});
}

export function splitTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
